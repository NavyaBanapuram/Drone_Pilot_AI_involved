// ==========================================================
// DRONE PILOT — CANONICAL SIMULATION CLOCK (PHASE 7)
// Enforces strict decoupling between Real Time, Simulation Time,
// Render Time, and Telemetry Time via Fixed-Timestep Accumulator.
// ==========================================================

export type SimulationLifecycleState =
  | "INITIALIZING"
  | "READY"
  | "RUNNING"
  | "PAUSED"
  | "RESETTING"
  | "COMPLETED"
  | "ERROR";

export interface ClockSnapshot {
  realTimeMs: number;
  simTimeSeconds: number;
  renderFrameCount: number;
  physicsTickCount: number;
  timeScale: number;
  state: SimulationLifecycleState;
  fixedDt: number;
}

export class SimulationClock {
  public fixedDt: number; // e.g. 1/60 = 0.016667s
  public maxSubSteps: number; // Cap to prevent "spiral of death" during frame drops
  public timeScale: number = 1.0;
  public state: SimulationLifecycleState = "READY";

  // Temporal counters
  private simTimeSeconds: number = 0.0;
  private realStartTimeMs: number = 0.0;
  private lastRealTimeMs: number = 0.0;
  private accumulator: number = 0.0;

  // Frame and tick counters
  private renderFrameCount: number = 0;
  private physicsTickCount: number = 0;

  constructor(fixedDt = 1 / 60, maxSubSteps = 4) {
    this.fixedDt = fixedDt;
    this.maxSubSteps = maxSubSteps;
    this.reset();
  }

  public start(): void {
    if (this.state === "READY" || this.state === "PAUSED") {
      this.state = "RUNNING";
      this.lastRealTimeMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    }
  }

  public pause(): void {
    if (this.state === "RUNNING") {
      this.state = "PAUSED";
    }
  }

  public resume(): void {
    if (this.state === "PAUSED") {
      this.state = "RUNNING";
      this.lastRealTimeMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    }
  }

  public reset(): void {
    this.simTimeSeconds = 0.0;
    this.accumulator = 0.0;
    this.renderFrameCount = 0;
    this.physicsTickCount = 0;
    this.realStartTimeMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.lastRealTimeMs = this.realStartTimeMs;
    this.state = "READY";
  }

  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.0, Math.min(4.0, scale));
  }

  /**
   * Called once per render animation frame (e.g. from requestAnimationFrame).
   * Advances the simulation accumulator and executes fixed-dt sub-steps.
   *
   * @param stepCallback Callback invoked for every fixed physics timestep
   * @returns Interpolation alpha [0, 1] between physics states for rendering
   */
  public tick(stepCallback: (fixedDt: number, simTime: number) => void): number {
    this.renderFrameCount++;

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const realDtSeconds = Math.min((now - this.lastRealTimeMs) / 1000.0, 0.1); // Clamp max delta
    this.lastRealTimeMs = now;

    if (this.state !== "RUNNING" || this.timeScale <= 0) {
      return 0.0;
    }

    this.accumulator += realDtSeconds * this.timeScale;

    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < this.maxSubSteps) {
      this.simTimeSeconds += this.fixedDt;
      this.physicsTickCount++;
      stepCallback(this.fixedDt, this.simTimeSeconds);
      this.accumulator -= this.fixedDt;
      steps++;
    }

    // Discard any residual accumulator beyond maxSubSteps to avoid simulation lock
    if (steps >= this.maxSubSteps) {
      this.accumulator = 0.0;
    }

    // Alpha for rendering interpolation between physics ticks
    return this.accumulator / this.fixedDt;
  }

  public getSimTime(): number {
    return this.simTimeSeconds;
  }

  public getRealElapsedSeconds(): number {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    return (now - this.realStartTimeMs) / 1000.0;
  }

  public getPhysicsTickCount(): number {
    return this.physicsTickCount;
  }

  public getRenderFrameCount(): number {
    return this.renderFrameCount;
  }

  public getSnapshot(): ClockSnapshot {
    return {
      realTimeMs: typeof performance !== "undefined" ? performance.now() : Date.now(),
      simTimeSeconds: this.simTimeSeconds,
      renderFrameCount: this.renderFrameCount,
      physicsTickCount: this.physicsTickCount,
      timeScale: this.timeScale,
      state: this.state,
      fixedDt: this.fixedDt,
    };
  }
}
