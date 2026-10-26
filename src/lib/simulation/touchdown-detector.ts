// ==========================================================
// DRONE PILOT — PRE-TOUCHDOWN SINK RATE & CONTACT DETECTOR
// Accurately measures aircraft vertical velocity and downward
// sink rate immediately prior to touchdown/contact, before
// collision or ground response clamps vertical velocity to zero.
// ==========================================================

export type TouchdownStatus =
  | "TOUCHDOWN_MEASURED"
  | "NO_TOUCHDOWN"
  | "ABORTED"
  | "NO_VALID_SAMPLE";

export interface PreTouchdownMetrics {
  status: TouchdownStatus;
  preContactVelocityYMs: number | null; // Coordinate convention: +Y is upward, -Y is downward (m/s)
  preContactSinkRateMs: number | null;  // Downward-positive sink rate (-velY) in m/s
  postContactVelocityYMs: number | null; // Velocity after contact clamp (m/s)
  commandedDescentRateMs: number;       // Configured descent setpoint (m/s)
  acceptanceThresholdMs: number;        // Configured threshold limit (m/s)
  touchdownTimeSeconds: number | null;  // Timestamp of contact event
  isWithinAcceptanceLimit: boolean | null; // true if measured sink rate <= acceptance threshold
  notes: string;
}

export interface PhysicsStateSnapshot {
  posY: number;
  velY: number;
  groundLevel: number;
  accelY?: number;
  isArmed?: boolean;
}


export class TouchdownDetector {
  private hasContactOccurred = false;
  private metrics: PreTouchdownMetrics;
  private readonly commandedDescentRateMs: number;
  private readonly acceptanceThresholdMs: number;

  constructor(commandedDescentRateMs = 0.55, acceptanceThresholdMs = 0.80) {
    this.commandedDescentRateMs = commandedDescentRateMs;
    this.acceptanceThresholdMs = acceptanceThresholdMs;
    this.metrics = {
      status: "NO_TOUCHDOWN",
      preContactVelocityYMs: null,
      preContactSinkRateMs: null,
      postContactVelocityYMs: null,
      commandedDescentRateMs,
      acceptanceThresholdMs,
      touchdownTimeSeconds: null,
      isWithinAcceptanceLimit: null,
      notes: "No ground contact detected",
    };
  }

  /**
   * Samples physics state immediately BEFORE the numerical physics step.
   * Must be called before physics.update(input, dt).
   */
  public beforeStep(physics: { posY: number; velY: number; groundLevel: number }): PhysicsStateSnapshot | null {
    if (this.hasContactOccurred) return null;
    return {
      posY: physics.posY,
      velY: physics.velY,
      groundLevel: physics.groundLevel,
    };
  }

  /**
   * Evaluates contact event immediately AFTER the physics step.
   * Must be called after physics.update(input, dt).
   * 
   * Captures the vertical velocity at the moment of impact immediately
   * before the ground clamp sets velocity to zero.
   */
  public afterStep(
    preState: PhysicsStateSnapshot | null,
    physics: { posY: number; velY: number; accelY?: number; groundLevel: number; crashState?: any },
    simTimeSeconds: number,
    dt: number
  ): boolean {
    if (this.hasContactOccurred || !preState) return false;

    // Contact threshold: drone was airborne in preState, and is now on or below groundLevel
    // (or ground collision clamped it to groundLevel).
    const wasAirborne = preState.posY > preState.groundLevel + 1e-5;
    const isNowOnOrBelowGround = physics.posY <= physics.groundLevel + 1e-5;
    const isCrashed = Boolean(physics.crashState?.isCrashed);

    if (wasAirborne && (isNowOnOrBelowGround || isCrashed)) {
      this.hasContactOccurred = true;

      // In discrete Euler integration, the unclamped velocity at impact before collision clamp is:
      // v_impact = v_pre + a_y * dt
      const accelY = (physics.accelY !== undefined && Number.isFinite(physics.accelY)) ? physics.accelY : 0;
      const unclampedVelY = preState.velY + accelY * dt;

      // Coordinate convention:
      // In DronePilot world coordinates, +Y is upward, -Y is downward.
      // Therefore, downward-positive sink rate is defined as -unclampedVelY.
      const sinkRate = -unclampedVelY;

      const isWithinLimit = sinkRate <= this.acceptanceThresholdMs && sinkRate >= -0.10;

      this.metrics = {
        status: "TOUCHDOWN_MEASURED",
        preContactVelocityYMs: Math.round(unclampedVelY * 1000) / 1000,
        preContactSinkRateMs: Math.round(sinkRate * 1000) / 1000,
        postContactVelocityYMs: Math.round(physics.velY * 1000) / 1000,
        commandedDescentRateMs: this.commandedDescentRateMs,
        acceptanceThresholdMs: this.acceptanceThresholdMs,
        touchdownTimeSeconds: Math.round(simTimeSeconds * 100) / 100,
        isWithinAcceptanceLimit: isWithinLimit,
        notes: isWithinLimit
          ? `Measured pre-touchdown sink rate of ${sinkRate.toFixed(2)} m/s is within the <= ${this.acceptanceThresholdMs.toFixed(2)} m/s acceptance threshold.`
          : `Measured pre-touchdown sink rate of ${sinkRate.toFixed(2)} m/s exceeds threshold (${this.acceptanceThresholdMs.toFixed(2)} m/s).`,
      };

      return true;
    }

    return false;
  }

  /**
   * Finalizes status if simulation terminated without touchdown.
   */
  public finalize(outcome: string, notes?: string): PreTouchdownMetrics {
    if (!this.hasContactOccurred) {
      let status: TouchdownStatus = "NO_VALID_SAMPLE";
      if (outcome === "SAFE_ABORT" || outcome === "SAFE_OVERRIDE") {
        status = "ABORTED";
      } else if (outcome === "SAFE_REJECTION" || outcome === "NO_TARGET") {
        status = "NO_TOUCHDOWN";
      }

      this.metrics = {
        ...this.metrics,
        status,
        preContactVelocityYMs: null,
        preContactSinkRateMs: null,
        postContactVelocityYMs: null,
        touchdownTimeSeconds: null,
        isWithinAcceptanceLimit: null,
        notes: notes || `No touchdown event: trial terminated with outcome ${outcome}.`,
      };
    }
    return this.getMetrics();
  }

  public getMetrics(): PreTouchdownMetrics {
    return { ...this.metrics };
  }

  public hasContact(): boolean {
    return this.hasContactOccurred;
  }
}
