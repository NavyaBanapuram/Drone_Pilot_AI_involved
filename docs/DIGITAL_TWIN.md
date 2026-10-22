# DRONE PILOT — Digital Twin Interface & Hardware-in-the-Loop Foundation

## 1. Purpose & Vision
The **DRONE PILOT Digital Twin Architecture** provides an abstraction layer that permits the same 3D WebGL simulator, avionics HUD, and telemetry analytics to be driven by either:
1. The internal high-performance browser 6-DoF numerical physics engine, OR
2. An external real-world flight controller / SITL autopilot (e.g. **PX4 Autopilot**, **ArduPilot**, **Gazebo**, or **DJI MAVLink SDK**).

---

## 2. Digital Twin Interface Specification (`ISimulationProvider`)

```typescript
export interface ISimulationProvider {
  initialize(droneDef: DroneDefinition, spawn: SpawnConfiguration): Promise<void>;
  update(input: FlightInput, dt: number): TelemetryState;
  reset(x: number, y: number, z: number, yaw: number): void;
  getDebugTelemetry(): PhysicsDebugTelemetry;
  setEnvironment(env: EnvironmentState): void;
  setPayloadMass(kg: number): void;
  dispose(): void;
}
```

---

## 3. Implementations

### 3.1 `BrowserSimulationProvider`
* High-speed numerical RK4/Euler 6-DoF rigid-body solver running in JavaScript/WebAssembly.
* Deterministic elevation querying against the $2000\text{m} \times 1800\text{m}$ island terrain model.
* Zero external network dependencies.

### 3.2 `PX4SimulationProvider` (MAVLink WebSocket Gateway)
* Connects via WebSocket (`ws://localhost:8080/mavlink`) to a PX4 Software-In-The-Loop (SITL) instance or physical companion computer.
* Maps standard MAVLink messages into unified `TelemetryState`:
  * `HEARTBEAT` $\to$ Arming state, flight mode (`MANUAL`, `POSCTL`, `AUTO_LAND`).
  * `ATTITUDE_QUATERNION` $\to$ Aircraft pitch, roll, yaw.
  * `GLOBAL_POSITION_INT` $\to$ GPS latitude, longitude, MSL/AGL altitude.
  * `SYS_STATUS` $\to$ Battery voltage, current draw, and sensor health flags.
  * `ACTUATOR_OUTPUTS` $\to$ Individual motor RPM and ESC PWM values.
* Translates user keyboard/gamepad commands into MAVLink `MANUAL_CONTROL` packets sent back to the autopilot.

---

## 4. Hardware-in-the-Loop (HIL) Flight Verification

With this architecture:
1. Aeronautical students can practice stick maneuvers on standard web browsers.
2. UAV developers can test real autonomous flight software against complex crosswinds and mountain terrain before deploying physical aircraft into the field.
