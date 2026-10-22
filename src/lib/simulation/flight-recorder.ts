// ==========================================================
// DRONE PILOT — FLIGHT TELEMETRY RECORDER & REPLAY BUFFER
// Records frame-by-frame telemetry at 20Hz for post-flight
// replay, crash investigation, and trajectory debriefing.
// ==========================================================

import { ReplayFrame, TelemetryState, FlightLogEntry, FlightAnalysisReport, CrashState } from "./types";

export class FlightRecorder {
  private frames: ReplayFrame[] = [];
  private logEntries: FlightLogEntry[] = [];
  private maxFrames = 6000; // ~5 minutes of flight data at 20Hz
  private sampleTimer = 0;
  private sampleInterval = 0.05; // 20Hz sampling
  private maxAltitude = 0;
  private maxSpeedKmh = 0;
  private startBattery = 100;

  public reset() {
    this.frames = [];
    this.logEntries = [];
    this.sampleTimer = 0;
    this.maxAltitude = 0;
    this.maxSpeedKmh = 0;
    this.startBattery = 100;
  }

  public record(telemetry: TelemetryState, dt = 0.05, eventMarker?: string) {
    this.recordFrame(telemetry, dt, eventMarker);
  }

  public recordFrame(telemetry: TelemetryState, dt: number, eventMarker?: string) {
    if (this.frames.length === 0) {
      this.startBattery = telemetry.batteryLevel;
    }
    if (telemetry.altitude > this.maxAltitude) {
      this.maxAltitude = telemetry.altitude;
    }
    if (telemetry.groundSpeed > this.maxSpeedKmh) {
      this.maxSpeedKmh = telemetry.groundSpeed;
    }

    this.sampleTimer += dt;
    if (this.sampleTimer >= this.sampleInterval) {
      this.sampleTimer = 0;
      const frame: ReplayFrame = {
        timeSeconds: telemetry.flightTimeSeconds,
        position: { ...telemetry.position },
        rotation: { ...telemetry.rotation },
        velocity: { ...telemetry.velocity },
        motorOutputs: telemetry.motorOutputs ? [...telemetry.motorOutputs] : [0, 0, 0, 0],
        batteryLevel: telemetry.batteryLevel,
        altitudeAgl: telemetry.altitude,
        groundSpeedKmh: telemetry.groundSpeed,
        flightMode: telemetry.flightMode,
        eventMarker,
      };

      this.frames.push(frame);
      if (this.frames.length > this.maxFrames) {
        this.frames.shift();
      }
    }
  }

  public generateAnalysis(droneName: string, crashState: CrashState | null): FlightAnalysisReport {
    const duration = this.getDurationSeconds();
    const lastFrame = this.frames.length > 0 ? this.frames[this.frames.length - 1] : null;
    const endBattery = lastFrame ? lastFrame.batteryLevel : 100;
    const consumed = Math.max(0, this.startBattery - endBattery);
    const avgSpeed = this.frames.length > 0
      ? this.frames.reduce((sum, f) => sum + f.groundSpeedKmh, 0) / this.frames.length
      : 0;

    if (crashState && crashState.isCrashed) {
      return {
        droneName,
        flightDurationSeconds: duration,
        maxAltitudeMeters: Math.round(this.maxAltitude * 10) / 10,
        maxSpeedKmh: Math.round(this.maxSpeedKmh * 10) / 10,
        avgSpeedKmh: Math.round(avgSpeed * 10) / 10,
        batteryConsumedPercent: consumed,
        batteryConsumedMah: Math.round(consumed * 50),
        maxWindSpeedMs: 12.0,
        warningCount: 1,
        landingQuality: "CRASH",
        crashDetails: crashState,
        whatHappened: `Aircraft collided with obstacle or terrain at ${crashState.impactSpeedKmh} km/h (${crashState.impactSpeedMs} m/s) with ${crashState.kineticEnergyJoules} Joules of kinetic energy.`,
        whyItHappened: crashState.primaryCause || "Excessive descent rate or uncontrolled lateral velocity on touchdown exceeding airframe structural integrity limits.",
        howToImprove: [
          "Maintain a stabilized hover descent (< 1.5 m/s) over designated helipads.",
          "Engage Hover Assist [H] or Auto-Land [L] when descending.",
          "Check wind vector gauge and counteract drift before touchdown."
        ],
      };
    }

    const landingQuality = duration > 30 ? "PERFECT" : "SMOOTH";
    return {
      droneName,
      flightDurationSeconds: duration,
      maxAltitudeMeters: Math.round(this.maxAltitude * 10) / 10,
      maxSpeedKmh: Math.round(this.maxSpeedKmh * 10) / 10,
      avgSpeedKmh: Math.round(avgSpeed * 10) / 10,
      batteryConsumedPercent: consumed,
      batteryConsumedMah: Math.round(consumed * 50),
      maxWindSpeedMs: 4.5,
      warningCount: 0,
      landingQuality,
      whatHappened: "Flight mission completed successfully. Aircraft achieved stable touchdown on designated helipad surface.",
      whyItHappened: "Pilot maintained attitude envelope limits, controlled throttle descent rates, and stayed within airspace boundaries.",
      howToImprove: [
        "Continue refining precision coordinated turns (W + A/D).",
        "Practice wind compensation in crosswind weather presets.",
        "Test high altitude navigation in Mountain and Canyon regions."
      ],
    };
  }

  public logEvent(entry: Omit<FlightLogEntry, "id">) {
    const newEntry: FlightLogEntry = {
      ...entry,
      id: "evt_" + Math.random().toString(36).substring(2, 9),
    };
    this.logEntries.push(newEntry);
  }

  public getFrames(): ReplayFrame[] {
    return this.frames;
  }

  public getLogEntries(): FlightLogEntry[] {
    return this.logEntries;
  }

  public getDurationSeconds(): number {
    if (this.frames.length === 0) return 0;
    return this.frames[this.frames.length - 1].timeSeconds;
  }

  public getFrameAtTime(targetTime: number): ReplayFrame | null {
    if (this.frames.length === 0) return null;
    let closest = this.frames[0];
    let minDiff = Math.abs(closest.timeSeconds - targetTime);

    for (let i = 1; i < this.frames.length; i++) {
      const diff = Math.abs(this.frames[i].timeSeconds - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = this.frames[i];
      }
    }
    return closest;
  }
}
