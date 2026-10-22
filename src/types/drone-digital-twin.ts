// ==========================================================
// DRONE PILOT — CANONICAL DRONE DIGITAL TWIN TYPE SYSTEM (PHASE 4)
// Single Source of Truth for Aircraft Configuration & Runtime State
// ==========================================================

export type DroneCategory = "quadcopter" | "hexacopter" | "octacopter";

export type DroneApplication =
  | "Training"
  | "Agricultural"
  | "Survey"
  | "Inspection"
  | "Mapping"
  | "Photography"
  | "General Multirotor";

export type FrameMaterial = "Carbon Fiber" | "Aerospace Aluminum" | "Engineered Polymer";
export type LandingGearType = "Fixed Skid" | "Retractable Struts" | "Motor-Integrated Struts";
export type BatteryChemistry = "LiPo (Lithium Polymer)" | "Li-Ion (Lithium Ion)" | "Solid State";
export type PropellerMaterial = "Carbon Fiber Composite" | "Reinforced Polycarbonate" | "Molded Nylon";
export type PayloadAttachment = "Belly Gimbal" | "Underslung Rail" | "Top Fuselage" | "Internal Bay";

export type SensorType =
  | "GPS"
  | "IMU"
  | "BAROMETER"
  | "COMPASS"
  | "OPTICAL_FLOW"
  | "RANGE_FINDER"
  | "AIRSPEED"
  | "CAMERA";

export type ComponentHealth = "HEALTHY" | "DEGRADED" | "OFFLINE" | "FAILED";

// ----------------------------------------------------------
// 1. AIRCRAFT IDENTITY
// ----------------------------------------------------------
export interface AircraftIdentity {
  id: string;
  name: string;
  category: DroneCategory;
  application: DroneApplication;
  manufacturer?: string;
  modelName: string;
  description: string;
  configurationVersion: string; // e.g. "1.0"
  createdAt: number;
  updatedAt: number;
  isPreset?: boolean;
}

// ----------------------------------------------------------
// 2. AIRFRAME SPECIFICATION
// ----------------------------------------------------------
export interface AirframeConfig {
  frameType: DroneCategory;
  motorCount: number;
  armLengthMeters: number;
  frameDiagonalMm: number;
  frameMaterial: FrameMaterial;
  dryMassKg: number;
  dimensions: {
    lengthM: number;
    widthM: number;
    heightM: number;
  };
  centerOfGravity: {
    x: number;
    y: number;
    z: number;
  };
  maxPayloadKg: number;
  landingGearType: LandingGearType;
}

// ----------------------------------------------------------
// 3. PROPULSION: INDIVIDUAL MOTORS
// ----------------------------------------------------------
export interface IndividualMotorConfig {
  motorId: string; // "M1", "M2", ...
  index: number;
  position: { x: number; y: number; z: number };
  direction: 1 | -1; // 1: CW (Clockwise), -1: CCW (Counter-Clockwise)
  nominalRpm: number;
  minRpm: number;
  maxRpm: number;
  kvRating: number;
  ratedVoltageV: number;
  maxPowerWatts: number;
  efficiencyPercent: number;
  status: ComponentHealth;
}

// ----------------------------------------------------------
// 4. PROPELLERS
// ----------------------------------------------------------
export interface PropellerConfig {
  diameterInches: number;
  pitchInches: number;
  bladeCount: number;
  material: PropellerMaterial;
  massGrams: number;
  thrustFactor: number; // multiplier based on blade pitch/chord
}

// ----------------------------------------------------------
// 5. ELECTRONIC SPEED CONTROLLERS (ESC)
// ----------------------------------------------------------
export interface ESCConfig {
  ratedCurrentAmps: number;
  burstCurrentAmps: number;
  voltageMinV: number;
  voltageMaxV: number;
  efficiencyPercent: number;
  protocol: "DShot600" | "DShot300" | "PWM" | "CAN";
}

// ----------------------------------------------------------
// 6. BATTERY & ENERGY STORAGE
// ----------------------------------------------------------
export interface BatteryConfig {
  chemistry: BatteryChemistry;
  cellCount: number; // e.g. 4 for 4S, 6 for 6S
  nominalVoltageV: number; // usually cellCount * 3.7V
  capacityMah: number;
  energyWh: number; // (nominalVoltage * capacityMah) / 1000
  maxContinuousDischargeC: number;
  internalResistanceMilliOhm: number;
  massKg: number;
  batteryHealthPercent: number;
}

// ----------------------------------------------------------
// 7. FLIGHT CONTROLLER
// ----------------------------------------------------------
export interface FlightControllerConfig {
  controllerType: string;
  firmwareVersion: string;
  stabilizationEnabled: boolean;
  gpsAssistedMode: boolean;
  failsafeAction: "RTH" | "AUTO_LAND" | "HOVER";
  controlLoopFrequencyHz: number;
  /**
   * Altitude-hold PD regulator proportional gain.
   * Connected to FlightPhysicsEngine altitude-hold loop.
   * Safe range: 0.5 – 8.0 (default 3.5). Clamped at runtime.
   */
  altitudeHoldPGain?: number;
  /**
   * Altitude-hold PD regulator derivative gain.
   * Connected to FlightPhysicsEngine altitude-hold loop.
   * Safe range: 0.5 – 8.0 (default 2.8). Clamped at runtime.
   */
  altitudeHoldDGain?: number;
}

// ----------------------------------------------------------
// 8. SENSOR SUITE
// ----------------------------------------------------------
export interface SensorConfig {
  id: string;
  type: SensorType;
  name: string;
  enabled: boolean;
  accuracy: string;
  updateRateHz: number;
  health: ComponentHealth;
}

// ----------------------------------------------------------
// 9. PAYLOAD EQUIPMENT
// ----------------------------------------------------------
export interface PayloadConfig {
  id: string;
  type: "Camera" | "Agricultural Tank" | "Survey LiDAR" | "Inspection Sensor" | "Custom";
  name: string;
  massKg: number;
  capacityLiters?: number;
  attachmentPoint: PayloadAttachment;
  enabled: boolean;
}

// ----------------------------------------------------------
// 10. CAMERA SPECIFICATION
// ----------------------------------------------------------
export interface CameraPayloadConfig {
  sensorType: string;
  resolution: string;
  fovDegrees: number;
  gimbalAxisCount: 2 | 3;
  massKg: number;
  enabled: boolean;
}

// ----------------------------------------------------------
// 11. COMMUNICATION & TELEMETRY LINK
// ----------------------------------------------------------
export interface CommunicationConfig {
  type: "2.4GHz Spread Spectrum" | "4G/5G Cellular" | "Long-Range Telemetry";
  rangeKm: number;
  frequencyMhz: number;
  txPowerMilliWatts: number;
}

// ----------------------------------------------------------
// 12. MASS PROPERTIES (CALCULATED + CONFIGURED)
// ----------------------------------------------------------
export interface MassPropertiesConfig {
  dryMassKg: number;
  batteryMassKg: number;
  payloadMassKg: number;
  cameraMassKg: number;
  totalMassKg: number;
  centerOfGravity: { x: number; y: number; z: number };
  estimatedInertiaKgM2: {
    pitch: number;
    roll: number;
    yaw: number;
  };
}

// ----------------------------------------------------------
// 13. PERFORMANCE ENVELOPE
// ----------------------------------------------------------
export interface PerformanceConfig {
  maxHorizontalSpeedMs: number;
  maxAscentSpeedMs: number;
  maxDescentSpeedMs: number;
  maxTiltAngleDeg: number;
  hoverThrottleEstimate: number; // 0.0 - 1.0
  estimatedFlightTimeMinutes: number;
  maxOperatingAltitudeM: number;
  thrustToWeightRatio: number;
  totalThrustNewtons: number;
}

// ----------------------------------------------------------
// CANONICAL DRONE DIGITAL TWIN CONFIGURATION
// Complete static aircraft specification (Source of Truth)
// ----------------------------------------------------------
export interface DroneDigitalTwinConfiguration {
  digitalTwinSchemaVersion?: string; // e.g. "1.0"
  identity: AircraftIdentity;
  airframe: AirframeConfig;
  motors: IndividualMotorConfig[];
  propeller: PropellerConfig;
  esc: ESCConfig;
  battery: BatteryConfig;
  flightController: FlightControllerConfig;
  sensors: SensorConfig[];
  payload: PayloadConfig;
  camera: CameraPayloadConfig;
  communication: CommunicationConfig;
  massProperties: MassPropertiesConfig;
  performance: PerformanceConfig;
}

// ----------------------------------------------------------
// LIVE RUNTIME STATE MODEL
// Distinct from static configuration
// ----------------------------------------------------------
export interface LiveMotorState {
  motorId: string;
  currentRpm: number;
  commandedRpm: number;
  throttlePercent: number; // 0 - 100
  thrustNewtons: number;
  currentAmps: number;
  temperatureC: number;
}

export interface LiveBatteryState {
  socPercent: number;
  voltageV: number;
  currentAmps: number;
  powerWatts: number;
  temperatureC: number;
  remainingCapacityMah: number;
  healthPercent: number;
}

export interface LiveSensorState {
  id: string;
  type: SensorType;
  status: ComponentHealth;
  updateCount: number;
  latestValue: string | number;
}

export interface DroneDigitalTwinRuntimeState {
  motors: LiveMotorState[];
  battery: LiveBatteryState;
  sensors: LiveSensorState[];
  kinematics: {
    positionMsl: { x: number; y: number; z: number };
    altitudeAglM: number;
    groundSpeedKmh: number;
    verticalSpeedMs: number;
    headingDeg: number;
    pitchDeg: number;
    rollDeg: number;
    yawDeg: number;
  };
  totalThrustNewtons: number;
  totalMassKg: number;
  flightMode: string;
  isArmed: boolean;
  flightTimeSeconds: number;
}

// ----------------------------------------------------------
// DIGITAL TWIN SNAPSHOT (PHASE 7)
// Captures time-synchronized static ref + dynamic states
// ----------------------------------------------------------
export interface DigitalTwinSnapshot {
  snapshotId: string;
  timestamp: number;
  simTimeSeconds: number;
  configurationId: string;
  configurationVersion: string;
  runtimeState: DroneDigitalTwinRuntimeState;
  environmentState?: {
    windSpeedKmh: number;
    windDirectionDeg: number;
    gustFactor: number;
    temperatureC: number;
    turbulenceFactor: number;
  };
  faultState?: {
    motorHealths: number[];
    sensorHealth: { gps: boolean; imu: boolean; baro: boolean; compass: boolean };
    payloadMassKg: number;
  };
  scenarioId?: string;
}

// ----------------------------------------------------------
// VALIDATION RESULTS
// ----------------------------------------------------------
export type ValidationSeverity = "ERROR" | "WARNING" | "INFO";

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
  severity: ValidationSeverity;
  educationalFixAdvice?: string;
}

export interface DigitalTwinValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
}

export type ConfigStatus = "UNKNOWN" | "LOADING" | "NOT_CONFIGURED" | "EDITING" | "SAVING" | "CONFIGURED" | "SAVE_ERROR" | "OFFLINE" | "LOAD_ERROR";

export interface ConfigurationFetchResult {
  status: "SUCCESS" | "NOT_FOUND" | "OFFLINE" | "ERROR";
  data: DroneDigitalTwinConfiguration | null;
  error?: string;
}

