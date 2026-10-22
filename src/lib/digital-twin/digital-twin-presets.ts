// ==========================================================
// DRONE PILOT — EDUCATIONAL DIGITAL TWIN PRESETS (PHASE 4)
// Factory-calibrated baseline aircraft models
// ==========================================================

import {
  DroneDigitalTwinConfiguration,
  IndividualMotorConfig,
} from "@/types/drone-digital-twin";
import {
  calculateMassProperties,
  calculatePerformanceEnvelope,
} from "./mass-calculator";

function generateRadialMotors(
  count: number,
  armRadius: number,
  nominalRpm: number,
  maxRpm: number,
  kv: number,
  ratedVoltage: number
): IndividualMotorConfig[] {
  const motors: IndividualMotorConfig[] = [];
  const step = (Math.PI * 2) / count;
  // Offset by 45 degrees for X configurations (4 or 8 motors), otherwise 0 or half-step for hexa
  const offset = count === 4 || count === 8 ? Math.PI / 4 : (count === 6 ? Math.PI / 6 : 0);

  for (let i = 0; i < count; i++) {
    const angle = (i * step) + offset;
    motors.push({
      motorId: `M${i + 1}`,
      index: i,
      position: {
        x: Math.round(Math.cos(angle) * armRadius * 1000) / 1000,
        y: 0,
        z: Math.round(Math.sin(angle) * armRadius * 1000) / 1000,
      },
      direction: i % 2 === 0 ? 1 : -1,
      nominalRpm,
      minRpm: 1200,
      maxRpm,
      kvRating: kv,
      ratedVoltageV: ratedVoltage,
      maxPowerWatts: Math.round((ratedVoltage * 28) / count) * 10,
      efficiencyPercent: 84,
      status: "HEALTHY",
    });
  }
  return motors;
}

// ----------------------------------------------------------
// 1. TRAINING QUADCOPTER (Class 4A Tactical Enterprise)
// ----------------------------------------------------------
const trainingDraft: Partial<DroneDigitalTwinConfiguration> = {
  identity: {
    id: "training-quadcopter",
    name: "AeroTrainer Quad X4",
    category: "quadcopter",
    application: "Training",
    modelName: "AT-400 Agile",
    description:
      "A balanced 4-rotor tactical trainer engineered for pilot licensing, stable hover acquisition, and precision obstacle navigation.",
    configurationVersion: "1.0",
    createdAt: 1726000000000,
    updatedAt: 1726000000000,
    isPreset: true,
  },
  airframe: {
    frameType: "quadcopter",
    motorCount: 4,
    armLengthMeters: 0.35,
    frameDiagonalMm: 500,
    frameMaterial: "Carbon Fiber",
    dryMassKg: 1.85,
    dimensions: { lengthM: 0.58, widthM: 0.58, heightM: 0.26 },
    centerOfGravity: { x: 0, y: 0, z: 0 },
    maxPayloadKg: 0.8,
    landingGearType: "Motor-Integrated Struts",
  },
  motors: generateRadialMotors(4, 0.35, 8500, 12000, 920, 14.8),
  propeller: {
    diameterInches: 13.0,
    pitchInches: 5.2,
    bladeCount: 2,
    material: "Carbon Fiber Composite",
    massGrams: 28,
    thrustFactor: 1.0,
  },
  esc: {
    ratedCurrentAmps: 35,
    burstCurrentAmps: 45,
    voltageMinV: 11.1,
    voltageMaxV: 17.4,
    efficiencyPercent: 92,
    protocol: "DShot600",
  },
  battery: {
    chemistry: "LiPo (Lithium Polymer)",
    cellCount: 4, // 4S
    nominalVoltageV: 14.8,
    capacityMah: 5000,
    energyWh: 74,
    maxContinuousDischargeC: 30,
    internalResistanceMilliOhm: 12,
    massKg: 0.52,
    batteryHealthPercent: 100,
  },
  flightController: {
    controllerType: "ApexFlight F7 Avionics",
    firmwareVersion: "4.5.1-LTS",
    stabilizationEnabled: true,
    gpsAssistedMode: true,
    failsafeAction: "RTH",
    controlLoopFrequencyHz: 400,
    altitudeHoldPGain: 3.5,
    altitudeHoldDGain: 2.8,
  },
  sensors: [
    { id: "s-gps", type: "GPS", name: "High-Precision GNSS Receiver", enabled: true, accuracy: "±0.5m", updateRateHz: 10, health: "HEALTHY" },
    { id: "s-imu", type: "IMU", name: "Dual 6-Axis Invensense IMU", enabled: true, accuracy: "±0.02°", updateRateHz: 400, health: "HEALTHY" },
    { id: "s-baro", type: "BAROMETER", name: "Precision Digital Barometer", enabled: true, accuracy: "±0.1m", updateRateHz: 50, health: "HEALTHY" },
    { id: "s-comp", type: "COMPASS", name: "Triaxial Magnetometer", enabled: true, accuracy: "±1.0°", updateRateHz: 50, health: "HEALTHY" },
  ],
  payload: {
    id: "p-none",
    type: "Custom",
    name: "Clean Training Configuration (No Payload)",
    massKg: 0.0,
    attachmentPoint: "Belly Gimbal",
    enabled: false,
  },
  camera: {
    sensorType: "4K Inspection Optics",
    resolution: "3840x2160",
    fovDegrees: 84,
    gimbalAxisCount: 3,
    massKg: 0.18,
    enabled: true,
  },
  communication: {
    type: "2.4GHz Spread Spectrum",
    rangeKm: 5.0,
    frequencyMhz: 2400,
    txPowerMilliWatts: 100,
  },
};

const trainingMass = calculateMassProperties(trainingDraft);
const trainingPerf = calculatePerformanceEnvelope(trainingDraft, trainingMass);

export const TRAINING_QUADCOPTER_PRESET: DroneDigitalTwinConfiguration = {
  ...trainingDraft,
  massProperties: trainingMass,
  performance: trainingPerf,
} as DroneDigitalTwinConfiguration;

// ----------------------------------------------------------
// 2. AGRICULTURAL QUADCOPTER (Crop Care Sprayer)
// ----------------------------------------------------------
const agriDraft: Partial<DroneDigitalTwinConfiguration> = {
  identity: {
    id: "agri-quadcopter",
    name: "AgriSpray Quad X4-CropMaster",
    category: "quadcopter",
    application: "Agricultural",
    modelName: "AG-600 Sprayer",
    description:
      "Optimized for precision agricultural spraying and crop health inspection with underslung fluid tanks and rugged environmental sealing.",
    configurationVersion: "1.0",
    createdAt: 1726000000000,
    updatedAt: 1726000000000,
    isPreset: true,
  },
  airframe: {
    frameType: "quadcopter",
    motorCount: 4,
    armLengthMeters: 0.42,
    frameDiagonalMm: 600,
    frameMaterial: "Carbon Fiber",
    dryMassKg: 2.4,
    dimensions: { lengthM: 0.68, widthM: 0.68, heightM: 0.32 },
    centerOfGravity: { x: 0, y: 0, z: 0 },
    maxPayloadKg: 2.0,
    landingGearType: "Fixed Skid",
  },
  motors: generateRadialMotors(4, 0.42, 7800, 11500, 720, 22.2),
  propeller: {
    diameterInches: 15.0,
    pitchInches: 5.5,
    bladeCount: 2,
    material: "Carbon Fiber Composite",
    massGrams: 36,
    thrustFactor: 1.15,
  },
  esc: {
    ratedCurrentAmps: 45,
    burstCurrentAmps: 60,
    voltageMinV: 18.0,
    voltageMaxV: 26.0,
    efficiencyPercent: 91,
    protocol: "DShot600",
  },
  battery: {
    chemistry: "LiPo (Lithium Polymer)",
    cellCount: 6, // 6S
    nominalVoltageV: 22.2,
    capacityMah: 8000,
    energyWh: 177.6,
    maxContinuousDischargeC: 25,
    internalResistanceMilliOhm: 9,
    massKg: 1.15,
    batteryHealthPercent: 100,
  },
  flightController: {
    controllerType: "AgriAvionics V4",
    firmwareVersion: "2.1.0-AG",
    stabilizationEnabled: true,
    gpsAssistedMode: true,
    failsafeAction: "AUTO_LAND",
    controlLoopFrequencyHz: 400,
    altitudeHoldPGain: 3.5,
    altitudeHoldDGain: 2.8,
  },
  sensors: [
    { id: "s-gps", type: "GPS", name: "RTK Dual-Frequency GNSS", enabled: true, accuracy: "±0.02m", updateRateHz: 20, health: "HEALTHY" },
    { id: "s-imu", type: "IMU", name: "Triple Redundant Industrial IMU", enabled: true, accuracy: "±0.01°", updateRateHz: 400, health: "HEALTHY" },
    { id: "s-baro", type: "BAROMETER", name: "Sealed Terrain Barometer", enabled: true, accuracy: "±0.05m", updateRateHz: 50, health: "HEALTHY" },
    { id: "s-comp", type: "COMPASS", name: "Anti-Interference Compass", enabled: true, accuracy: "±0.8°", updateRateHz: 50, health: "HEALTHY" },
    { id: "s-radar", type: "RANGE_FINDER", name: "Downward Millimeter Radar", enabled: true, accuracy: "±0.01m", updateRateHz: 50, health: "HEALTHY" },
  ],
  payload: {
    id: "p-tank",
    type: "Agricultural Tank",
    name: "1.2L Precision Spray Reservoir",
    massKg: 1.2,
    capacityLiters: 1.2,
    attachmentPoint: "Underslung Rail",
    enabled: true,
  },
  camera: {
    sensorType: "Multispectral Crop Scanner",
    resolution: "1920x1080",
    fovDegrees: 70,
    gimbalAxisCount: 2,
    massKg: 0.22,
    enabled: true,
  },
  communication: {
    type: "Long-Range Telemetry",
    rangeKm: 8.0,
    frequencyMhz: 915,
    txPowerMilliWatts: 500,
  },
};

const agriMass = calculateMassProperties(agriDraft);
const agriPerf = calculatePerformanceEnvelope(agriDraft, agriMass);

export const AGRICULTURAL_QUADCOPTER_PRESET: DroneDigitalTwinConfiguration = {
  ...agriDraft,
  massProperties: agriMass,
  performance: agriPerf,
} as DroneDigitalTwinConfiguration;

// ----------------------------------------------------------
// 3. SURVEY HEXACOPTER (Class 6B Medium-Duty Radial)
// ----------------------------------------------------------
const surveyDraft: Partial<DroneDigitalTwinConfiguration> = {
  identity: {
    id: "survey-hexacopter",
    name: "SkyMapper Hexa 6B",
    category: "hexacopter",
    application: "Survey",
    modelName: "SM-750 Photogrammetry",
    description:
      "Six-rotor radial configuration offering motor redundancy, exceptional crosswind resistance, and high lift capacity for aerial photogrammetry.",
    configurationVersion: "1.0",
    createdAt: 1726000000000,
    updatedAt: 1726000000000,
    isPreset: true,
  },
  airframe: {
    frameType: "hexacopter",
    motorCount: 6,
    armLengthMeters: 0.60,
    frameDiagonalMm: 1200,
    frameMaterial: "Carbon Fiber",
    dryMassKg: 3.4,
    dimensions: { lengthM: 1.25, widthM: 1.25, heightM: 0.30 },
    centerOfGravity: { x: 0, y: 0, z: 0 },
    maxPayloadKg: 2.2,
    landingGearType: "Retractable Struts",
  },
  motors: generateRadialMotors(6, 0.60, 7200, 10500, 680, 22.2),
  propeller: {
    diameterInches: 14.0,
    pitchInches: 5.0,
    bladeCount: 2,
    material: "Carbon Fiber Composite",
    massGrams: 32,
    thrustFactor: 1.05,
  },
  esc: {
    ratedCurrentAmps: 40,
    burstCurrentAmps: 55,
    voltageMinV: 18.0,
    voltageMaxV: 26.0,
    efficiencyPercent: 93,
    protocol: "DShot600",
  },
  battery: {
    chemistry: "LiPo (Lithium Polymer)",
    cellCount: 6,
    nominalVoltageV: 22.2,
    capacityMah: 9000,
    energyWh: 199.8,
    maxContinuousDischargeC: 25,
    internalResistanceMilliOhm: 7,
    massKg: 1.35,
    batteryHealthPercent: 100,
  },
  flightController: {
    controllerType: "HexControl Enterprise",
    firmwareVersion: "5.0.2",
    stabilizationEnabled: true,
    gpsAssistedMode: true,
    failsafeAction: "RTH",
    controlLoopFrequencyHz: 400,
    altitudeHoldPGain: 4.2,
    altitudeHoldDGain: 3.1,
  },
  sensors: [
    { id: "s-gps", type: "GPS", name: "RTK Surveyor GNSS", enabled: true, accuracy: "±0.01m", updateRateHz: 20, health: "HEALTHY" },
    { id: "s-imu", type: "IMU", name: "Industrial Grade IMU", enabled: true, accuracy: "±0.01°", updateRateHz: 400, health: "HEALTHY" },
    { id: "s-baro", type: "BAROMETER", name: "High-Altitude Barometer", enabled: true, accuracy: "±0.05m", updateRateHz: 50, health: "HEALTHY" },
    { id: "s-comp", type: "COMPASS", name: "Dual Redundant Magnetometer", enabled: true, accuracy: "±0.5°", updateRateHz: 50, health: "HEALTHY" },
  ],
  payload: {
    id: "p-lidar",
    type: "Survey LiDAR",
    name: "Topographic LiDAR Scanner (300k pts/sec)",
    massKg: 0.95,
    attachmentPoint: "Belly Gimbal",
    enabled: true,
  },
  camera: {
    sensorType: "45MP Photogrammetry Sensor",
    resolution: "8192x5464",
    fovDegrees: 65,
    gimbalAxisCount: 3,
    massKg: 0.35,
    enabled: true,
  },
  communication: {
    type: "Long-Range Telemetry",
    rangeKm: 10.0,
    frequencyMhz: 915,
    txPowerMilliWatts: 1000,
  },
};

const surveyMass = calculateMassProperties(surveyDraft);
const surveyPerf = calculatePerformanceEnvelope(surveyDraft, surveyMass);

export const SURVEY_HEXACOPTER_PRESET: DroneDigitalTwinConfiguration = {
  ...surveyDraft,
  massProperties: surveyMass,
  performance: surveyPerf,
} as DroneDigitalTwinConfiguration;

// ----------------------------------------------------------
// 4. HEAVY-LIFT OCTACOPTER (Class 8C Heavy Industrial)
// ----------------------------------------------------------
const heavyDraft: Partial<DroneDigitalTwinConfiguration> = {
  identity: {
    id: "heavy-lift-octacopter",
    name: "Titan Octo 8C Industrial",
    category: "octacopter",
    application: "Inspection",
    modelName: "HL-900 Industrial",
    description:
      "Eight-rotor commercial heavy lifter built for offshore industrial inspections, heavy cinema equipment, and critical cargo transport.",
    configurationVersion: "1.0",
    createdAt: 1726000000000,
    updatedAt: 1726000000000,
    isPreset: true,
  },
  airframe: {
    frameType: "octacopter",
    motorCount: 8,
    armLengthMeters: 0.90,
    frameDiagonalMm: 1800,
    frameMaterial: "Carbon Fiber",
    dryMassKg: 6.2,
    dimensions: { lengthM: 1.85, widthM: 1.85, heightM: 0.36 },
    centerOfGravity: { x: 0, y: 0, z: 0 },
    maxPayloadKg: 5.5,
    landingGearType: "Retractable Struts",
  },
  motors: generateRadialMotors(8, 0.90, 6800, 9800, 480, 22.2),
  propeller: {
    diameterInches: 16.0,
    pitchInches: 6.0,
    bladeCount: 2,
    material: "Carbon Fiber Composite",
    massGrams: 48,
    thrustFactor: 1.2,
  },
  esc: {
    ratedCurrentAmps: 50,
    burstCurrentAmps: 70,
    voltageMinV: 18.0,
    voltageMaxV: 26.0,
    efficiencyPercent: 93,
    protocol: "CAN",
  },
  battery: {
    chemistry: "LiPo (Lithium Polymer)",
    cellCount: 6,
    nominalVoltageV: 22.2,
    capacityMah: 16000,
    energyWh: 355.2,
    maxContinuousDischargeC: 25,
    internalResistanceMilliOhm: 5,
    massKg: 2.45,
    batteryHealthPercent: 100,
  },
  flightController: {
    controllerType: "Avionics Titan-8 Redundant",
    firmwareVersion: "6.2.0",
    stabilizationEnabled: true,
    gpsAssistedMode: true,
    failsafeAction: "AUTO_LAND",
    controlLoopFrequencyHz: 400,
    altitudeHoldPGain: 3.5,
    altitudeHoldDGain: 2.8,
  },
  sensors: [
    { id: "s-gps", type: "GPS", name: "Dual-Antenna RTK GNSS", enabled: true, accuracy: "±0.01m", updateRateHz: 20, health: "HEALTHY" },
    { id: "s-imu", type: "IMU", name: "Triple Isolated Aerospace IMU", enabled: true, accuracy: "±0.01°", updateRateHz: 500, health: "HEALTHY" },
    { id: "s-baro", type: "BAROMETER", name: "Dual Pitot Barometer", enabled: true, accuracy: "±0.05m", updateRateHz: 100, health: "HEALTHY" },
    { id: "s-comp", type: "COMPASS", name: "External Mast Magnetometer", enabled: true, accuracy: "±0.5°", updateRateHz: 50, health: "HEALTHY" },
    { id: "s-opt", type: "OPTICAL_FLOW", name: "Downward Laser Flow Unit", enabled: true, accuracy: "±0.02m", updateRateHz: 50, health: "HEALTHY" },
  ],
  payload: {
    id: "p-cin",
    type: "Inspection Sensor",
    name: "Corona & Radiometric Thermal Sensor",
    massKg: 2.1,
    attachmentPoint: "Belly Gimbal",
    enabled: true,
  },
  camera: {
    sensorType: "640x512 FLIR Thermal + 8K Optical",
    resolution: "7680x4320",
    fovDegrees: 55,
    gimbalAxisCount: 3,
    massKg: 0.65,
    enabled: true,
  },
  communication: {
    type: "4G/5G Cellular",
    rangeKm: 25.0,
    frequencyMhz: 1800,
    txPowerMilliWatts: 1500,
  },
};

const heavyMass = calculateMassProperties(heavyDraft);
const heavyPerf = calculatePerformanceEnvelope(heavyDraft, heavyMass);

export const HEAVY_LIFT_OCTOCOPTER_PRESET: DroneDigitalTwinConfiguration = {
  ...heavyDraft,
  massProperties: heavyMass,
  performance: heavyPerf,
} as DroneDigitalTwinConfiguration;

// ----------------------------------------------------------
// PRESETS REGISTRY
// ----------------------------------------------------------
export const DIGITAL_TWIN_PRESETS: DroneDigitalTwinConfiguration[] = [
  TRAINING_QUADCOPTER_PRESET,
  AGRICULTURAL_QUADCOPTER_PRESET,
  SURVEY_HEXACOPTER_PRESET,
  HEAVY_LIFT_OCTOCOPTER_PRESET,
];

export function getDigitalTwinPresetById(
  id: string
): DroneDigitalTwinConfiguration {
  const found = DIGITAL_TWIN_PRESETS.find(
    (p) =>
      p.identity.id.toLowerCase() === id.toLowerCase() ||
      p.identity.category.toLowerCase() === id.toLowerCase()
  );
  return found ? JSON.parse(JSON.stringify(found)) : JSON.parse(JSON.stringify(TRAINING_QUADCOPTER_PRESET));
}
