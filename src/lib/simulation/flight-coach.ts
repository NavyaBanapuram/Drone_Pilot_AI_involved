import { TelemetryState, EnvironmentState } from "./types";
import { FlightObservation, FlightMetrics, FlightCoachInsight, FlightSessionSummary } from "./flight-coach-types";

export class FlightCoachEngine {
  private sessionInsights: FlightCoachInsight[] = [];
  private observations: FlightObservation[] = [];
  private lastInsightTime: Record<string, number> = {};
  
  // Metrics Trackers
  private maxAlt = 0;
  private maxSpeed = 0;
  private maxTilt = 0;
  private peakPower = 0;
  private totalPower = 0;
  private powerSamples = 0;

  private cooldownMs = 8000;

  public resetSession() {
    this.sessionInsights = [];
    this.observations = [];
    this.lastInsightTime = {};
    this.maxAlt = 0;
    this.maxSpeed = 0;
    this.maxTilt = 0;
    this.peakPower = 0;
    this.totalPower = 0;
    this.powerSamples = 0;
  }

  public getSessionInsights() {
    return this.sessionInsights;
  }

  public extractObservation(telemetry: TelemetryState, env: EnvironmentState): FlightObservation {
    const windRad = (env.windDirection * Math.PI) / 180.0;
    const windVx = Math.sin(windRad) * env.windSpeed;
    const windVz = Math.cos(windRad) * env.windSpeed;
    
    const relVx = telemetry.velocity.x - windVx;
    const relVz = telemetry.velocity.z - windVz;

    return {
      timestamp: Date.now(),
      altitude: telemetry.altitude,
      verticalSpeed: telemetry.verticalSpeed,
      horizontalSpeed: telemetry.groundSpeed / 3.6, // m/s
      pitch: (telemetry.rotation.pitch * 180) / Math.PI,
      roll: (telemetry.rotation.roll * 180) / Math.PI,
      yaw: (telemetry.rotation.yaw * 180) / Math.PI,
      motorHealths: telemetry.motorHealths || [1, 1, 1, 1],
      batteryLevel: telemetry.batteryLevel,
      powerWatts: telemetry.batteryPowerWatts || 0,
      payloadMassKg: telemetry.payloadMassKg || 0,
      totalMassKg: telemetry.totalMassKg || 0,
      windSpeed: env.windSpeed,
      windDirection: env.windDirection,
      airRelativeVelocityX: relVx,
      airRelativeVelocityZ: relVz,
      airRelativeSpeed: Math.hypot(relVx, relVz),
      temperature: env.temperature,
      airDensity: 101325 / (287.05 * (env.temperature + 273.15)),
    };
  }

  public evaluate(obs: FlightObservation): FlightCoachInsight | null {
    // 1. Accumulate tracking metrics for the session summary
    this.maxAlt = Math.max(this.maxAlt, obs.altitude);
    this.maxSpeed = Math.max(this.maxSpeed, obs.horizontalSpeed);
    const tilt = Math.max(Math.abs(obs.pitch), Math.abs(obs.roll));
    this.maxTilt = Math.max(this.maxTilt, tilt);
    
    if (obs.powerWatts > 0) {
      this.peakPower = Math.max(this.peakPower, obs.powerWatts);
      this.totalPower += obs.powerWatts;
      this.powerSamples++;
    }

    this.observations.push(obs);
    // Keep window short to save memory
    if (this.observations.length > 300) {
      this.observations.shift();
    }

    const now = Date.now();
    const canEmit = (key: string) => {
      const last = this.lastInsightTime[key] || 0;
      return (now - last) > this.cooldownMs;
    };

    const emit = (insight: Omit<FlightCoachInsight, "id" | "timestamp">) => {
      this.lastInsightTime[insight.type] = now;
      const fullInsight: FlightCoachInsight = {
        ...insight,
        id: `coach-${insight.type}-${now}`,
        timestamp: now,
      };
      this.sessionInsights.push(fullInsight);
      return fullInsight;
    };

    // RULES:

    // A. Crosswind Drift
    if (obs.windSpeed > 3.0 && obs.altitude > 2.0 && obs.horizontalSpeed > 0.5 && canEmit("crosswind_drift")) {
      return emit({
        type: "crosswind_drift",
        severity: "OBSERVATION",
        title: "Crosswind Disturbance",
        explanation: {
          what: `The aircraft is drifting laterally relative to the ground.`,
          why: `Wind is creating relative airflow. The aerodynamic drag forces the aircraft off its hover track.`,
          learn: `Observe how a constant crosswind requires a continuous corrective attitude (leaning into the wind) to maintain a stationary hover.`
        },
        evidence: [
          `Environmental Wind: ${obs.windSpeed.toFixed(1)} m/s`,
          `Air-Relative Speed: ${obs.airRelativeSpeed.toFixed(1)} m/s`,
          `Observed Ground Drift: ${obs.horizontalSpeed.toFixed(1)} m/s`
        ]
      });
    }

    // B. Payload Mass Change
    if (obs.payloadMassKg > 0.1 && obs.altitude > 1.0 && canEmit("payload_increase")) {
      return emit({
        type: "payload_increase",
        severity: "INFO",
        title: "Payload Inertia",
        explanation: {
          what: `Hover thrust requirement and inertia have increased.`,
          why: `Additional payload mass increases the total weight (F = m*g), requiring the flight controller to output higher continuous motor RPMs.`,
          learn: `Notice the increased power demand and slower acceleration/braking response due to higher total mass.`
        },
        evidence: [
          `Payload Mass: ${obs.payloadMassKg.toFixed(1)} kg`,
          `Total Mass: ${obs.totalMassKg.toFixed(1)} kg`,
          `Power Demand: ${obs.powerWatts.toFixed(0)} W`
        ]
      });
    }

    // C. Motor Failure / Asymmetric Thrust
    const brokenMotorIdx = obs.motorHealths.findIndex(h => h < 0.5);
    if (brokenMotorIdx !== -1 && obs.altitude > 1.0 && canEmit("motor_failure")) {
      return emit({
        type: "motor_failure",
        severity: "CRITICAL",
        title: "Asymmetric Thrust",
        explanation: {
          what: `The aircraft is experiencing severe attitude instability.`,
          why: `Loss of Motor ${brokenMotorIdx + 1} creates asymmetric lift and torque. The remaining motors must operate at near maximum capacity to prevent uncontrolled descent.`,
          learn: `Multirotors rely entirely on balanced motor output. A complete motor loss on a quadcopter generally exceeds the flight controller's stabilization authority.`
        },
        evidence: [
          `Motor ${brokenMotorIdx + 1} Output: ${Math.round(obs.motorHealths[brokenMotorIdx] * 100)}%`,
          `Observed Tilt: ${tilt.toFixed(1)}°`,
          `Altitude: ${obs.altitude.toFixed(1)} m`
        ]
      });
    }

    // D. Low Battery Voltage Sag
    if (obs.batteryLevel < 15 && obs.altitude > 1.0 && canEmit("low_battery")) {
      return emit({
        type: "low_battery",
        severity: "ATTENTION",
        title: "Voltage Sag & Thrust Limit",
        explanation: {
          what: `Maximum available motor thrust is decreasing.`,
          why: `As electrochemical capacity drops, internal resistance causes terminal voltage to sag under high load, explicitly limiting electrical power to the ESCs.`,
          learn: `Watch the power telemetry. High throttle commands will no longer produce peak thrust, significantly reducing climb performance.`
        },
        evidence: [
          `State of Charge: ${Math.round(obs.batteryLevel)}%`,
          `Current Power Draw: ${obs.powerWatts.toFixed(0)} W`
        ]
      });
    }

    // E. Excessive Tilt
    if (tilt > 35 && obs.altitude > 2.0 && canEmit("excessive_tilt")) {
      return emit({
        type: "excessive_tilt",
        severity: "ATTENTION",
        title: "High Attitude Excursion",
        explanation: {
          what: `The aircraft is banked steeply.`,
          why: `A high pitch/roll angle redirects the thrust vector horizontally. This reduces the vertical component of thrust counteracting gravity.`,
          learn: `Notice how steep maneuvers require an increase in total throttle just to maintain altitude.`
        },
        evidence: [
          `Observed Tilt: ${tilt.toFixed(1)}°`,
          `Vertical Speed: ${obs.verticalSpeed.toFixed(1)} m/s`
        ]
      });
    }

    return null;
  }

  public generateSessionSummary(durationSeconds: number, env: EnvironmentState): FlightSessionSummary {
    return {
      durationSeconds,
      maxAltitude: this.maxAlt,
      maxSpeed: this.maxSpeed,
      maxAttitudeExcursion: this.maxTilt,
      peakPowerWatts: this.peakPower,
      averagePowerWatts: this.powerSamples > 0 ? this.totalPower / this.powerSamples : 0,
      environmentalConditions: {
        wind: env.windSpeed,
        temperature: env.temperature,
      },
      insights: [...this.sessionInsights]
    };
  }
}
