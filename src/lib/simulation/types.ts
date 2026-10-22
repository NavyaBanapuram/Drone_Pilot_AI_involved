// ==========================================================
// DRONE PILOT SIMULATION CORE — TYPE DEFINITIONS
// Modular Multi-Rotor Architecture, 6-DoF Physics, Avionics,
// Battery Dynamics, Environment Modeling & Educational Guidance
// ==========================================================

export type DroneCategory = "quadcopter" | "hexacopter" | "octacopter";

export interface MotorDefinition {
  id: number;
  position: { x: number; y: number; z: number };
  direction: 1 | -1; // 1: CW, -1: CCW
  thrustFactor: number;
}

export interface DroneDefinition {
  id: string;
  name: string;
  type: DroneCategory;

  // --------------------------------------------------------
  // SIMULATION / PROTOTYPE PARAMETERS (Prototype Flight Model)
  // --------------------------------------------------------
  mass: number; // kg (dry airframe mass)
  motorCount: number;
  motors: MotorDefinition[];
  maximumThrust: number; // Newtons total collective
  batteryCapacity: number; // mAh (nominal simulation capacity)
  batteryDischargeRate: number; // % per minute hovering
  batteryCells?: number; // LiPo series cell count (e.g. 4S, 6S)
  batteryInternalResistanceMilliOhm?: number; // pack-level resistance from Digital Twin
  motorTimeConstant?: number; // seconds to reach target RPM (typically 0.05s)
  dimensions: {
    length: number; // meters
    width: number;
    height: number;
  };
  payloadCapacity: number; // kg
  inertia: {
    pitch: number; // kg * m^2
    roll: number;
    yaw: number;
  };
  drag: {
    linear: number; // aerodynamic drag coefficient
    angular: number; // rotational damping coefficient
  };
  maxTiltAngle: number; // radians (banking limit for assisted hover)
  maxAscentSpeed: number; // m/s
  maxDescentSpeed: number; // m/s
  maxForwardSpeed: number; // m/s
  // --------------------------------------------------------
  // FLIGHT CONTROLLER TUNING (from Digital Twin FlightControllerConfig)
  // --------------------------------------------------------
  /** Altitude-hold PD proportional gain. Clamped to [0.5, 8.0]. Default: 3.5 */
  altitudeHoldPGain?: number;
  /** Altitude-hold PD derivative gain. Clamped to [0.5, 8.0]. Default: 2.8 */
  altitudeHoldDGain?: number;
}


export interface FlightInput {
  throttle: number; // 1: ascend, -1: descend, 0: hold/neutral
  pitch: number;    // 1: forward, -1: backward, 0: neutral
  roll: number;     // 1: right, -1: left, 0: neutral
  yaw: number;      // 1: rotate right, -1: rotate left, 0: neutral
  hoverHold: boolean;
  reset: boolean;
  cameraToggle: boolean;
}

export type FlightMode = "LANDED" | "HOVER" | "MANUAL" | "STABILIZED" | "RTH" | "AUTO LAND";

export interface MotorState {
  id: number;
  throttle: number; // 0.0 - 1.0 commanded
  rpm: number; // actual revolutions per minute
  thrustNewtons: number; // instantaneous thrust in N
  currentAmps: number; // current draw in A
}

export interface BatteryState {
  capacityMah: number;
  remainingMah: number;
  percentage: number; // 0 - 100%
  cellCount: number;
  openCircuitVoltage: number; // V
  terminalVoltage: number; // V (sagged under current draw)
  currentAmps: number; // instantaneous total discharge
  powerWatts: number; // instantaneous power
  temperatureC: number; // battery cell temperature
  isLow: boolean;
  isCritical: boolean;
}

export type WeatherPreset = "normal" | "windy" | "hot" | "rain" | "fog" | "storm";
export type WeatherType = "clear" | "overcast" | "windy" | "rain" | "fog" | "storm";
export type TimeOfDay = "morning" | "noon" | "sunset" | "night";

export interface EnvironmentState {
  weather: WeatherType;
  preset: WeatherPreset;
  windSpeed: number; // m/s (0 - 25 m/s)
  windDirection: number; // degrees (0 - 360°, North=0)
  windGust: number; // gust amplitude m/s
  temperature: number; // Celsius (-10 to 45°C)
  rainIntensity: number; // 0.0 to 1.0
  visibility: number; // 0.0 to 1.0
  timeOfDay: TimeOfDay;
  turbulence?: number; // 0.0 to 1.0 (calm to severe atmospheric turbulence)
}

export interface TelemetryState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: { pitch: number; roll: number; yaw: number }; // radians
  altitude: number; // meters Above Ground Level (AGL)
  altitudeMsl?: number; // meters Mean Sea Level
  groundSpeed: number; // km/h
  verticalSpeed: number; // m/s
  heading: number; // degrees 0-360 (North=0, East=90, South=180, West=270)
  batteryLevel: number; // 0 - 100 %
  batteryVoltage?: number; // V
  batteryCurrentAmps?: number; // A
  batteryPowerWatts?: number; // W
  flightTimeSeconds: number;
  flightMode: FlightMode;
  isArmed: boolean;
  rotorRpmPercent: number; // 0 - 100 %
  motorOutputs?: number[]; // [0.0 - 1.0] per motor
  motorHealths?: number[]; // [0.0 - 1.0] health per motor
  motorRpms?: number[]; // actual RPM per motor
  distanceFromHome: number; // meters
  flightPath: Array<{ x: number; z: number }>;
  payloadMassKg?: number;
  totalMassKg?: number;
  isCrashed?: boolean;
  isCeilingLimitReached?: boolean;
  isGroundLimitReached?: boolean;
  isRtlActive?: boolean;
  rtlStage?: "CLIMB" | "TRANSIT" | "DESCENT" | "LANDED";
  isGeoFenceWarning?: boolean;
  isGeoFenceBreached?: boolean;
  sensorHealth?: {
    gps: boolean;
    imu: boolean;
    baro: boolean;
    compass: boolean;
  };
  windVector?: {
    speedMs: number;
    directionDeg: number;
    gustMs: number;
  };
  ambientTemperatureC?: number;
}

export interface PhysicsDebugTelemetry {
  dryMass: number;
  payloadMass: number;
  totalMass: number;
  weightNewtons: number;
  totalThrustNewtons: number;
  thrustToWeightRatio: number;
  maxThrustToWeightRatio: number; // For overload detection
  motorOutputs: number[];
  accel: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  windForce: { x: number; y: number; z: number };
  dragForce: { x: number; y: number; z: number };
  batteryPowerWatts: number;
  groundElevationMsl: number;
  radarAgl: number;
}

export interface EducationalEvent {
  id: string;
  title: string;
  message: string;
  whatHappened?: string;
  whyItHappened?: string;
  whatEffectItCaused?: string;
  recommendedAction?: string;
  cause?: string;
  effect?: string;
  severity: "info" | "success" | "warning" | "error";
  timestamp: number;
}

export interface CrashState {
  isCrashed: boolean;
  impactSpeedKmh: number;
  impactSpeedMs: number;
  impactLocation: { x: number; y: number; z: number };
  kineticEnergyJoules: number;
  primaryCause: string;
  impactNormal: { x: number; y: number; z: number };
  timestamp: number;
}

export interface FlightLogEntry {
  id: string;
  timestampSeconds: number;
  type: "TAKEOFF" | "HOVER" | "WIND_CHANGE" | "PAYLOAD_CHANGE" | "WARNING" | "LANDING" | "CRASH";
  title: string;
  description: string;
  telemetrySnapshot: {
    altitudeAgl: number;
    groundSpeedKmh: number;
    batteryLevel: number;
  };
}

export interface FlightAnalysisReport {
  droneName: string;
  flightDurationSeconds: number;
  maxAltitudeMeters: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  batteryConsumedPercent: number;
  batteryConsumedMah: number;
  maxWindSpeedMs: number;
  warningCount: number;
  landingQuality: "PERFECT" | "SMOOTH" | "HARD" | "CRASH";
  crashDetails?: CrashState;
  whatHappened: string;
  whyItHappened: string;
  howToImprove: string[];
}

export interface ReplayFrame {
  timeSeconds: number;
  position: { x: number; y: number; z: number };
  rotation: { pitch: number; roll: number; yaw: number };
  velocity: { x: number; y: number; z: number };
  motorOutputs: number[];
  batteryLevel: number;
  altitudeAgl: number;
  groundSpeedKmh: number;
  flightMode: FlightMode;
  eventMarker?: string;
}

export interface TutorialStep {
  index: number;
  id: string;
  title: string;
  instruction: string;
  actionCallout: string;
  completed: boolean;
}

// ----------------------------------------------------------
// PHASE 6: SNAPSHOT SYSTEM
// ----------------------------------------------------------
export interface SimulationSnapshot {
  snapshotId: string;
  configVersion: string;
  timestamp: number;
  simTimeSeconds: number;
  aircraftConfigurationRef: string; // Configuration ID or Platform Category
  telemetry: TelemetryState;
  environment: EnvironmentState;
  scenarioState?: {
    scenarioId: string;
    elapsedTime: number;
  };
}
