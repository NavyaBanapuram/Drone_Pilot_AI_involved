import { EnvironmentState, TelemetryState } from "./types";
import { FlightObservation, FlightCoachInsight } from "./flight-coach-types";

export type ScenarioState = "IDLE" | "BRIEFING" | "READY" | "ACTIVE" | "COMPLETED" | "NOT_MET" | "ABORTED" | "DEBRIEF";
export type ObjectiveStatus = "NOT_STARTED" | "IN_PROGRESS" | "OBSERVED" | "COMPLETED" | "NOT_MET";

export interface ScenarioObjectiveDef {
  id: string;
  title: string;
  description: string;
  type: "STABILITY" | "ALTITUDE" | "NAVIGATION" | "OBSERVATION" | "RECOVERY" | "LANDING";
  // The threshold definition for the evaluator
  condition: {
    targetAltitude?: number;
    altTolerance?: number;
    maxDriftVelocity?: number;
    maxTiltDeg?: number;
    minDuration?: number; // seconds
    maxDuration?: number; // seconds (timeout)
    targetDistance?: number;
    landingZoneRadius?: number;
    motorIndex?: number;
    minPayload?: number;
    minWind?: number;
  };
}

export interface TrainingScenarioDef {
  id: string;
  title: string;
  description: string;
  learningObjective: string;
  briefing: {
    initialConditions: string;
    whatToObserve: string;
    availableControls: string;
  };
  environmentSetup: Partial<EnvironmentState>;
  aircraftSetup: {
    payloadKg?: number;
    batteryPercent?: number;
    motorHealth?: Record<number, number>;
  };
  objectives: ScenarioObjectiveDef[];
  debriefTopics: string[];
}

export interface ObjectiveResult {
  id: string;
  status: ObjectiveStatus;
  observedValue: string;
  expectedCondition: string;
  durationSeconds: number;
  evidence: string[];
  explanation: string;
}

export interface ScenarioSessionState {
  scenarioId: string;
  state: ScenarioState;
  startTime: number;
  elapsedTime: number;
  results: Record<string, ObjectiveResult>;
  coachInsights: FlightCoachInsight[];
}
