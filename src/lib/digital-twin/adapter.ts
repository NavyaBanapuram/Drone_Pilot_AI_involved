// ==========================================================
// DRONE PILOT — DIGITAL TWIN SIMULATOR ADAPTER (PHASE 4)
// Bridges Canonical Digital Twin to 3D Mesh & FlightPhysicsEngine
// ==========================================================

import {
  DroneDigitalTwinConfiguration,
  DroneDigitalTwinRuntimeState,
} from "@/types/drone-digital-twin";
import { DroneDefinition, TelemetryState } from "@/lib/simulation/types";

/**
 * Converts a canonical DroneDigitalTwinConfiguration to a DroneDefinition
 * compatible with ModularDrone 3D rendering and FlightPhysicsEngine.
 */
export function digitalTwinToDroneDefinition(
  dt: DroneDigitalTwinConfiguration
): DroneDefinition {
  const motorCount = dt.motors.length || dt.airframe.motorCount;

  // Map individual motor positions and rotational directions
  const motors = dt.motors.map((m, idx) => ({
    id: idx,
    position: {
      x: m.position.x,
      y: m.position.y || 0.12,
      z: m.position.z,
    },
    direction: m.direction,
    thrustFactor: dt.propeller.thrustFactor || 1.0,
  }));

  // Convert tilt degrees to radians for physics engine
  const maxTiltAngleRad = ((dt.performance.maxTiltAngleDeg || 28) * Math.PI) / 180;

  return {
    id: dt.identity.id,
    name: dt.identity.name,
    type: dt.identity.category,
    mass: dt.massProperties.dryMassKg + dt.massProperties.batteryMassKg,
    motorCount,
    motors,
    maximumThrust: dt.performance.totalThrustNewtons,
    batteryCapacity: dt.battery.capacityMah,
    batteryDischargeRate: dt.battery.maxContinuousDischargeC ? dt.battery.maxContinuousDischargeC / 10 : 2.5,
    batteryCells: dt.battery.cellCount,
    dimensions: {
      length: dt.airframe.dimensions.lengthM,
      width: dt.airframe.dimensions.widthM,
      height: dt.airframe.dimensions.heightM,
    },
    payloadCapacity: dt.airframe.maxPayloadKg,
    inertia: {
      pitch: dt.massProperties.estimatedInertiaKgM2.pitch,
      roll: dt.massProperties.estimatedInertiaKgM2.roll,
      yaw: dt.massProperties.estimatedInertiaKgM2.yaw,
    },
    drag: {
      linear: 0.48 + (motorCount - 4) * 0.12,
      angular: 3.2 + (motorCount - 4) * 0.8,
    },
    maxTiltAngle: maxTiltAngleRad,
    maxAscentSpeed: dt.performance.maxAscentSpeedMs,
    maxDescentSpeed: dt.performance.maxDescentSpeedMs,
    maxForwardSpeed: dt.performance.maxHorizontalSpeedMs,
    batteryInternalResistanceMilliOhm: dt.battery.internalResistanceMilliOhm,
    altitudeHoldPGain: dt.flightController.altitudeHoldPGain,
    altitudeHoldDGain: dt.flightController.altitudeHoldDGain,
  };
}

/**
 * Constructs a rich runtime state snapshot from active telemetry and configuration.
 */
export function buildRuntimeStateFromTelemetry(
  dt: DroneDigitalTwinConfiguration,
  telemetry: TelemetryState,
  motorOutputs?: number[]
): DroneDigitalTwinRuntimeState {
  const outputs = motorOutputs || telemetry.motorOutputs || [0, 0, 0, 0];
  const maxRpm = dt.motors[0]?.maxRpm || 12000;

  // 1. Live motor telemetry
  const motors = dt.motors.map((m, idx) => {
    const fallbackThrottle = (telemetry.rotorRpmPercent || 0) / 100;
    const throttle = outputs[idx] !== undefined ? outputs[idx] : fallbackThrottle;
    const currentRpm = Math.round(throttle * maxRpm);
    const commandedRpm = Math.round(throttle * maxRpm);
    const thrustNewtons = Math.round(((currentRpm / maxRpm) ** 2) * (dt.performance.totalThrustNewtons / dt.motors.length) * 10) / 10;
    const currentAmps = Math.round(throttle * (m.maxPowerWatts / dt.battery.nominalVoltageV) * 10) / 10;

    return {
      motorId: m.motorId,
      currentRpm,
      commandedRpm,
      throttlePercent: Math.round(throttle * 100),
      thrustNewtons,
      currentAmps,
      temperatureC: Math.round(24 + throttle * 28),
    };
  });

  // 2. Live battery telemetry
  const batteryVoltage = telemetry.batteryVoltage ?? dt.battery.nominalVoltageV;
  const batteryAmps = telemetry.batteryCurrentAmps ?? motors.reduce((sum, m) => sum + m.currentAmps, 0);
  const batteryPowerWatts = Math.round(batteryVoltage * batteryAmps);

  const battery = {
    socPercent: Math.round(telemetry.batteryLevel),
    voltageV: Math.round(batteryVoltage * 10) / 10,
    currentAmps: Math.round(batteryAmps * 10) / 10,
    powerWatts: batteryPowerWatts,
    temperatureC: 31,
    remainingCapacityMah: Math.round((telemetry.batteryLevel / 100) * dt.battery.capacityMah),
    healthPercent: dt.battery.batteryHealthPercent,
  };

  // 3. Live sensors
  const sensors = dt.sensors.map((s) => ({
    id: s.id,
    type: s.type,
    status: s.health,
    updateCount: Math.round(telemetry.flightTimeSeconds * s.updateRateHz),
    latestValue:
      s.type === "GPS"
        ? `${telemetry.position.x.toFixed(1)}m, ${telemetry.position.z.toFixed(1)}m`
        : s.type === "BAROMETER"
        ? `${telemetry.altitude.toFixed(1)}m AGL`
        : s.type === "COMPASS"
        ? `${Math.round(telemetry.heading)}°`
        : "Operational",
  }));

  return {
    motors,
    battery,
    sensors,
    kinematics: {
      positionMsl: telemetry.position,
      altitudeAglM: telemetry.altitude,
      groundSpeedKmh: telemetry.groundSpeed,
      verticalSpeedMs: telemetry.verticalSpeed,
      headingDeg: telemetry.heading,
      pitchDeg: Math.round(((telemetry.rotation.pitch * 180) / Math.PI) * 10) / 10,
      rollDeg: Math.round(((telemetry.rotation.roll * 180) / Math.PI) * 10) / 10,
      yawDeg: Math.round(((telemetry.rotation.yaw * 180) / Math.PI) * 10) / 10,
    },
    totalThrustNewtons: motors.reduce((sum, m) => sum + m.thrustNewtons, 0),
    totalMassKg: dt.massProperties.totalMassKg,
    flightMode: telemetry.flightMode,
    isArmed: telemetry.isArmed,
    flightTimeSeconds: telemetry.flightTimeSeconds,
  };
}
