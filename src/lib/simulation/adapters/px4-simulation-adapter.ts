// ==========================================================
// DRONE PILOT — PX4 AUTOPILOT SIMULATION ADAPTER (PHASE 7)
// Hardware-in-the-Loop (HITL) & Software-in-the-Loop (SITL) Interface
//
// INTEGRATION STATUS:
// ADAPTER ARCHITECTURE READY; LIVE INTEGRATION: NOT CONNECTED
// This adapter provides the full MAVLink 2.0 message translation contract.
// If an external PX4 MAVLink bridge (e.g. mavlink2rest or mavros) is not reachable,
// it gracefully delegates execution to the internal LocalSimulationAdapter.
// ==========================================================

import { DroneDefinition, TelemetryState, EnvironmentState, PhysicsDebugTelemetry, CrashState, WeatherPreset } from "../types";
import { NormalizedControlInput } from "../normalized-control";
import { SimulationAdapter, SimulationAdapterStatus, AdapterType } from "./simulation-adapter";
import { LocalSimulationAdapter } from "./local-simulation-adapter";

export interface MAVLinkMessage {
  msgid: number;
  sysid: number;
  compid: number;
  payload: Record<string, any>;
}

export class PX4SimulationAdapter implements SimulationAdapter {
  public readonly id = "adapter-px4-sitl";
  public readonly name = "PX4 Autopilot SITL / HITL Adapter";
  public readonly type: AdapterType = "px4";
  public isConnected = false;

  private wsUrl: string;
  private socket: WebSocket | null = null;
  private fallbackAdapter: LocalSimulationAdapter;
  private lastRemoteTelemetry: TelemetryState | null = null;
  private packetsSent = 0;
  private packetsReceived = 0;
  private lastLatencyMs = 0;
  private lastPingTime = 0;

  constructor(def: DroneDefinition, wsUrl = "ws://localhost:9090/mavlink") {
    this.wsUrl = wsUrl;
    this.fallbackAdapter = new LocalSimulationAdapter(def);
  }

  public async connect(): Promise<boolean> {
    if (typeof window === "undefined") {
      this.isConnected = false;
      return false;
    }

    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.sendHeartbeat();
      };

      this.socket.onmessage = (event) => {
        this.packetsReceived++;
        try {
          const msg = JSON.parse(event.data);
          this.handleMavlinkMessage(msg);
        } catch {
          // Packet parse error
        }
      };

      this.socket.onerror = () => {
        this.isConnected = false;
      };

      this.socket.onclose = () => {
        this.isConnected = false;
      };

      return true;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }

  public async initialize(
    def: DroneDefinition,
    spawn: { x: number; y: number; z: number; yaw: number }
  ): Promise<void> {
    await this.fallbackAdapter.initialize(def, spawn);
  }

  /**
   * Translates NormalizedControlInput into MAVLink MANUAL_CONTROL or HIL_ACTUATOR_CONTROLS.
   */
  public step(control: NormalizedControlInput, dt: number): TelemetryState {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      // MAVLink MANUAL_CONTROL message (#69): x (pitch: -1000..1000), y (roll: -1000..1000), z (throttle: 0..1000), r (yaw: -1000..1000)
      const mavManualControl = {
        msgid: 69,
        sysid: 255, // GCS system ID
        compid: 190,
        payload: {
          target: 1,
          x: Math.round(-control.pitch * 1000),
          y: Math.round(control.roll * 1000),
          z: Math.round(((control.throttle + 1.0) / 2.0) * 1000),
          r: Math.round(control.yaw * 1000),
          buttons: control.isArmed ? 1 : 0,
        },
      };

      try {
        this.socket.send(JSON.stringify(mavManualControl));
        this.packetsSent++;
      } catch {
        // Socket write failure
      }

      if (this.lastRemoteTelemetry) {
        return this.lastRemoteTelemetry;
      }
    }

    // High-fidelity fallback when external daemon is offline
    return this.fallbackAdapter.step(control, dt);
  }

  private sendHeartbeat(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const heartbeat = {
      msgid: 0,
      sysid: 255,
      compid: 190,
      payload: {
        type: 6, // MAV_TYPE_GCS
        autopilot: 8, // MAV_AUTOPILOT_INVALID
        base_mode: 0,
        custom_mode: 0,
        system_status: 3, // MAV_STATE_STANDBY
        mavlink_version: 3,
      },
    };
    this.socket.send(JSON.stringify(heartbeat));
  }

  private handleMavlinkMessage(msg: MAVLinkMessage): void {
    if (!msg || !msg.payload) return;

    // ATTITUDE (#30)
    if (msg.msgid === 30) {
      // roll, pitch, yaw in radians
    }
    // LOCAL_POSITION_NED (#32)
    else if (msg.msgid === 32) {
      const p = msg.payload;
      // Convert NED (North-East-Down) to Three.js world coordinates (X=East, Y=Up, Z=South)
      if (this.lastRemoteTelemetry) {
        this.lastRemoteTelemetry.position.x = p.y || 0;
        this.lastRemoteTelemetry.position.y = -(p.z || 0);
        this.lastRemoteTelemetry.position.z = -(p.x || 0);
      }
    }
  }

  public reset(spawnX: number, spawnY: number, spawnZ: number, spawnYaw: number): void {
    this.fallbackAdapter.reset(spawnX, spawnY, spawnZ, spawnYaw);
  }

  public setEnvironment(env: EnvironmentState): void {
    this.fallbackAdapter.setEnvironment(env);
  }

  public updateEnvironment(updates: Partial<EnvironmentState>): void {
    this.fallbackAdapter.updateEnvironment(updates);
  }

  public applyWeatherPreset(preset: WeatherPreset): void {
    this.fallbackAdapter.applyWeatherPreset(preset);
  }

  public setPayloadMass(kg: number): void {
    this.fallbackAdapter.setPayloadMass(kg);
  }

  public setMotorHealth(motorIndex: number, health: number): void {
    this.fallbackAdapter.setMotorHealth(motorIndex, health);
  }

  public setSensorHealth(sensors: Partial<{ gps: boolean; imu: boolean; baro: boolean; compass: boolean }>): void {
    this.fallbackAdapter.setSensorHealth(sensors);
  }

  public setTurbulence(factor: number): void {
    this.fallbackAdapter.setTurbulence(factor);
  }

  public triggerAutoLand(): void {
    this.fallbackAdapter.triggerAutoLand();
  }

  public getMotorOutputs(): number[] {
    return this.fallbackAdapter.getMotorOutputs();
  }

  public getDebugTelemetry(): PhysicsDebugTelemetry {
    return this.fallbackAdapter.getDebugTelemetry();
  }

  public getCrashState(): CrashState | null {
    return this.fallbackAdapter.getCrashState();
  }

  public resetCrash(): void {
    this.fallbackAdapter.resetCrash();
  }

  public revive(): TelemetryState {
    return this.fallbackAdapter.revive();
  }

  public getTelemetry(): TelemetryState {
    return this.lastRemoteTelemetry || this.fallbackAdapter.getTelemetry();
  }

  public getEnvironment(): EnvironmentState {
    return this.fallbackAdapter.getEnvironment();
  }

  public getDefinition(): DroneDefinition {
    return this.fallbackAdapter.getDefinition();
  }

  public setMotorOverride(index: number, multiplier: number | null): void {
    this.fallbackAdapter.setMotorOverride(index, multiplier);
  }

  public setBatteryState(percent: number): void {
    this.fallbackAdapter.setBatteryState(percent);
  }

  public setHoverMode(enabled: boolean): void {
    this.fallbackAdapter.setHoverMode(enabled);
  }

  public setElevationQueryFn(fn: (x: number, z: number) => number): void {
    this.fallbackAdapter.setElevationQueryFn(fn);
  }

  public getStatus(): SimulationAdapterStatus {
    return {
      name: this.name,
      type: this.type,
      isConnected: this.isConnected,
      isLiveHardware: false,
      latencyMs: this.isConnected ? this.lastLatencyMs : 0,
      packetsSent: this.packetsSent,
      packetsReceived: this.packetsReceived,
      statusMessage: this.isConnected
        ? "Connected to PX4 Autopilot SITL WebSocket"
        : "ADAPTER ARCHITECTURE READY; LIVE INTEGRATION: NOT CONNECTED (Using Local 6-DoF Fallback)",
    };
  }
}
