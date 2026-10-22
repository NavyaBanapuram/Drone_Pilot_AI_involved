// ==========================================================
// DRONE PILOT — SIMULATION EVENT BUS (PHASE 7)
// Structured Event Dispatcher for Real-Time Aeronautics & Training
// Consumed by Educational Banner, Flight Coach, Audio SFX, and Recorder
// ==========================================================

export type SimulationEventSeverity = "INFO" | "WARNING" | "ALERT" | "CRITICAL";

export type SimulationEventType =
  | "ARMED"
  | "DISARMED"
  | "TAKEOFF"
  | "SAFE_LANDING"
  | "COLLISION"
  | "MOTOR_FAILURE"
  | "MOTOR_RPM_CHANGED"
  | "BATTERY_CHANGED"
  | "PAYLOAD_CHANGED"
  | "MOTOR_IMBALANCE"
  | "ATTITUDE_CHANGED"
  | "EXCESSIVE_TILT"
  | "BATTERY_LOW"
  | "BATTERY_CRITICAL"
  | "GPS_LOSS"
  | "IMU_DEGRADED"
  | "BAROMETER_DRIFT"
  | "HIGH_WIND"
  | "TURBULENCE_SURGE"
  | "GUST_DETECTED"
  | "HOVER_LIMIT_EXCEEDED"
  | "PAYLOAD_SHIFT"
  | "SCENARIO_STARTED"
  | "SCENARIO_COMPLETED"
  | "SCENARIO_FAILED"
  | "WIND_SPEED_CHANGED"
  | "WIND_DIRECTION_CHANGED"
  | "TURBULENCE_CHANGED"
  | "TEMPERATURE_CHANGED"
  | "RAIN_CHANGED"
  | "VISIBILITY_CHANGED"
  | "ENVIRONMENT_WARNING";

export interface SimulationEvent {
  id: string;
  timestamp: number;
  simTime: number;
  type: SimulationEventType;
  severity: SimulationEventSeverity;
  source: "PHYSICS" | "FAULTS" | "ENVIRONMENT" | "SCENARIO" | "PILOT" | "SYSTEM";
  title: string;
  message: string;
  payload?: Record<string, any>;
}

export type SimulationEventListener = (event: SimulationEvent) => void;

export class SimulationEventBus {
  private static instance: SimulationEventBus | null = null;
  private listeners: Set<SimulationEventListener> = new Set();
  private eventHistory: SimulationEvent[] = [];
  private maxHistory = 100;

  public static getInstance(): SimulationEventBus {
    if (!SimulationEventBus.instance) {
      SimulationEventBus.instance = new SimulationEventBus();
    }
    return SimulationEventBus.instance;
  }

  public subscribe(listener: SimulationEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public emit(event: Omit<SimulationEvent, "id">): SimulationEvent {
    const fullEvent: SimulationEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    for (const listener of this.listeners) {
      try {
        listener(fullEvent);
      } catch (e) {
        console.error("SimulationEventBus listener error:", e);
      }
    }

    return fullEvent;
  }

  public getHistory(): SimulationEvent[] {
    return [...this.eventHistory];
  }

  public clear(): void {
    this.eventHistory = [];
    this.listeners.clear();
  }
}
