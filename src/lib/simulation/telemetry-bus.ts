// ==========================================================
// DRONE PILOT — TELEMETRY BUS (PHASE 7)
// Multi-Tier Observer Bus for Real-Time Flight Telemetry
// Decouples physics generation from UI, audio, network, and analysis.
// ==========================================================

import { TelemetryState } from "./types";

export type TelemetryChannel = "high" | "medium" | "low"; // high: 60Hz, medium: 20Hz, low: 2Hz
export type TelemetryListener = (telemetry: TelemetryState, dt: number) => void;

export class TelemetryBus {
  private static instance: TelemetryBus | null = null;

  private highListeners: Set<TelemetryListener> = new Set();
  private mediumListeners: Set<TelemetryListener> = new Set();
  private lowListeners: Set<TelemetryListener> = new Set();

  private mediumTimer = 0;
  private lowTimer = 0;
  private mediumInterval = 0.05; // 20Hz
  private lowInterval = 0.50;    // 2Hz

  private lastTelemetry: TelemetryState | null = null;

  public static getInstance(): TelemetryBus {
    if (!TelemetryBus.instance) {
      TelemetryBus.instance = new TelemetryBus();
    }
    return TelemetryBus.instance;
  }

  public subscribe(channel: TelemetryChannel, listener: TelemetryListener): () => void {
    if (channel === "high") {
      this.highListeners.add(listener);
      return () => this.highListeners.delete(listener);
    } else if (channel === "medium") {
      this.mediumListeners.add(listener);
      return () => this.mediumListeners.delete(listener);
    } else {
      this.lowListeners.add(listener);
      return () => this.lowListeners.delete(listener);
    }
  }

  public publish(telemetry: TelemetryState, dt: number): void {
    this.lastTelemetry = telemetry;

    // 1. High frequency broadcast (every physics step)
    for (const listener of this.highListeners) {
      try {
        listener(telemetry, dt);
      } catch (e) {
        console.error("TelemetryBus high listener error:", e);
      }
    }

    // 2. Medium frequency broadcast (~20Hz for UI/HUD)
    this.mediumTimer += dt;
    if (this.mediumTimer >= this.mediumInterval) {
      this.mediumTimer = 0;
      for (const listener of this.mediumListeners) {
        try {
          listener(telemetry, this.mediumInterval);
        } catch (e) {
          console.error("TelemetryBus medium listener error:", e);
        }
      }
    }

    // 3. Low frequency broadcast (~2Hz for remote sync)
    this.lowTimer += dt;
    if (this.lowTimer >= this.lowInterval) {
      this.lowTimer = 0;
      for (const listener of this.lowListeners) {
        try {
          listener(telemetry, this.lowInterval);
        } catch (e) {
          console.error("TelemetryBus low listener error:", e);
        }
      }
    }
  }

  public getLastTelemetry(): TelemetryState | null {
    return this.lastTelemetry;
  }

  public clear(): void {
    this.highListeners.clear();
    this.mediumListeners.clear();
    this.lowListeners.clear();
  }
}
