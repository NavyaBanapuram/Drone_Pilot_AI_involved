// ==========================================================
// DRONE PILOT — MULTI-ROTOR MOTOR MIXER
// Translates collective throttle, pitch, roll, and yaw into
// normalized per-motor throttle commands [0.0 - 1.0].
// ==========================================================

import { DroneCategory, MotorDefinition } from "./types";

export interface MixerCommand {
  throttle: number; // [0.0 - 1.0]
  pitch: number;    // [-1.0 to 1.0]
  roll: number;     // [-1.0 to 1.0]
  yaw: number;      // [-1.0 to 1.0]
}

export class MotorMixer {
  public static mix(
    command: MixerCommand,
    _category: DroneCategory,
    motors: MotorDefinition[]
  ): number[] {
    const count = motors.length;
    const outputs = new Array<number>(count).fill(0);
    const { throttle, pitch, roll, yaw } = command;

    if (throttle <= 0.01) {
      return outputs;
    }

    // Calculate differential offsets
    const diffs = new Array<number>(count).fill(0);
    let maxAbsDiff = 0;

    for (let i = 0; i < count; i++) {
      const m = motors[i];
      // Pitch: front motors decrease, rear motors increase
      const pitchWeight = m.position.z !== 0 ? -Math.sign(m.position.z) * 0.35 : 0;
      // Roll: right motors decrease, left motors increase
      const rollWeight = m.position.x !== 0 ? -Math.sign(m.position.x) * 0.35 : 0;
      // Yaw: reaction torque based on motor spin direction
      const yawWeight = m.direction * 0.20;

      const diff = (pitch * pitchWeight) + (roll * rollWeight) + (yaw * yawWeight);
      diffs[i] = diff;
      if (Math.abs(diff) > maxAbsDiff) maxAbsDiff = Math.abs(diff);
    }

    // Dynamic Headroom: preserve collective throttle priority
    // Scale differential offsets if they would clip beyond [0.05, 1.0]
    const maxHeadroom = Math.max(0.08, Math.min(throttle - 0.05, 1.0 - throttle));
    const scaleFactor = maxAbsDiff > maxHeadroom ? maxHeadroom / maxAbsDiff : 1.0;

    for (let i = 0; i < count; i++) {
      outputs[i] = Math.max(0, Math.min(1.0, throttle + diffs[i] * scaleFactor));
    }

    return outputs;
  }
}
