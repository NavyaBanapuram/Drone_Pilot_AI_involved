// ==========================================================
// DRONE PILOT — NORMALIZED CONTROL INTERFACE (PHASE 7)
// Hardware-Agnostic Pilot & Autonomous Control Abstraction
// Bridges Keyboard, Touch, Gamepad/RC, WebHID, and SITL/PX4 to Physics
// ==========================================================

import { FlightInput, FlightMode } from "./types";

export interface NormalizedControlInput {
  // Primary 4 flight channels normalized to [-1.0, 1.0] (throttle: [-1.0, 1.0] or [0.0, 1.0])
  throttle: number;
  pitch: number;
  roll: number;
  yaw: number;

  // Discrete flight switch & system states
  isArmed: boolean;
  flightMode: FlightMode;
  hoverHold: boolean;
  autoLand: boolean;

  // Auxiliary channels for camera gimbal, payload releases, sirens
  aux1: number; // e.g. Camera gimbal pitch [-1.0, 1.0]
  aux2: number; // e.g. Payload drop / sprayer trigger [0.0, 1.0]

  // Reset & Emergency triggers
  reset: boolean;
  cameraToggle: boolean;
}

export const DEFAULT_NORMALIZED_CONTROL: NormalizedControlInput = {
  throttle: 0.0,
  pitch: 0.0,
  roll: 0.0,
  yaw: 0.0,
  isArmed: false,
  flightMode: "HOVER",
  hoverHold: true,
  autoLand: false,
  aux1: 0.0,
  aux2: 0.0,
  reset: false,
  cameraToggle: false,
};

/**
 * Translates NormalizedControlInput into the internal FlightInput expected by FlightPhysicsEngine.
 */
export function normalizedToFlightInput(norm: NormalizedControlInput): FlightInput {
  return {
    throttle: Math.max(-1.0, Math.min(1.0, norm.throttle)),
    pitch: Math.max(-1.0, Math.min(1.0, norm.pitch)),
    roll: Math.max(-1.0, Math.min(1.0, norm.roll)),
    yaw: Math.max(-1.0, Math.min(1.0, norm.yaw)),
    hoverHold: norm.hoverHold,
    reset: norm.reset,
    cameraToggle: norm.cameraToggle,
  };
}

/**
 * Translates an existing FlightInput into NormalizedControlInput.
 */
export function flightInputToNormalized(input: FlightInput, isArmed = true, flightMode: FlightMode = "HOVER"): NormalizedControlInput {
  return {
    throttle: input.throttle,
    pitch: input.pitch,
    roll: input.roll,
    yaw: input.yaw,
    isArmed,
    flightMode,
    hoverHold: input.hoverHold,
    autoLand: false,
    aux1: 0.0,
    aux2: 0.0,
    reset: input.reset,
    cameraToggle: input.cameraToggle,
  };
}
