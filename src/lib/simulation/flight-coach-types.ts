import { TelemetryState, EnvironmentState } from "./types";

export interface FlightObservation {
  timestamp: number;
  // AIRCRAFT
  altitude: number;
  verticalSpeed: number;
  horizontalSpeed: number;
  pitch: number; // degrees
  roll: number; // degrees
  yaw: number; // degrees
  motorHealths: number[];
  batteryLevel: number;
  powerWatts: number;
  payloadMassKg: number;
  totalMassKg: number;
  
  // ENVIRONMENT
  windSpeed: number;
  windDirection: number;
  airRelativeVelocityX: number;
  airRelativeVelocityZ: number;
  airRelativeSpeed: number;
  temperature: number;
  airDensity: number;
}

export interface FlightMetrics {
  hoverStability: number; // 0-1 score or deviation in meters
  altitudeDeviation: number | null; 
  lateralDriftSpeed: number;
  maxAttitudeExcursion: number;
  averagePowerDemand: number;
  environmentalDisturbanceExposure: number;
}

export type InsightSeverity = "INFO" | "OBSERVATION" | "ATTENTION" | "CRITICAL";

export interface FlightCoachInsight {
  id: string;
  timestamp: number;
  type: string;
  severity: InsightSeverity;
  title: string;
  explanation: {
    what: string;
    why: string;
    learn: string;
  };
  evidence: string[]; // actual recorded values, e.g. "Wind: 8.5 m/s", "Roll correction: 6.8°"
}

export interface FlightSessionSummary {
  durationSeconds: number;
  maxAltitude: number;
  maxSpeed: number;
  maxAttitudeExcursion: number;
  peakPowerWatts: number;
  averagePowerWatts: number;
  environmentalConditions: {
    wind: number;
    temperature: number;
  };
  insights: FlightCoachInsight[];
}
