// ==========================================================
// DRONE PILOT — TYPED DRONE CONFIGURATIONS
// Modular definitions for Quadcopter, Hexacopter, Octacopter
// All values clearly marked as SIMULATION / PROTOTYPE PARAMETERS
// ==========================================================

import { DroneDefinition } from "./types";

// ==========================================================
// 1. QUADCOPTER — CLASS 4A TACTICAL ENTERPRISE (PRIMARY)
// ==========================================================
export const QUADCOPTER_DEFINITION: DroneDefinition = {
  id: "quadcopter",
  name: "QUADCOPTER (Class 4A)",
  type: "quadcopter",

  // SIMULATION / PROTOTYPE PARAMETERS
  mass: 1.85, // kg
  motorCount: 4,
  motors: [
    { id: 0, position: { x: 0.48, y: 0, z: 0.48 }, direction: 1, thrustFactor: 1.0 },   // Front-Right (CW)
    { id: 1, position: { x: 0.48, y: 0, z: -0.48 }, direction: -1, thrustFactor: 1.0 },  // Rear-Right (CCW)
    { id: 2, position: { x: -0.48, y: 0, z: -0.48 }, direction: 1, thrustFactor: 1.0 }, // Rear-Left (CW)
    { id: 3, position: { x: -0.48, y: 0, z: 0.48 }, direction: -1, thrustFactor: 1.0 },  // Front-Left (CCW)
  ],
  maximumThrust: 38.0, // Newtons total collective (~2.1 Thrust-to-Weight ratio)
  batteryCapacity: 5000, // mAh
  batteryDischargeRate: 2.5, // ~2.5% per minute hovering (approx. 20-25 min flight)
  dimensions: {
    length: 0.58,
    width: 0.58,
    height: 0.26,
  },
  payloadCapacity: 0.8, // kg
  inertia: {
    pitch: 0.024,
    roll: 0.024,
    yaw: 0.042,
  },
  drag: {
    linear: 0.48, // Air drag dampener
    angular: 3.2, // Angular stability dampener
  },
  maxTiltAngle: 0.48, // ~27 degrees max pitch/roll in assisted mode
  maxAscentSpeed: 6.0, // m/s
  maxDescentSpeed: 4.0, // m/s
  maxForwardSpeed: 16.0, // m/s (~58 km/h)
};

// ==========================================================
// 2. HEXACOPTER — CLASS 6B MEDIUM-DUTY RADIAL (EXTENSIBLE)
// ==========================================================
export const HEXACOPTER_DEFINITION: DroneDefinition = {
  id: "hexacopter",
  name: "HEXACOPTER (Class 6B)",
  type: "hexacopter",

  // SIMULATION / PROTOTYPE PARAMETERS
  mass: 3.4, // kg
  motorCount: 6,
  motors: [0, 1, 2, 3, 4, 5].map((idx) => {
    const angle = (idx * Math.PI) / 3;
    const r = 0.55;
    return {
      id: idx,
      position: { x: Math.cos(angle) * r, y: 0, z: Math.sin(angle) * r },
      direction: idx % 2 === 0 ? 1 : -1,
      thrustFactor: 1.0,
    };
  }),
  maximumThrust: 68.0, // Newtons
  batteryCapacity: 9000, // mAh
  batteryDischargeRate: 3.0,
  dimensions: {
    length: 0.72,
    width: 0.72,
    height: 0.30,
  },
  payloadCapacity: 2.2, // kg
  inertia: {
    pitch: 0.052,
    roll: 0.052,
    yaw: 0.088,
  },
  drag: {
    linear: 0.62,
    angular: 4.0,
  },
  maxTiltAngle: 0.42,
  maxAscentSpeed: 5.5,
  maxDescentSpeed: 3.5,
  maxForwardSpeed: 14.0,
};

// ==========================================================
// 3. OCTACOPTER — CLASS 8C HEAVY INDUSTRIAL (EXTENSIBLE)
// ==========================================================
export const OCTACOPTER_DEFINITION: DroneDefinition = {
  id: "octacopter",
  name: "OCTACOPTER (Class 8C)",
  type: "octacopter",

  // SIMULATION / PROTOTYPE PARAMETERS
  mass: 6.2, // kg
  motorCount: 8,
  motors: [0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
    const angle = (idx * Math.PI) / 4;
    const r = 0.65;
    return {
      id: idx,
      position: { x: Math.cos(angle) * r, y: 0, z: Math.sin(angle) * r },
      direction: idx % 2 === 0 ? 1 : -1,
      thrustFactor: 1.0,
    };
  }),
  maximumThrust: 125.0, // Newtons
  batteryCapacity: 16000, // mAh
  batteryDischargeRate: 4.0,
  dimensions: {
    length: 0.90,
    width: 0.90,
    height: 0.36,
  },
  payloadCapacity: 5.5, // kg
  inertia: {
    pitch: 0.11,
    roll: 0.11,
    yaw: 0.19,
  },
  drag: {
    linear: 0.85,
    angular: 5.2,
  },
  maxTiltAngle: 0.35,
  maxAscentSpeed: 5.0,
  maxDescentSpeed: 3.0,
  maxForwardSpeed: 12.0,
};

export function getDroneDefinition(type: string): DroneDefinition {
  switch (type.toLowerCase()) {
    case "hexacopter":
      return HEXACOPTER_DEFINITION;
    case "octacopter":
      return OCTACOPTER_DEFINITION;
    case "quadcopter":
    default:
      return QUADCOPTER_DEFINITION;
  }
}
