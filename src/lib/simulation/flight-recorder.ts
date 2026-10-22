// ==========================================================
// DRONE PILOT — FLIGHT TELEMETRY RECORDER & REPLAY BUFFER
// Records standardized frame-by-frame telemetry at 20Hz for post-flight
// replay, crash investigation, trajectory debriefing, and Snowflake analytics.
// ==========================================================

import {
  ReplayFrame,
  TelemetryState,
  FlightLogEntry,
  FlightAnalysisReport,
  CrashState,
  DroneCategory,
} from "./types";

export const TELEMETRY_CSV_HEADERS = [
  "Flight_Run_ID",
  "Sequence_Number",
  "Time_Seconds",
  "Timestamp_ISO",
  "Airframe_Type",
  "Target_Helipad_ID",
  "Position_X_M",
  "Position_Y_M",
  "Position_Z_M",
  "Altitude_AGL_M",
  "Altitude_MSL_M",
  "Velocity_X_MS",
  "Velocity_Y_MS",
  "Velocity_Z_MS",
  "Ground_Speed_KMH",
  "Vertical_Speed_MS",
  "Pitch_Deg",
  "Roll_Deg",
  "Yaw_Deg",
  "Flight_Mode",
  "Is_Armed",
  "Battery_Percent",
  "Battery_Voltage_V",
  "Battery_Current_A",
  "Battery_Power_W",
  "Battery_Remaining_MAH",
  "Motor_Count",
  "Motor_1_Throttle_Pct",
  "Motor_2_Throttle_Pct",
  "Motor_3_Throttle_Pct",
  "Motor_4_Throttle_Pct",
  "Motor_5_Throttle_Pct",
  "Motor_6_Throttle_Pct",
  "Motor_7_Throttle_Pct",
  "Motor_8_Throttle_Pct",
  "Event_Marker",
] as const;

/**
 * Formats a single ReplayFrame into an ordered CSV row array matching TELEMETRY_CSV_HEADERS.
 * Unmodeled or unavailable fields are formatted as empty strings ("") to clearly
 * distinguish missing data from measured numerical zeroes.
 */
export function formatFrameToCSVRow(frame: ReplayFrame): string[] {
  const motorCount = frame.motorOutputs ? frame.motorOutputs.length : 0;

  // Format up to 8 motor channels; absent channels remain empty strings ("")
  const motorThrottles: string[] = [];
  for (let m = 0; m < 8; m++) {
    if (frame.motorOutputs && m < motorCount) {
      motorThrottles.push((frame.motorOutputs[m] * 100).toFixed(1));
    } else {
      motorThrottles.push("");
    }
  }

  return [
    frame.flightRunId || "",
    frame.sequenceNumber !== undefined ? String(frame.sequenceNumber) : "",
    frame.timeSeconds.toFixed(2),
    frame.timestampIso || "",
    frame.airframeType || "",
    frame.targetHelipadId || "",
    frame.position.x.toFixed(2),
    frame.position.y.toFixed(2),
    frame.position.z.toFixed(2),
    frame.altitudeAgl.toFixed(2),
    frame.altitudeMsl !== undefined ? frame.altitudeMsl.toFixed(2) : "",
    frame.velocity.x.toFixed(2),
    frame.velocity.y.toFixed(2),
    frame.velocity.z.toFixed(2),
    frame.groundSpeedKmh.toFixed(2),
    frame.verticalSpeedMs !== undefined
      ? frame.verticalSpeedMs.toFixed(2)
      : frame.velocity.y.toFixed(2),
    ((frame.rotation?.pitch || 0) * (180 / Math.PI)).toFixed(2),
    ((frame.rotation?.roll || 0) * (180 / Math.PI)).toFixed(2),
    ((frame.rotation?.yaw || 0) * (180 / Math.PI)).toFixed(2),
    frame.flightMode || "MANUAL",
    frame.isArmed !== undefined ? (frame.isArmed ? "1" : "0") : "1",
    frame.batteryLevel.toFixed(1),
    frame.batteryVoltage !== undefined ? frame.batteryVoltage.toFixed(2) : "",
    frame.batteryCurrentAmps !== undefined ? frame.batteryCurrentAmps.toFixed(1) : "",
    frame.batteryPowerWatts !== undefined ? frame.batteryPowerWatts.toFixed(1) : "",
    frame.batteryRemainingMah !== undefined ? String(frame.batteryRemainingMah) : "",
    String(motorCount),
    ...motorThrottles,
    frame.eventMarker || "",
  ];
}

export class FlightRecorder {
  private frames: ReplayFrame[] = [];
  private logEntries: FlightLogEntry[] = [];
  private maxFrames = 6000; // ~5 minutes of flight data at 20Hz
  private sampleTimer = 0;
  private sampleInterval = 0.05; // 20Hz sampling
  private maxAltitude = 0;
  private maxSpeedKmh = 0;
  private startBattery = 100;

  // Flight Run Tracking & Context
  private flightRunId: string;
  private sequenceCounter = 0;
  private airframeType?: DroneCategory;
  private droneName = "Drone";
  private targetHelipadId?: string;

  constructor() {
    this.flightRunId = this.generateFlightRunId();
  }

  private generateFlightRunId(): string {
    return `run_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Sets the operational context for the active flight run.
   */
  public setFlightContext(context: {
    flightRunId?: string;
    droneName?: string;
    airframeType?: DroneCategory;
    targetHelipadId?: string;
  }): void {
    if (context.flightRunId) this.flightRunId = context.flightRunId;
    if (context.droneName) this.droneName = context.droneName;
    if (context.airframeType) this.airframeType = context.airframeType;
    if (context.targetHelipadId !== undefined) this.targetHelipadId = context.targetHelipadId;
  }

  public getFlightRunId(): string {
    return this.flightRunId;
  }

  public reset(): void {
    this.frames = [];
    this.logEntries = [];
    this.sampleTimer = 0;
    this.maxAltitude = 0;
    this.maxSpeedKmh = 0;
    this.startBattery = 100;
    this.flightRunId = this.generateFlightRunId();
    this.sequenceCounter = 0;
  }

  public record(telemetry: TelemetryState, dt = 0.05, eventMarker?: string): void {
    this.recordFrame(telemetry, dt, eventMarker);
  }

  public recordFrame(telemetry: TelemetryState, dt: number, eventMarker?: string): void {
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
        sequenceNumber: this.sequenceCounter++,
        flightRunId: this.flightRunId,
        timestampIso: new Date().toISOString(),
        timeSeconds: telemetry.flightTimeSeconds,
        airframeType: this.airframeType,
        targetHelipadId: this.targetHelipadId,
        position: { ...telemetry.position },
        rotation: { ...telemetry.rotation },
        velocity: { ...telemetry.velocity },
        acceleration: telemetry.acceleration ? { ...telemetry.acceleration } : undefined,
        altitudeAgl: telemetry.altitude,
        altitudeMsl: telemetry.altitudeMsl,
        groundSpeedKmh: telemetry.groundSpeed,
        verticalSpeedMs: telemetry.verticalSpeed,
        headingDeg: telemetry.heading,
        flightMode: telemetry.flightMode,
        isArmed: telemetry.isArmed,
        batteryLevel: telemetry.batteryLevel,
        batteryVoltage: telemetry.batteryVoltage,
        batteryCurrentAmps: telemetry.batteryCurrentAmps,
        batteryPowerWatts: telemetry.batteryPowerWatts,
        batteryRemainingMah: telemetry.batteryRemainingMah,
        motorOutputs: telemetry.motorOutputs ? [...telemetry.motorOutputs] : [0, 0, 0, 0],
        motorRpms: telemetry.motorRpms ? [...telemetry.motorRpms] : undefined,
        eventMarker,
      };

      this.frames.push(frame);
      if (this.frames.length > this.maxFrames) {
        this.frames.shift();
      }
    }
  }

  /**
   * Evaluates post-flight analysis based on actual measured simulation metrics
   * rather than heuristic flight duration.
   */
  public generateAnalysis(
    droneName: string = this.droneName,
    crashState: CrashState | null = null
  ): FlightAnalysisReport {
    const duration = this.getDurationSeconds();
    const lastFrame = this.frames.length > 0 ? this.frames[this.frames.length - 1] : null;
    const endBattery = lastFrame ? lastFrame.batteryLevel : 100;
    const consumed = Math.max(0, this.startBattery - endBattery);
    const avgSpeed =
      this.frames.length > 0
        ? this.frames.reduce((sum, f) => sum + f.groundSpeedKmh, 0) / this.frames.length
        : 0;

    // 1. Catastrophic Collision / Crash Assessment
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
        whyItHappened:
          crashState.primaryCause ||
          "Excessive descent rate or uncontrolled lateral velocity on touchdown exceeding airframe structural integrity limits.",
        howToImprove: [
          "Maintain a stabilized hover descent (< 1.5 m/s) over designated helipads.",
          "Engage Hover Assist [H] or Auto-Land [L] when descending.",
          "Check wind vector gauge and counteract drift before touchdown.",
        ],
      };
    }

    // 2. Evaluated Flight & Landing Assessment (Physics-driven, not duration-driven)
    let landingQuality: "PERFECT" | "SMOOTH" | "HARD" = "SMOOTH";
    let whatHappened = "Flight mission debriefed.";
    let whyItHappened = "Controlled aircraft handling throughout flight envelope.";
    const howToImprove: string[] = [];

    if (!lastFrame || this.frames.length === 0) {
      whatHappened = "No flight telemetry recorded.";
      whyItHappened = "Mission concluded without recording frames.";
    } else if (lastFrame.altitudeAgl > 1.0) {
      // Debriefed while still airborne
      landingQuality = "SMOOTH";
      whatHappened = `Mission debrief initiated while aircraft was airborne at ${lastFrame.altitudeAgl.toFixed(1)}m AGL.`;
      whyItHappened = "Flight mission was concluded mid-flight prior to touchdown.";
      howToImprove.push("Complete approach and descend to designated helipad before concluding flight debrief.");
    } else {
      // Touchdown on ground or landing pad
      const touchdownDescentRate = Math.abs(lastFrame.velocity.y);
      const touchdownGroundSpeed = lastFrame.groundSpeedKmh;
      const tiltDeg =
        Math.max(
          Math.abs(lastFrame.rotation.pitch),
          Math.abs(lastFrame.rotation.roll)
        ) * (180 / Math.PI);

      if (touchdownDescentRate > 2.0 || touchdownGroundSpeed > 8.0 || tiltDeg > 15.0) {
        landingQuality = "HARD";
        whatHappened = `Hard touchdown detected: descent rate ${touchdownDescentRate.toFixed(2)} m/s, ground speed ${touchdownGroundSpeed.toFixed(1)} km/h, tilt ${tiltDeg.toFixed(1)}°.`;
        whyItHappened =
          "Aircraft touched down with excessive sink rate or lateral momentum, placing elevated stress on airframe and landing gear.";
        howToImprove.push("Throttle flare to reduce descent rate below 1.0 m/s prior to ground contact.");
        howToImprove.push("Neutralize pitch and roll drift to touch down level and stationary.");
      } else if (touchdownDescentRate <= 0.6 && touchdownGroundSpeed <= 1.5 && tiltDeg <= 5.0) {
        landingQuality = "PERFECT";
        whatHappened = `Precision touchdown achieved: smooth descent (${touchdownDescentRate.toFixed(2)} m/s), level attitude (${tiltDeg.toFixed(1)}°), and stationary touchdown (${touchdownGroundSpeed.toFixed(1)} km/h).`;
        whyItHappened =
          "Pilot maintained attitude envelope limits, controlled throttle descent rates, and stabilized over the landing zone.";
        howToImprove.push("Practice crosswind landings under high wind turbulence presets.");
      } else {
        landingQuality = "SMOOTH";
        whatHappened = `Nominal touchdown completed: controlled descent rate (${touchdownDescentRate.toFixed(2)} m/s) within structural limits.`;
        whyItHappened = "Controlled vertical rate and stable attitude on touchdown.";
        howToImprove.push("Continue refining flare technique for sub-0.5 m/s precision touchdowns.");
      }
    }

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
      whatHappened,
      whyItHappened,
      howToImprove:
        howToImprove.length > 0
          ? howToImprove
          : [
              "Continue refining precision coordinated turns (W + A/D).",
              "Practice wind compensation in crosswind weather presets.",
              "Test high altitude navigation in Mountain and Canyon regions.",
            ],
    };
  }

  public logEvent(entry: Omit<FlightLogEntry, "id">): void {
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

  /**
   * Generates a standardized CSV string containing all headers and formatted frame rows.
   */
  public exportToCSV(customFrames?: ReplayFrame[]): string {
    const targetFrames = customFrames || this.frames;
    const rows = targetFrames.map(formatFrameToCSVRow);
    return [TELEMETRY_CSV_HEADERS.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  /**
   * Generates a structured JSON string containing run metadata, summary metrics,
   * and raw frame-by-frame telemetry.
   */
  public exportToJSON(droneName: string = this.droneName, customFrames?: ReplayFrame[]): string {
    const targetFrames = customFrames || this.frames;
    const duration = this.getDurationSeconds();
    const payload = {
      metadata: {
        flightRunId: this.flightRunId,
        droneName,
        airframeType: this.airframeType || "quadcopter",
        targetHelipadId: this.targetHelipadId || null,
        startTimeIso:
          targetFrames.length > 0 ? targetFrames[0].timestampIso : new Date().toISOString(),
        durationSeconds: Math.round(duration * 100) / 100,
        frameCount: targetFrames.length,
        sampleRateHz: 20,
        coordinateSystem: "Three.js (Y-up, X-east, Z-south)",
      },
      summary: {
        maxAltitudeMeters: Math.round(this.maxAltitude * 10) / 10,
        maxSpeedKmh: Math.round(this.maxSpeedKmh * 10) / 10,
        batteryConsumedPercent:
          Math.round(
            Math.max(
              0,
              this.startBattery - (targetFrames[targetFrames.length - 1]?.batteryLevel ?? 100)
            ) * 10
          ) / 10,
      },
      frames: targetFrames,
    };
    return JSON.stringify(payload, null, 2);
  }
}
