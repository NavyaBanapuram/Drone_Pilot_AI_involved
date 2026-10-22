import { FlightObservation, FlightCoachInsight } from "./flight-coach-types";
import { TrainingScenarioDef, ScenarioSessionState, ObjectiveResult, ObjectiveStatus, ScenarioState } from "./scenario-types";
import { CrashState } from "./types";

export class ScenarioEvaluationEngine {
  private activeScenario: TrainingScenarioDef | null = null;
  private session: ScenarioSessionState | null = null;
  private startPosition: { x: number; y: number; z: number } | null = null;

  public startScenario(scenario: TrainingScenarioDef, initialObs: FlightObservation, startPos: { x: number; y: number; z: number }) {
    this.activeScenario = scenario;
    this.startPosition = startPos;
    
    this.session = {
      scenarioId: scenario.id,
      state: "ACTIVE",
      startTime: Date.now(),
      elapsedTime: 0,
      results: {},
      coachInsights: []
    };

    // Initialize objectives
    scenario.objectives.forEach(obj => {
      this.session!.results[obj.id] = {
        id: obj.id,
        status: "IN_PROGRESS",
        observedValue: "-",
        expectedCondition: obj.description,
        durationSeconds: 0,
        evidence: [],
        explanation: ""
      };
    });
  }

  public getActiveScenario(): TrainingScenarioDef | null {
    return this.activeScenario;
  }

  public getSessionState(): ScenarioSessionState | null {
    return this.session;
  }

  public abortScenario() {
    if (this.session) {
      this.session.state = "ABORTED";
    }
  }

  public evaluate(obs: FlightObservation, pos: { x: number; y: number; z: number }, crashState: CrashState | null, isLanded: boolean) {
    if (!this.activeScenario || !this.session || this.session.state !== "ACTIVE") return;

    this.session.elapsedTime = (Date.now() - this.session.startTime) / 1000;
    let allCompleted = true;

    for (const obj of this.activeScenario.objectives) {
      const res = this.session.results[obj.id];
      if (res.status === "COMPLETED" || res.status === "NOT_MET") continue;

      let meetsCondition = false;
      let evidence: string[] = [];

      switch (obj.type) {
        case "STABILITY": {
          const altOk = obj.condition.altTolerance === undefined || obj.condition.targetAltitude === undefined 
            ? true 
            : Math.abs(obs.altitude - obj.condition.targetAltitude) <= obj.condition.altTolerance;
            
          const tiltOk = obj.condition.maxTiltDeg === undefined
            ? true
            : Math.max(Math.abs(obs.pitch), Math.abs(obs.roll)) <= obj.condition.maxTiltDeg;
            
          const driftOk = obj.condition.maxDriftVelocity === undefined
            ? true
            : obs.horizontalSpeed <= obj.condition.maxDriftVelocity;

          meetsCondition = altOk && tiltOk && driftOk;
          evidence = [
            `Altitude: ${obs.altitude.toFixed(2)} m`,
            `Max Tilt: ${Math.max(Math.abs(obs.pitch), Math.abs(obs.roll)).toFixed(1)}°`,
            `Drift: ${obs.horizontalSpeed.toFixed(2)} m/s`
          ];
          break;
        }
        case "ALTITUDE": {
          meetsCondition = obj.condition.targetAltitude !== undefined &&
            Math.abs(obs.altitude - obj.condition.targetAltitude) <= (obj.condition.altTolerance || 1.0);
          evidence = [`Altitude: ${obs.altitude.toFixed(2)} m`];
          break;
        }
        case "NAVIGATION": {
          if (this.startPosition) {
            const dist = Math.hypot(pos.x - this.startPosition.x, pos.z - this.startPosition.z);
            meetsCondition = dist >= (obj.condition.targetDistance || 0);
            evidence = [`Displacement: ${dist.toFixed(1)} m`];
          }
          break;
        }
        case "OBSERVATION":
        case "RECOVERY": {
          meetsCondition = true; // Just requires time
          break;
        }
        case "LANDING": {
          meetsCondition = isLanded && !crashState?.isCrashed;
          evidence = [
            `Landed: ${isLanded ? 'Yes' : 'No'}`,
            `Intact: ${!crashState?.isCrashed ? 'Yes' : 'No'}`
          ];
          
          if (crashState?.isCrashed) {
            res.status = "NOT_MET";
            res.explanation = "Aircraft crashed before landing.";
            res.evidence = [`Impact Speed: ${crashState.impactSpeedMs.toFixed(1)} m/s`];
            allCompleted = false;
            continue; // Skip further processing for this objective
          }
          break;
        }
      }

      if (meetsCondition) {
        res.durationSeconds += 0.1; // roughly assuming 10Hz evaluation
        res.observedValue = `Condition met for ${res.durationSeconds.toFixed(1)}s`;
        if (res.durationSeconds >= (obj.condition.minDuration || 0)) {
          res.status = "COMPLETED";
          res.evidence = evidence;
          res.explanation = "Objective requirements sustained for required duration.";
        } else {
          allCompleted = false;
        }
      } else {
        res.durationSeconds = 0; // reset
        res.observedValue = "Condition not met";
        allCompleted = false;
        
        // Timeout logic
        if (obj.condition.maxDuration && this.session.elapsedTime > obj.condition.maxDuration) {
          res.status = "NOT_MET";
          res.explanation = "Objective timeout exceeded.";
          res.evidence = evidence;
        }
      }
    }

    if (allCompleted) {
      this.session.state = "COMPLETED";
    } else if (crashState?.isCrashed) {
      // Global failure if crashed
      this.session.state = "NOT_MET";
      for (const obj of this.activeScenario.objectives) {
        if (this.session.results[obj.id].status === "IN_PROGRESS") {
          this.session.results[obj.id].status = "NOT_MET";
          this.session.results[obj.id].explanation = "Aircraft crashed.";
        }
      }
    }
  }

  public registerCoachInsight(insight: FlightCoachInsight) {
    if (this.session && this.session.state === "ACTIVE") {
      this.session.coachInsights.push(insight);
    }
  }
}
