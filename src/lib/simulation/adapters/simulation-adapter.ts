// ==========================================================
// DRONE PILOT — SIMULATION ADAPTER INTERFACE (PHASE 10)
// External Digital-Twin Integration Boundary
//
// This interface decouples the 3D world, multiplayer, and educational engines 
// from the underlying physics solver. Currently, this is satisfied by the 
// internal FlightPhysicsEngine. Future adapters (PX4, Gazebo) will implement 
// this exact interface to drive the simulator externally.
// ==========================================================

import { DroneDefinition, TelemetryState, EnvironmentState, PhysicsDebugTelemetry, CrashState, WeatherPreset } from "../types";
import { NormalizedControlInput } from "../normalized-control";

export type AdapterType = "local" | "px4" | "gazebo" | "hardware";

export interface SimulationAdapterStatus {
  name: string;
  type: AdapterType;
  isConnected: boolean;
  isLiveHardware: boolean;
  latencyMs: number;
  packetsSent: number;
  packetsReceived: number;
  statusMessage: string;
}

export interface SimulationAdapter {
  readonly id: string;
  readonly name: string;
  readonly type: AdapterType;
  readonly isConnected: boolean;

  /** Lifecycle: Connect to external transport if applicable */
  connect(): Promise<boolean>;
  
  /** Lifecycle: Disconnect from transport and cleanup listeners */
  disconnect(): Promise<void>;

  /** Lifecycle: Apply the Digital Twin configuration (Aircraft Setup) */
  initialize(
    def: DroneDefinition,
    initialSpawn: { x: number; y: number; z: number; yaw: number }
  ): Promise<void>;

  /** Command Contract: Provide normalized pilot commands to the solver and step simulation */
  step(control: NormalizedControlInput, dt: number): TelemetryState;
  
  /** Reset the internal solver state to a location */
  reset(spawnX: number, spawnY: number, spawnZ: number, spawnYaw: number): void;

  /** Experimental Runtime API */
  setEnvironment(env: EnvironmentState): void;
  updateEnvironment(updates: Partial<EnvironmentState>): void;
  applyWeatherPreset(preset: WeatherPreset): void;
  setPayloadMass(kg: number): void;
  setMotorHealth(motorIndex: number, health: number): void;
  setSensorHealth(sensors: Partial<{ gps: boolean; imu: boolean; baro: boolean; compass: boolean }>): void;
  setTurbulence(factor: number): void;

  triggerAutoLand(): void;
  getMotorOutputs(): number[];
  getDebugTelemetry(): PhysicsDebugTelemetry;
  getCrashState(): CrashState | null;
  resetCrash(): void;
  revive(): TelemetryState;
  
  /** Telemetry Contract: A uniform state dictionary consumed by UI and multiplayer */
  getTelemetry(): TelemetryState;
  getEnvironment(): EnvironmentState;
  getDefinition(): DroneDefinition;

  // Manual overrides
  setMotorOverride(index: number, multiplier: number | null): void;
  setBatteryState(percent: number): void;
  
  // Assistance modes
  setHoverMode(enabled: boolean): void;

  getStatus(): SimulationAdapterStatus;
  setElevationQueryFn?(fn: (x: number, z: number) => number): void;
}
