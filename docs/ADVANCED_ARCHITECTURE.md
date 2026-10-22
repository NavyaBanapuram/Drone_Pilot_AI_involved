# DRONE PILOT — ADVANCED SIMULATION & DIGITAL-TWIN ARCHITECTURE
**Document Version:** 1.0  
**Phase:** Phase 7 Implementation  
**Status:** Canonical Reference

---

## Executive Overview
DRONE PILOT is an interactive educational drone simulation and digital-twin platform. It is engineered from first principles as an aeronautical laboratory rather than a conventional video game. The platform integrates aircraft physical properties, environmental aerodynamics, avionics fault injection, real-time telemetry distribution, and multiplayer airspace coordination.

---

## 1. Single Source of Truth & Digital Twin Architecture
The core architectural principle of DRONE PILOT is a strict unidirectional data flow:

```
DroneConfiguration (.drone.json / Firestore)
        ↓
DigitalTwin (Canonical Specification)
        ↓
RuntimeState (Live Dynamic Physical Quantities)
        ↓
Physics Solver (Deterministic 6-DoF Equations of Motion)
        ↓
Telemetry Bus (Multi-Tier Pub-Sub)
        ↓
Educational Systems (Event Engine, Flight Coach, Incident Debrief)
        ↓
3D WebGL Renderer (Three.js GPU Pipeline)
```

No divergent or conflicting aircraft states exist. React components, Three.js meshes, and network synchronization layers do not maintain independent physical quantities; they observe the canonical runtime model emitted through the Telemetry Bus.

---

## 2. Configuration vs Runtime State vs Session
The platform strictly separates three fundamental concepts:

### A. Aircraft Configuration (`DroneDigitalTwinConfiguration`)
Defines **what the aircraft is**:
- Airframe geometry, diagonal wheelbase, dry mass, motor layout ($X4, X6, X8$).
- Individual motor KV rating, rated voltage, internal resistance, max RPM, rotational direction.
- Propeller diameter, pitch, blade count, chord thrust factor.
- Battery chemistry, cell count ($S$), nominal voltage, capacity ($\text{mAh}$), internal resistance ($R_{\text{int}}$), C-rating.
- Sensor suite (GPS, 6-DoF IMU, Barometer, Magnetometer).
- Payload attachment, mass, and center of gravity offset.

### B. Runtime State (`DroneDigitalTwinRuntimeState`)
Defines **what the aircraft is currently doing**:
- Kinematics: MSL/AGL position, velocity vector ($\text{m/s}$), Euler angles (pitch, roll, yaw), angular rates ($\text{rad/s}$).
- Propulsion: Per-motor RPM, commanded throttle %, delivered thrust ($N$), current draw ($A$), winding temperature ($^\circ\text{C}$).
- Energy: Real-time SoC %, terminal voltage under Ohm's law sag ($V_{\text{term}} = V_{\text{oc}} - I \cdot R_{\text{int}}$), power output ($W$).
- Avionics: Sensor health status (`HEALTHY`, `DEGRADED`, `OFFLINE`), update rates.

### C. Simulation Session (`SimulationSession`)
Defines the **context of the flight run**:
- Session identifier, host/owner ID, participant roster, scenario preset ID, random seed, objective milestones, status (`WAITING`, `RUNNING`, `PAUSED`, `COMPLETED`, `ENDED`).

---

## 3. Canonical Simulation Clock & Timestep Strategy
To decouple physical integration from browser rendering frame rates (preventing numerical divergence when WebGL drops frames):
- **Simulation Clock (`SimulationClock`)**: Uses a **fixed-timestep accumulator pattern** ($\Delta t = 1/60\text{s} \approx 16.67\text{ms}$ or $1/120\text{s}$).
- While accumulated time $\ge \Delta t$, the solver advances in discrete sub-steps up to a maximum cap ($N_{\max} = 4$) to eliminate the "spiral of death."
- **Determinism**: Stochastic features (wind gusts, atmospheric turbulence, sensor noise) are driven by a stateful 32-bit PRNG (`DeterministicRNG` / Mulberry32). Identical initial seeds, configurations, and control inputs reproduce identical flight trajectories.

---

## 4. Physics Engine Interface
The physics engine is decoupled from React and DOM lifecycles:
```typescript
SimulationInput (NormalizedControlInput)
        ↓
PhysicsEngine.step(dt: number)
        ↓
SimulationOutput (TelemetryState, Forces, Torques, Failures)
```
- **Local Aerodynamic Solver**: Computes gravity, multi-motor thrust, drag quadratic vectors ($F_d = \frac{1}{2} \rho v^2 C_d A$), asymmetric rolling/pitching torques ($\tau_{\text{roll}}, \tau_{\text{pitch}}$), ground reaction forces, and terrain collision clamping.

---

## 5. Telemetry Bus Architecture
The `TelemetryBus` implements an observer pub-sub architecture with multi-tier frequency channels:
1. **High-Frequency (60Hz)**: Subscribed by the `FlightRecorder` and aerodynamic solvers for sub-millisecond incident forensics.
2. **Medium-Frequency (20Hz)**: Subscribed by the Cockpit Telemetry HUD, Artificial Horizon, and `EducationalEventEngine`.
3. **Low-Frequency (2Hz)**: Subscribed by the cloud multiplayer sync and long-term telemetry logging to preserve network bandwidth and Firestore quotas.

---

## 6. Simulation Event Bus
The `SimulationEventBus` provides structured aeronautical notifications:
```typescript
interface SimulationEvent {
  id: string;
  timestamp: number;
  simTime: number;
  type: SimulationEventType;
  severity: "INFO" | "WARNING" | "ALERT" | "CRITICAL";
  source: "PHYSICS" | "FAULTS" | "ENVIRONMENT" | "SCENARIO" | "PILOT" | "SYSTEM";
  title: string;
  message: string;
  payload?: Record<string, any>;
}
```
Events like `MOTOR_FAILURE`, `BATTERY_CRITICAL`, `GPS_LOSS`, and `COLLISION` are emitted at the instant of physical detection and consumed by the HUD advisory banner, voice SFX, and debrief analyzer.

---

## 7. Multiplayer & Network State Model
Shared airspace is coordinated using a hybrid transport:
1. **Local Inter-Tab (`BroadcastChannel`)**: Instant 20Hz peer communication for local multi-window demonstrations.
2. **Global Cloud (`Firebase Firestore`)**: ~7Hz document stream in `active_airspace/{playerId}` for cross-machine flight.

### Network Representation
```typescript
interface RemotePlayerState {
  playerId: string;
  callsign: string;
  droneId: string;
  position: { x: number; y: number; z: number };
  rotation: { pitch: number; roll: number; yaw: number };
  velocity: { x: number; y: number; z: number };
  rotorRpmPercent: number;
  flightMode: string;
  sequenceNumber: number;
  lastUpdate: number;
}
```
*Note*: Full static aircraft configurations are never transmitted in network telemetry frames. They are retrieved by reference or on initial join.

---

## 8. Network Authority & Dead Reckoning
- **Ownership Model**: **Local Client Authoritative for Flight Dynamics**. Each client solves its own aircraft equations of motion and broadcasts position, rotation, and velocity. The server/cloud acts as the coordinator for session membership and airspace presence.
- **Safety Sanitization**: Inbound network packets are clamped via `sanitizeRemotePlayerState` ($X, Z \in [-2500, 2500]$, $Y \in [0, 1500]$, callsigns sanitized). Out-of-bounds or NaN coordinates are rejected.
- **Dead Reckoning & Interpolation**: In `RemoteDroneManager`, remote drone positions are extrapolated along their velocity vectors ($\vec{p}_{\text{target}} = \vec{p} + \vec{v} \cdot \Delta t$) for up to $400\text{ms}$ during network packet delay, and smoothed using frame-rate independent exponential lerp (`1.0 - Math.exp(-14.0 * dt)`) and modular angle difference wrapping.
- **Ghost Eviction**: Disconnected or dormant peers are pruned cleanly from the 3D scene after $6.5\text{s}$ of silence.

---

## 9. Session Architecture
Simulation sessions maintain the boundary for training missions:
- `SimulationSession`: Coordinates scenario parameters, environment conditions, active faults, and student/instructor roles.
- Distinct lifecycle states: `INITIALIZING`, `READY`, `RUNNING`, `PAUSED`, `RESETTING`, `COMPLETED`, `ERROR`.

---

## 10. External Simulator & Autopilot Adapters
The platform features an abstract `SimulationAdapter` contract:
```typescript
export interface SimulationAdapter {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  step(control: NormalizedControlInput, dt: number): TelemetryState;
  reset(x: number, y: number, z: number, yaw: number): void;
  getStatus(): SimulationAdapterStatus;
}
```
Available adapter implementations:
- `LocalSimulationAdapter`: Active browser 6-DoF multirotor solver.
- `PX4SimulationAdapter`: MAVLink 2.0 HITL/SITL bridge.
- `GazeboSimulationAdapter`: ROS2 / rosbridge multi-body simulator bridge.
- `HardwareControllerAdapter`: Web Gamepad API RC transmitter interface.

---

## 11. PX4 Integration Readiness
- **Architecture Status**: **ADAPTER ARCHITECTURE READY**
- **Live Integration**: **NOT CONNECTED**
- **Contract Specification**:
  - Outbound commands: MAVLink `MANUAL_CONTROL` (#69) and `HIL_ACTUATOR_CONTROLS` (#93).
  - Inbound telemetry: MAVLink `ATTITUDE` (#30) and `LOCAL_POSITION_NED` (#32).
  - When an external MAVLink WebSocket daemon is not detected at `ws://localhost:9090/mavlink`, the adapter safely defaults to the built-in browser physics solver.

---

## 12. Gazebo Integration Readiness
- **Architecture Status**: **ADAPTER ARCHITECTURE READY**
- **Live Integration**: **NOT CONNECTED**
- **Contract Specification**:
  - Command topic: `/drone/cmd_vel` (`geometry_msgs/Twist`).
  - Feedback topics: `/drone/odometry` (`nav_msgs/Odometry`) and `/drone/imu` (`sensor_msgs/Imu`).
  - When external rosbridge is unreachable, the adapter transparently falls back to local simulation.

---

## 13. Hardware Controller Input Readiness
- **Architecture Status**: **NORMALIZED INPUT INTERFACE READY**
- **Physical Hardware**: **CONNECTED DYNAMICALLY VIA GAMEPAD API (OR AWAITING DEVICE)**
- **Stick Mapping (Standard Mode 2 RC)**:
  - Left Stick Vertical: Throttle ($\text{Ch } 1$)
  - Left Stick Horizontal: Yaw / Rudder ($\text{Ch } 4$)
  - Right Stick Vertical: Pitch / Elevator ($\text{Ch } 2$)
  - Right Stick Horizontal: Roll / Aileron ($\text{Ch } 3$)
  - Button A / Cross: Arming Toggle
- Live hardware detection is supported in all modern browsers without native drivers.

---

## 14. Database Architecture
Firestore persistence is cleanly segregated:
- `/users/{userId}`: User account metadata.
- `/users/{userId}/droneConfigurations/{configId}`: Saved custom aircraft digital twins.
- `/users/{userId}/sessions/{sessionId}`: Historical training performance and scores.
- `/users/{userId}/flightHistory/{historyId}`: Flight recorder debrief logs.
- `/active_airspace/{playerId}`: Ephemeral multiplayer coordinates (auto-expiring).
- `/simulation_sessions/{sessionId}`: Collaborative multi-pilot training rooms.

---

## 15. Security & Isolation Rules
Enforced through [firestore.rules](file:///c:/Users/wbl/Desktop/Drone-Pilot/firestore.rules):
- **User Data Isolation**: Only the authenticated owner (`request.auth.uid == userId`) can read or write configurations, session logs, and flight history.
- **Airspace Guards**: Airspace writes require identity verification (`playerId == request.auth.uid` or validated token) and coordinate sanity checks ($Y \in [0, 2000]\text{m}$).
- **Shared Session Guard**: Only session hosts can edit session rules; participants can update their individual status.

---

## 16. Digital Twin Configuration Import & Export
Standardized `.drone.json` schema:
```json
{
  "format": "DRONE_PILOT_DIGITAL_TWIN",
  "digitalTwinSchemaVersion": "1.0",
  "exportedAt": 1726998000000,
  "configuration": {
    "identity": { ... },
    "airframe": { ... },
    "motors": [ ... ],
    "battery": { ... },
    "propeller": { ... }
  }
}
```
- **Import Security**: All imported files are validated using `validateDroneDigitalTwin()`. Malformed parameters, out-of-range propulsion ratings, or syntax anomalies are flagged before insertion. New unique configuration IDs are assigned to prevent unintended overwrite.

---

## 17. Current System Limitations
1. **Cloud Server Authoritative Physics**: Physical calculations currently execute client-side. A compromised client could publish altered coordinates to the cloud airspace. (Hardened in client rendering via coordinate clamping and dead-reckoning bounding).
2. **External Autopilot Bridges**: PX4 and Gazebo adapters have full interface and message definitions implemented, but require an external daemon (e.g. `mavlink2rest` or `rosbridge_suite`) running locally on the user's workstation for live hardware-in-the-loop loops.
3. **Web Audio Limitations**: Audio requires an initial user interaction gesture (click/keypress) to unlock the Web Audio context per browser autoplay policies.
