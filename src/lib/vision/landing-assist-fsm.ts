// ==========================================================
// DRONE PILOT — GUARDED PRECISION LANDING ASSIST FSM (PHASE E)
// Deterministic Finite State Machine with conservative safety clamps,
// target-loss timeout handling, sign-verified axis mapping, and
// authoritative manual pilot override. Zero physics engine changes.
// ==========================================================

import { FlightInput, TelemetryState } from "../simulation/types";
import { VisionDetectionResult } from "./browser-inference";

export type LandingAssistState =
  | "DISABLED"
  | "SEARCHING"
  | "TARGET_ACQUIRED"
  | "ALIGNING"
  | "DESCENDING"
  | "TOUCHDOWN_VERIFY"
  | "ABORT_OR_GO_AROUND"
  | "COMPLETE";

export interface LandingAssistStatus {
  state: LandingAssistState;
  isActive: boolean;
  confidence: number;
  centerErrorNorm: { du: number; dv: number };
  targetLossTimerSeconds: number;
  altitudeAglMeters: number;
  lastCommand: { pitch: number; roll: number; throttle: number };
  abortReason: string | null;
  captureTimestampMs?: number;
  completionTimestampMs?: number;
  imageAgeMs?: number;
  timeSinceLastDetectionMs?: number;
}

export class LandingAssistController {
  private state: LandingAssistState = "DISABLED";
  private isEnabled = false;

  // Timers and counters
  private acquisitionDurationSeconds = 0;
  private targetLossSeconds = 0;
  private abortTimerSeconds = 0;
  private abortReason: string | null = null;

  // Frame sequence and freshness tracking
  private lastAcceptedCaptureTimestampMs = 0;
  private lastAcceptedCompletionTimestampMs = 0;
  private lastSuccessfulDetectionTimeMs = 0;

  // Conservative safety thresholds
  private readonly MIN_CONFIDENCE_ACQUIRE = 0.65;
  private readonly MIN_CONFIDENCE_TRACK = 0.45;
  private readonly TARGET_LOSS_TIMEOUT = 0.8; // Abort after 800ms of lost detection
  private readonly ALIGNMENT_THRESHOLD_NORM = 0.06; // Within 6% of optical center
  private readonly MAX_TILT_COMMAND = 0.15; // Max pitch/roll authority (~5-6 degrees)
  private readonly DESCENT_RATE_TARGET = -0.55; // Gentle -0.55 m/s sink rate
  private readonly TOUCHDOWN_ALTITUDE_THRESHOLD = 0.15; // 15 cm above surface

  /**
   * Maximum acceptable detection age in milliseconds before frame is treated as stale.
   * At 10 Hz nominal inference (100ms interval), 350ms tolerates minor latency jitter
   * but rejects frozen rendering or dropped inference pipelines.
   */
  public static readonly MAX_DETECTION_AGE_MS = 350;

  private lastCommand = { pitch: 0, roll: 0, throttle: 0 };

  /**
   * Pilot toggles Landing Assist mode on/off.
   */
  public setEnabled(enabled: boolean): void {
    if (this.isEnabled === enabled) return;
    this.isEnabled = enabled;

    if (enabled) {
      this.state = "SEARCHING";
      this.targetLossSeconds = 0;
      this.acquisitionDurationSeconds = 0;
      this.abortReason = null;
      this.lastAcceptedCaptureTimestampMs = 0;
      this.lastAcceptedCompletionTimestampMs = 0;
      this.lastSuccessfulDetectionTimeMs = 0;
    } else {
      this.state = "DISABLED";
      this.abortReason = null;
      this.lastCommand = { pitch: 0, roll: 0, throttle: 0 };
      this.lastAcceptedCaptureTimestampMs = 0;
      this.lastAcceptedCompletionTimestampMs = 0;
      this.lastSuccessfulDetectionTimeMs = 0;
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public getLastAcceptedCaptureTimestampMs(): number {
    return this.lastAcceptedCaptureTimestampMs;
  }

  public getLastAcceptedCompletionTimestampMs(): number {
    return this.lastAcceptedCompletionTimestampMs;
  }

  public getTimeSinceLastSuccessfulDetectionMs(currentTimestampMs?: number): number {
    if (this.lastSuccessfulDetectionTimeMs === 0) return Infinity;
    const now = currentTimestampMs ?? Date.now();
    return Math.max(0, now - this.lastSuccessfulDetectionTimeMs);
  }

  public getStatus(telemetry: TelemetryState, detection: VisionDetectionResult): LandingAssistStatus {
    const du = detection.isDetected ? detection.center.u - 0.5 : 0;
    const dv = detection.isDetected ? detection.center.v - 0.5 : 0;
    const nowMs = Date.now();
    const captureTimestamp = detection?.captureTimestampMs;
    const imageAgeMs = captureTimestamp && Number.isFinite(captureTimestamp)
      ? Math.max(0, nowMs - captureTimestamp)
      : undefined;
    const timeSinceLastDetectionMs = this.lastSuccessfulDetectionTimeMs > 0
      ? Math.max(0, nowMs - this.lastSuccessfulDetectionTimeMs)
      : undefined;

    return {
      state: this.state,
      isActive: this.state !== "DISABLED" && this.state !== "COMPLETE",
      confidence: detection.confidence,
      centerErrorNorm: { du, dv },
      targetLossTimerSeconds: this.targetLossSeconds,
      altitudeAglMeters: telemetry.altitude,
      lastCommand: { ...this.lastCommand },
      abortReason: this.abortReason,
      captureTimestampMs: captureTimestamp,
      completionTimestampMs: detection?.timestampMs,
      imageAgeMs,
      timeSinceLastDetectionMs,
    };
  }

  /**
   * Evaluates FSM state transitions and generates blended guidance inputs.
   * MANUAL INPUT IS AUTHORITATIVE: If the pilot commands manual pitch/roll/throttle,
   * the assist system yields control immediately.
   */
  public step(
    rawInput: FlightInput,
    telemetry: TelemetryState,
    detection: VisionDetectionResult,
    dt: number,
    currentTimestampMs?: number
  ): FlightInput {
    // 1. If assist is disabled or mission complete, return unaltered pilot input
    if (!this.isEnabled || this.state === "DISABLED" || this.state === "COMPLETE") {
      this.lastCommand = { pitch: 0, roll: 0, throttle: 0 };
      return { ...rawInput };
    }

    // 2. Telemetry and input sanity validation: reject non-finite inputs
    if (
      !telemetry ||
      !Number.isFinite(telemetry.altitude) ||
      !Number.isFinite(telemetry.velocity?.y) ||
      !Number.isFinite(dt) ||
      dt <= 0
    ) {
      this.lastCommand = { pitch: 0, roll: 0, throttle: 0 };
      return { ...rawInput };
    }

    // 3. Authoritative manual pilot override
    // If pilot applies stick inputs, immediately disable AI assistance and yield to manual control
    const isManualIntervention =
      Math.abs(rawInput.pitch) > 0.12 ||
      Math.abs(rawInput.roll) > 0.12 ||
      Math.abs(rawInput.yaw || 0) > 0.12 ||
      Math.abs(rawInput.throttle) > 0.15 ||
      rawInput.reset;

    if (isManualIntervention) {
      this.abortReason = "Manual pilot stick override detected";
      this.setEnabled(false);
      this.state = "DISABLED";
      this.lastCommand = { pitch: 0, roll: 0, throttle: 0 };
      this.targetLossSeconds = 0;
      this.acquisitionDurationSeconds = 0;
      this.abortTimerSeconds = 0;
      return { ...rawInput };
    }

    // 4. Strict Detection Validation & Freshness Watchdog
    const nowMs = currentTimestampMs ?? Date.now();
    const captureMs = detection?.captureTimestampMs;
    const completionMs = detection?.timestampMs;

    // Detection timestamps sanity check:
    // 1. Both capture and completion timestamps must be defined, positive, finite numbers
    // 2. Capture must occur before or at completion (captureMs <= completionMs)
    // 3. Capture cannot be in the future relative to the decision clock (captureMs <= nowMs)
    const hasValidTimestamps = Boolean(
      detection &&
      captureMs !== undefined &&
      Number.isFinite(captureMs) &&
      captureMs > 0 &&
      completionMs !== undefined &&
      Number.isFinite(completionMs) &&
      completionMs > 0 &&
      captureMs <= completionMs &&
      captureMs <= nowMs
    );

    const isDetectionStructureValid = Boolean(
      detection &&
      hasValidTimestamps &&
      detection.status !== "INVALID" &&
      detection.status !== "ERROR" &&
      Number.isFinite(detection.confidence) &&
      detection.confidence >= 0 &&
      detection.confidence <= 1 &&
      detection.center &&
      Number.isFinite(detection.center.u) &&
      Number.isFinite(detection.center.v) &&
      detection.center.u >= 0 &&
      detection.center.u <= 1 &&
      detection.center.v >= 0 &&
      detection.center.v <= 1 &&
      detection.bbox &&
      Number.isFinite(detection.bbox.xMin) &&
      Number.isFinite(detection.bbox.yMin) &&
      Number.isFinite(detection.bbox.xMax) &&
      Number.isFinite(detection.bbox.yMax) &&
      detection.bbox.xMin >= 0 &&
      detection.bbox.yMin >= 0 &&
      detection.bbox.xMax <= 1 &&
      detection.bbox.yMax <= 1 &&
      detection.bbox.xMin < detection.bbox.xMax &&
      detection.bbox.yMin < detection.bbox.yMax
    );

    // Image age is strictly measured from original image capture timestamp to decision clock (nowMs)
    const imageAgeMs = hasValidTimestamps ? Math.max(0, nowMs - captureMs!) : Infinity;
    const isFresh = Number.isFinite(imageAgeMs) && imageAgeMs <= LandingAssistController.MAX_DETECTION_AGE_MS;

    // Sequence integrity check: new capture must not be older than the last accepted capture
    const isSequenceValid = Boolean(hasValidTimestamps && captureMs! >= this.lastAcceptedCaptureTimestampMs);

    const isValidAndFresh = Boolean(
      isDetectionStructureValid &&
      isFresh &&
      isSequenceValid &&
      detection.isDetected
    );

    // If accepted as valid and fresh detection, update accepted timestamps
    if (isValidAndFresh) {
      if (captureMs! > this.lastAcceptedCaptureTimestampMs || this.lastAcceptedCaptureTimestampMs === 0) {
        this.lastAcceptedCaptureTimestampMs = captureMs!;
        this.lastAcceptedCompletionTimestampMs = completionMs!;
        this.lastSuccessfulDetectionTimeMs = completionMs!;
      }
    }

    // 5. Update target loss tracking
    if (!isValidAndFresh || detection.confidence < this.MIN_CONFIDENCE_TRACK) {
      this.targetLossSeconds += dt;
      if (
        (this.state === "ALIGNING" || this.state === "DESCENDING") &&
        this.targetLossSeconds > this.TARGET_LOSS_TIMEOUT
      ) {
        if (!hasValidTimestamps) {
          this.abortReason = "Invalid, missing, or inconsistent detection timestamps";
        } else if (!isFresh) {
          this.abortReason = `Inference stale (capture age ${Math.round(imageAgeMs)}ms > ${LandingAssistController.MAX_DETECTION_AGE_MS}ms)`;
        } else if (!isSequenceValid) {
          this.abortReason = "Out-of-order late inference detection rejected";
        } else if (!isDetectionStructureValid) {
          this.abortReason = `Invalid inference detection (${detection?.invalidReason || "malformed"})`;
        } else {
          this.abortReason = "Target lost for > 0.8s during terminal guidance";
        }
        this.transitionTo("ABORT_OR_GO_AROUND");
      }
    } else {
      this.targetLossSeconds = 0;
    }

    // 6. State Machine Transitions & Guidance Command Calculation
    const effectiveInput: FlightInput = { ...rawInput };
    const altAgl = telemetry.altitude;

    // Compute aircraft body velocities for PD damping
    const yaw = telemetry.rotation?.yaw || 0;
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    const vx = telemetry.velocity?.x || 0;
    const vz = telemetry.velocity?.z || 0;
    const vForward = vx * forwardX + vz * forwardZ;
    const vRight = vx * rightX + vz * rightZ;

    switch (this.state) {
      case "SEARCHING": {
        if (isValidAndFresh && detection.confidence >= this.MIN_CONFIDENCE_ACQUIRE) {
          this.acquisitionDurationSeconds += dt;
          if (this.acquisitionDurationSeconds >= 0.25) {
            this.transitionTo("TARGET_ACQUIRED");
          }
        } else {
          this.acquisitionDurationSeconds = 0;
        }
        // Hover in place while searching
        effectiveInput.hoverHold = true;
        effectiveInput.pitch = 0;
        effectiveInput.roll = 0;
        effectiveInput.throttle = 0;
        break;
      }

      case "TARGET_ACQUIRED": {
        if (!isValidAndFresh) {
          this.transitionTo("SEARCHING");
          break;
        }
        const du = Math.abs(detection.center.u - 0.5);
        const dv = Math.abs(detection.center.v - 0.5);
        const speed = Math.hypot(vx, vz);

        if (du < this.ALIGNMENT_THRESHOLD_NORM && dv < this.ALIGNMENT_THRESHOLD_NORM && speed < 0.35) {
          this.transitionTo("DESCENDING");
        } else {
          this.transitionTo("ALIGNING");
        }
        effectiveInput.hoverHold = true;
        effectiveInput.throttle = 0;
        break;
      }

      case "ALIGNING": {
        if (!isValidAndFresh) {
          // If target is temporarily lost or stale during alignment, hold level hover
          effectiveInput.roll = 0;
          effectiveInput.pitch = 0;
          effectiveInput.hoverHold = true;
          effectiveInput.throttle = 0;
          break;
        }

        const errorU = detection.center.u - 0.5; // [-0.5, +0.5] (right is positive)
        const errorV = detection.center.v - 0.5; // [-0.5, +0.5] (backward is positive)

        // Proportional-Derivative (PD) Guidance: P on vision error, D on body velocity
        // Coordinate convention: pitch < 0 is forward, pitch > 0 is backward; roll > 0 is right, roll < 0 is left
        const kP = 1.6;
        const kD = 0.22;
        const cmdRoll = Math.max(-this.MAX_TILT_COMMAND, Math.min(this.MAX_TILT_COMMAND, errorU * kP - vRight * kD));
        const cmdPitch = Math.max(-this.MAX_TILT_COMMAND, Math.min(this.MAX_TILT_COMMAND, errorV * kP + vForward * kD));

        effectiveInput.roll = cmdRoll;
        effectiveInput.pitch = cmdPitch;
        effectiveInput.hoverHold = true;
        effectiveInput.throttle = 0; // Hold altitude while aligning

        const du = Math.abs(errorU);
        const dv = Math.abs(errorV);
        const speed = Math.hypot(vx, vz);

        if (du < this.ALIGNMENT_THRESHOLD_NORM && dv < this.ALIGNMENT_THRESHOLD_NORM && speed < 0.35) {
          this.transitionTo("DESCENDING");
        }
        break;
      }

      case "DESCENDING": {
        if (!isValidAndFresh) {
          // SAFETY CRITICAL: If target is lost or stale, immediately halt descent!
          effectiveInput.roll = 0;
          effectiveInput.pitch = 0;
          effectiveInput.hoverHold = true;
          effectiveInput.throttle = 0; // Cancel descent bias while lost
          break;
        }

        const errorU = detection.center.u - 0.5;
        const errorV = detection.center.v - 0.5;
        const du = Math.abs(errorU);
        const dv = Math.abs(errorV);

        // Maintain centering while descending with gentle PD damping
        const kP = 1.4;
        const kD = 0.20;
        effectiveInput.roll = Math.max(-this.MAX_TILT_COMMAND, Math.min(this.MAX_TILT_COMMAND, errorU * kP - vRight * kD));
        effectiveInput.pitch = Math.max(-this.MAX_TILT_COMMAND, Math.min(this.MAX_TILT_COMMAND, errorV * kP + vForward * kD));

        effectiveInput.hoverHold = true;
        // If horizontal error drifts during descent, pause descent to re-center
        if (du > 0.12 || dv > 0.12) {
          effectiveInput.throttle = 0;
        } else {
          // Staged descent profile: -1.2 m/s above 3.0m AGL, flaring to -0.55 m/s below 3.0m
          const targetVelY = altAgl > 3.0 ? -1.2 : this.DESCENT_RATE_TARGET;
          const curVelY = Number.isFinite(telemetry.velocity?.y) ? telemetry.velocity.y : 0;
          const velError = targetVelY - curVelY;
          const throttleCmd = -0.08 + velError * 0.15;
          effectiveInput.throttle = Math.max(-0.28, Math.min(-0.02, throttleCmd));
        }

        if (altAgl <= this.TOUCHDOWN_ALTITUDE_THRESHOLD) {
          this.transitionTo("TOUCHDOWN_VERIFY");
        }
        break;
      }

      case "TOUCHDOWN_VERIFY": {
        // Level aircraft and throttle to idle / gentle firm contact through ground effect
        effectiveInput.pitch = 0;
        effectiveInput.roll = 0;
        effectiveInput.throttle = -0.25; // Overcome ground effect cushion for firm contact

        // Check if physics engine confirms resting on surface
        if (Math.abs(telemetry.velocity.y) < 0.15 && altAgl <= 0.05) {
          this.transitionTo("COMPLETE");
        }
        break;
      }

      case "ABORT_OR_GO_AROUND": {
        this.abortTimerSeconds += dt;
        // Hold level hover and climb slightly for 2.0s
        effectiveInput.pitch = 0;
        effectiveInput.roll = 0;
        effectiveInput.hoverHold = true;
        effectiveInput.throttle = 0.15; // Safe gentle climb

        if (this.abortTimerSeconds > 2.0) {
          // Revert to stable hover hold and disengage
          effectiveInput.throttle = 0;
          this.setEnabled(false);
          this.state = "DISABLED";
        }
        break;
      }
    }

    // Safety validation on all output commands before returning
    effectiveInput.pitch = Number.isFinite(effectiveInput.pitch) ? effectiveInput.pitch : 0;
    effectiveInput.roll = Number.isFinite(effectiveInput.roll) ? effectiveInput.roll : 0;
    effectiveInput.throttle = Number.isFinite(effectiveInput.throttle) ? effectiveInput.throttle : 0;

    this.lastCommand = {
      pitch: effectiveInput.pitch,
      roll: effectiveInput.roll,
      throttle: effectiveInput.throttle,
    };

    return effectiveInput;
  }

  private transitionTo(newState: LandingAssistState): void {
    this.state = newState;
    if (newState === "ABORT_OR_GO_AROUND") {
      this.abortTimerSeconds = 0;
    }
  }

  public getState(): LandingAssistState {
    return this.state;
  }
}
