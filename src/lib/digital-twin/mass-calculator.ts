// ==========================================================
// DRONE PILOT — CANONICAL MASS & PERFORMANCE CALCULATOR (PHASE 4)
// Pure calculation functions for multirotor physics & digital twin
// ==========================================================

import {
  DroneDigitalTwinConfiguration,
  MassPropertiesConfig,
  PerformanceConfig,
} from "@/types/drone-digital-twin";

const GRAVITY = 9.80665; // m/s^2

/**
 * Calculates battery mass based on chemistry, cell count, and capacity.
 * Standard high-discharge LiPo energy density is approximately 165 Wh/kg.
 */
export function estimateBatteryMassKg(
  cellCount: number,
  capacityMah: number,
  chemistry: string
): number {
  const nominalVoltage = cellCount * 3.7;
  const energyWh = (nominalVoltage * capacityMah) / 1000;

  // Energy density Wh/kg by chemistry
  let densityWhKg = 165; // Standard LiPo
  if (chemistry.includes("Li-Ion")) {
    densityWhKg = 220;
  } else if (chemistry.includes("Solid State")) {
    densityWhKg = 310;
  }

  // Account for wiring, connectors, and heat shrink casing (~12% overhead)
  const estimatedMass = (energyWh / densityWhKg) * 1.12;
  return Math.round(estimatedMass * 1000) / 1000;
}

/**
 * Calculates comprehensive mass properties for a drone configuration.
 * Single source of truth across UI and simulation engine.
 */
export function calculateMassProperties(
  config: Partial<DroneDigitalTwinConfiguration>
): MassPropertiesConfig {
  const airframe = config.airframe;
  const battery = config.battery;
  const payload = config.payload;
  const camera = config.camera;

  const dryMassKg = airframe?.dryMassKg ?? 1.85;

  let batteryMassKg = battery?.massKg ?? 0;
  if (!batteryMassKg || batteryMassKg <= 0) {
    batteryMassKg = estimateBatteryMassKg(
      battery?.cellCount ?? 4,
      battery?.capacityMah ?? 5000,
      battery?.chemistry ?? "LiPo"
    );
  }

  const payloadMassKg = payload?.enabled ? payload.massKg ?? 0 : 0;
  const cameraMassKg = camera?.enabled ? camera.massKg ?? 0 : 0;

  const totalMassKg =
    Math.round((dryMassKg + batteryMassKg + payloadMassKg + cameraMassKg) * 1000) / 1000;

  // Simplified educational multirotor moment of inertia estimation (kg·m²)
  // Modeling as a symmetrical cross cylinder + central point mass
  const radius = airframe?.armLengthMeters ?? 0.35;
  const pitchInertia = 0.5 * totalMassKg * Math.pow(radius, 2) * 0.45;
  const rollInertia = pitchInertia;
  const yawInertia = 0.5 * totalMassKg * Math.pow(radius, 2) * 0.85;

  return {
    dryMassKg,
    batteryMassKg,
    payloadMassKg,
    cameraMassKg,
    totalMassKg,
    centerOfGravity: airframe?.centerOfGravity ?? { x: 0, y: 0, z: 0 },
    estimatedInertiaKgM2: {
      pitch: Math.round(pitchInertia * 10000) / 10000,
      roll: Math.round(rollInertia * 10000) / 10000,
      yaw: Math.round(yawInertia * 10000) / 10000,
    },
  };
}

/**
 * Calculates aerodynamic and electrical performance limits.
 */
export function calculatePerformanceEnvelope(
  config: Partial<DroneDigitalTwinConfiguration>,
  massProps: MassPropertiesConfig
): PerformanceConfig {
  const motors = config.motors ?? [];
  const motorCount = motors.length || config.airframe?.motorCount || 4;
  const prop = config.propeller;
  const battery = config.battery;

  // Propeller thrust calculation (Simplified actuator disc approximation)
  // T per motor = Ct * rho * n^2 * D^4
  // Empirical approximation for brushless hobby outrunners:
  const nominalRpm = motors[0]?.nominalRpm ?? 8500;
  const maxRpm = motors[0]?.maxRpm ?? 12000;
  const propDiameterInches = prop?.diameterInches ?? 13;
  const propPitchInches = prop?.pitchInches ?? 5.2;

  // Nominal max static thrust per motor in Newtons
  // Rule of thumb: ~9.5N for 13x5.2 at 12000 RPM
  const baseThrustPerMotor =
    Math.pow(maxRpm / 10000, 2) *
    Math.pow(propDiameterInches / 10, 3) *
    (propPitchInches / 5) *
    4.5;

  const totalThrustNewtons = Math.round(baseThrustPerMotor * motorCount * 10) / 10;
  const weightNewtons = massProps.totalMassKg * GRAVITY;

  const thrustToWeightRatio =
    weightNewtons > 0
      ? Math.round((totalThrustNewtons / weightNewtons) * 100) / 100
      : 0;

  // Hover throttle: fraction of total thrust needed to offset weight
  const hoverThrottleEstimate =
    totalThrustNewtons > 0
      ? Math.min(1.0, Math.max(0.15, Math.round((weightNewtons / totalThrustNewtons) * 100) / 100))
      : 0.5;

  // Estimated flight time in minutes
  // Battery usable capacity: ~80% depth of discharge
  const batteryCapacityMah = battery?.capacityMah ?? 5000;
  const nominalVoltage = (battery?.cellCount ?? 4) * 3.7;
  const energyWh = (nominalVoltage * batteryCapacityMah) / 1000;

  // Hover power consumption estimate: ~140 W per kg of all-up weight
  const hoverPowerWatts = massProps.totalMassKg * 145;
  const estimatedFlightTimeMinutes =
    hoverPowerWatts > 0
      ? Math.round(((energyWh * 0.82) / hoverPowerWatts) * 60 * 10) / 10
      : 15;

  // Maximum speeds
  const maxHorizontalSpeedMs = Math.round(10 + (thrustToWeightRatio - 1) * 6);
  const maxAscentSpeedMs = Math.round(Math.min(8.5, Math.max(2.0, (thrustToWeightRatio - 1) * 5)));
  const maxDescentSpeedMs = 3.5;
  const maxTiltAngleDeg = Math.min(42, Math.max(15, Math.round(20 + (thrustToWeightRatio - 1) * 10)));

  return {
    maxHorizontalSpeedMs,
    maxAscentSpeedMs,
    maxDescentSpeedMs,
    maxTiltAngleDeg,
    hoverThrottleEstimate,
    estimatedFlightTimeMinutes,
    maxOperatingAltitudeM: 1200,
    thrustToWeightRatio,
    totalThrustNewtons,
  };
}
