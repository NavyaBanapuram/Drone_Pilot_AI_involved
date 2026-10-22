# FINAL ARCHITECTURE

This document outlines the final production architecture for DRONE PILOT, detailing the separation of concerns and the strict data flows that guarantee deterministic performance and state isolation.

## 1. Authentication & Security
- **Authentication**: Managed via Firebase Auth (Email/Password).
- **Data Isolation**: Strict Firestore rules ensure users can only read/write their own Digital Twin configurations (`/users/{userId}/aircraftConfigurations`) and sessions.
- **Offline Fallback**: If Firebase is unavailable, the application gracefully degrades to `LocalStorage` for Digital Twin persistence and anonymous usage.

## 2. Digital Twin
- **Canonical Model**: The `DroneDigitalTwinConfiguration` defines the static physical properties of an aircraft (mass, dimensions, motor KV/RPM, battery capacity).
- **Versioning**: Uses `digitalTwinSchemaVersion` and `configurationVersion` for strict migration and tracking.
- **Snapshot Integrity**: When a simulation session starts, it creates a deep clone of the Digital Twin configuration. Subsequent edits to the saved configuration do not leak into the active physics loop.

## 3. Runtime State & Physics
- **6-DoF Solver**: A custom `FlightPhysicsEngine` computes rigid body dynamics, angular momentum, and aerodynamic drag. It is fully decoupled from React.
- **Simulation Clock**: Employs a fixed-timestep accumulator (e.g. `dt = 1/60s`) to ensure deterministic behavior independent of the browser's render framerate.
- **State Mutability**: The physics engine holds the *only* mutable runtime state during flight.

## 4. Environment
- **Environment Manager**: Models weather conditions (Wind, Turbulence, Rain, Temperature, Visibility).
- **Physics Integration**: Environmental variables feed directly into the physics solver (e.g. `windSpeed` introduces lateral force, `turbulence` introduces randomized torque, `temperature` modulates air density).

## 5. Telemetry & Events
- **Telemetry Throttling**: The 60Hz physics loop generates state, but the UI subscribes via a 20Hz throttled timer (`telemetryThrottleTimer`) in the `FlightSimulator` React component.
- **Simulation Event Bus**: A centralized pub/sub bus (`SimulationEventBus`) broadcasts events (e.g., motor failures, crashes, boundary violations). History is securely bounded to 100 entries to prevent memory leaks.

## 6. Scenarios & Analysis
- **Scenario Engine**: Evaluates educational training scenarios (Altitude Hold, Motor Imbalance, Payload Drops) continuously against the telemetry stream.
- **Analysis (Flight Recorder)**: Telemetry is sampled into a replay buffer (bounded to 6000 frames / 5 minutes) entirely in memory. It generates a final `FlightAnalysisReport` which can optionally be persisted.

## 7. Multiplayer
- **Hybrid Synchronization**:
  - **Local BroadcastChannel**: Delivers 20Hz low-latency updates between local browser tabs.
  - **Cloud Firestore**: Pushes ~7Hz updates to the `/active_airspace` collection for cross-device visibility.
- **Lifecycle**: Stale remote players are aggressively pruned after 6.5s of network silence. Remote telemetry never overwrites local physics state.

## 8. External Adapter Architecture
- **Abstraction**: `SimulationAdapter` provides a strictly typed interface for the React UI to interact with *any* physics backend.
- **Implementations**:
  - `LocalSimulationAdapter`: Wraps the internal 6-DoF engine.
  - `PX4SimulationAdapter` / `GazeboSimulationAdapter`: Architectural stubs designed to pipe standard inputs to external simulation bridges. Currently mock connection status gracefully without fake integrations.
