// ==========================================================
// DRONE PILOT — LOCAL BROWSER SIMULATION ADAPTER (PHASE 7)
// Authoritative high-fidelity 6-DoF aerodynamic solver executed in-browser.
// ==========================================================

import { DroneDefinition, TelemetryState, EnvironmentState, PhysicsDebugTelemetry, CrashState, WeatherPreset } from "../types";
import { FlightPhysicsEngine } from "../flight-physics";
import { NormalizedControlInput, normalizedToFlightInput } from "../normalized-control";
import { SimulationAdapter, SimulationAdapterStatus, AdapterType } from "./simulation-adapter";

export class LocalSimulationAdapter implements SimulationAdapter {
  public readonly id = "adapter-local-browser";
  public readonly name = "Built-in Browser 6-DoF Physics";
  public readonly type: AdapterType = "local";
  public isConnected = true;

  private physics: FlightPhysicsEngine;
  private packetsSent = 0;
  private packetsReceived = 0;

  constructor(def: DroneDefinition) {
    this.physics = new FlightPhysicsEngine(def);
  }

  public async connect(): Promise<boolean> {
    this.isConnected = true;
    return true;
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  public async initialize(
    def: DroneDefinition,
    spawn: { x: number; y: number; z: number; yaw: number }
  ): Promise<void> {
    this.physics.setDefinition(def);
    this.physics.reset(spawn.x, spawn.y, spawn.z, spawn.yaw);
    this.isConnected = true;
  }

  public step(control: NormalizedControlInput, dt: number): TelemetryState {
    this.packetsSent++;
    const flightInput = normalizedToFlightInput(control);
    const telemetry = this.physics.update(flightInput, dt);
    this.packetsReceived++;
    return telemetry;
  }

  public reset(spawnX: number, spawnY: number, spawnZ: number, spawnYaw: number): void {
    this.physics.reset(spawnX, spawnY, spawnZ, spawnYaw);
  }

  public setEnvironment(env: EnvironmentState): void {
    this.physics.setEnvironment(env);
  }

  public updateEnvironment(updates: Partial<EnvironmentState>): void {
    this.physics.environment.setState(updates);
  }

  public applyWeatherPreset(preset: WeatherPreset): void {
    this.physics.environment.applyPreset(preset);
  }

  public setPayloadMass(kg: number): void {
    this.physics.setPayloadMass(kg);
  }

  public setMotorHealth(motorIndex: number, health: number): void {
    this.physics.setMotorHealth(motorIndex, health);
  }

  public setSensorHealth(sensors: Partial<{ gps: boolean; imu: boolean; baro: boolean; compass: boolean }>): void {
    this.physics.setSensorHealth(sensors);
  }

  public setTurbulence(factor: number): void {
    this.physics.setTurbulence(factor);
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

  public setElevationQueryFn(fn: (x: number, z: number) => number): void {
    this.physics.elevationQueryFn = fn;
  }

  public getStatus(): SimulationAdapterStatus {
    return {
      name: this.name,
      type: this.type,
      isConnected: this.isConnected,
      isLiveHardware: false,
      latencyMs: 0.1,
      packetsSent: this.packetsSent,
      packetsReceived: this.packetsReceived,
      statusMessage: "Operational (Local WebAssembly/JS Mathematical Solver)",
    };
  }

  public revive(): TelemetryState {
    return this.physics.revive();
  }

  public getTelemetry(): TelemetryState {
    return this.physics.generateTelemetry();
  }

  public getEnvironment(): EnvironmentState {
    return this.physics.environment.getState();
  }

  public getDefinition(): DroneDefinition {
    return this.physics.def;
  }

  public setMotorOverride(index: number, multiplier: number | null): void {
    this.physics.setMotorOverride(index, multiplier);
  }

  public setBatteryState(percent: number): void {
    this.physics.battery.reset(percent);
  }

  public setHoverMode(enabled: boolean): void {
    this.physics.isHoverMode = enabled;
  }

  public getPhysicsEngine(): FlightPhysicsEngine {
    return this.physics;
  }
}
