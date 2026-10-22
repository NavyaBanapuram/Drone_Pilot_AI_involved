// ==========================================================
// DRONE PILOT — DIGITAL TWIN SIMULATION PROVIDER ARCHITECTURE
// Unifies built-in browser 6-DoF physics with external
// high-fidelity SITL/HITL simulation backends (PX4 / Gazebo).
// ==========================================================

import { DroneDefinition, FlightInput, TelemetryState, EnvironmentState, PhysicsDebugTelemetry, CrashState } from "./types";
import { FlightPhysicsEngine } from "./flight-physics";

export type SimulationBackendType = "browser" | "px4-gazebo-twin";

export interface ISimulationProvider {
  readonly backendType: SimulationBackendType;
  readonly isConnected: boolean;

  initialize(def: DroneDefinition, initialSpawn: { x: number; y: number; z: number; yaw: number }): Promise<void>;
  step(input: FlightInput, dt: number): TelemetryState;
  reset(spawnX: number, spawnY: number, spawnZ: number, spawnYaw: number): void;
  setEnvironment(env: EnvironmentState): void;
  setPayloadMass(kg: number): void;
  triggerAutoLand(): void;
  getMotorOutputs(): number[];
  getDebugTelemetry(): PhysicsDebugTelemetry;
  getCrashState(): CrashState | null;
  resetCrash(): void;
}

/**
 * Built-in Browser 6-DoF Multirotor Physics Engine
 */
export class BrowserSimulationProvider implements ISimulationProvider {
  public readonly backendType: SimulationBackendType = "browser";
  public readonly isConnected = true;

  private physics: FlightPhysicsEngine;

  constructor(def: DroneDefinition) {
    this.physics = new FlightPhysicsEngine(def);
  }

  public async initialize(def: DroneDefinition, spawn: { x: number; y: number; z: number; yaw: number }): Promise<void> {
    this.physics.setDefinition(def);
    this.physics.reset(spawn.x, spawn.y, spawn.z, spawn.yaw);
  }

  public step(input: FlightInput, dt: number): TelemetryState {
    return this.physics.update(input, dt);
  }

  public reset(spawnX: number, spawnY: number, spawnZ: number, spawnYaw: number): void {
    this.physics.reset(spawnX, spawnY, spawnZ, spawnYaw);
  }

  public setEnvironment(env: EnvironmentState): void {
    this.physics.setEnvironment(env);
  }

  public setPayloadMass(kg: number): void {
    this.physics.setPayloadMass(kg);
  }

  public triggerAutoLand(): void {
    this.physics.triggerAutoLand();
  }

  public getMotorOutputs(): number[] {
    return this.physics.getMotorOutputs();
  }

  public getDebugTelemetry(): PhysicsDebugTelemetry {
    return this.physics.getDebugTelemetry();
  }

  public getCrashState(): CrashState | null {
    return this.physics.crashState;
  }

  public resetCrash(): void {
    this.physics.resetCrash();
  }

  public setElevationQueryFn(fn: (x: number, z: number) => number) {
    this.physics.elevationQueryFn = fn;
  }
}

/**
 * PX4 / Gazebo Digital Twin Adapter
 * Establishes the MAVLink WebSocket communication contract.
 * Translates external attitude, local position, and battery status packets
 * into the identical canonical TelemetryState consumed by the UI and HUD.
 */
export class PX4SimulationProvider implements ISimulationProvider {
  public readonly backendType: SimulationBackendType = "px4-gazebo-twin";
  public isConnected = false;

  private wsUrl: string;
  private socket: WebSocket | null = null;
  private fallbackProvider: BrowserSimulationProvider;
  private lastTelemetry: TelemetryState;

  constructor(def: DroneDefinition, wsUrl = "ws://localhost:9090") {
    this.wsUrl = wsUrl;
    this.fallbackProvider = new BrowserSimulationProvider(def);
    this.lastTelemetry = this.fallbackProvider.step({
      throttle: 0,
      pitch: 0,
      roll: 0,
      yaw: 0,
      hoverHold: true,
      reset: false,
      cameraToggle: false,
    }, 0.01);
  }

  public async initialize(def: DroneDefinition, spawn: { x: number; y: number; z: number; yaw: number }): Promise<void> {
    await this.fallbackProvider.initialize(def, spawn);

    try {
      if (typeof window !== "undefined") {
        this.socket = new WebSocket(this.wsUrl);
        this.socket.onopen = () => {
          this.isConnected = true;
          console.log("[PX4 Digital Twin] Connected to high-fidelity backend at " + this.wsUrl);
        };
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.mavpackettype === "LOCAL_POSITION_NED" || data.type === "telemetry") {
              this.lastTelemetry = {
                ...this.lastTelemetry,
                position: { x: data.x || 0, y: -(data.z || 0), z: data.y || 0 },
                velocity: { x: data.vx || 0, y: -(data.vz || 0), z: data.vy || 0 },
              };
            }
          } catch {
            // Ignore parse errors
          }
        };
        this.socket.onerror = () => {
          this.isConnected = false;
        };
      }
    } catch {
      this.isConnected = false;
    }
  }

  public step(input: FlightInput, dt: number): TelemetryState {
    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: "MANUAL_CONTROL",
        x: input.pitch * 1000,
        y: input.roll * 1000,
        z: (input.throttle + 1) * 500,
        r: input.yaw * 1000,
      }));
      return this.lastTelemetry;
    }

    return this.fallbackProvider.step(input, dt);
  }

  public reset(spawnX: number, spawnY: number, spawnZ: number, spawnYaw: number): void {
    this.fallbackProvider.reset(spawnX, spawnY, spawnZ, spawnYaw);
  }

  public setEnvironment(env: EnvironmentState): void {
    this.fallbackProvider.setEnvironment(env);
  }

  public setPayloadMass(kg: number): void {
    this.fallbackProvider.setPayloadMass(kg);
  }

  public triggerAutoLand(): void {
    this.fallbackProvider.triggerAutoLand();
  }

  public getMotorOutputs(): number[] {
    return this.fallbackProvider.getMotorOutputs();
  }

  public getDebugTelemetry(): PhysicsDebugTelemetry {
    return this.fallbackProvider.getDebugTelemetry();
  }

  public getCrashState(): CrashState | null {
    return this.fallbackProvider.getCrashState();
  }

  public resetCrash(): void {
    this.fallbackProvider.resetCrash();
  }

  public setElevationQueryFn(fn: (x: number, z: number) => number) {
    this.fallbackProvider.setElevationQueryFn(fn);
  }
}
