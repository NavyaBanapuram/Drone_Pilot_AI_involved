# DRONE PILOT

DRONE PILOT is an educational Digital Twin platform and high-fidelity 6-DoF drone flight simulator running directly in the browser. It bridges the gap between aeronautical theory and practical operation, allowing users to configure aircraft geometry, inject hardware faults, manipulate environmental physics, and analyze real-time telemetry.

## Core Capabilities

- **Canonical Digital Twin Configuration**: Design and save Quadcopter, Hexacopter, and Octocopter configurations, specifying motor RPM limits, payload mass, battery capacity, and sensor health.
- **Authoritative 6-DoF Physics Engine**: A deterministic flight dynamics model written in pure JavaScript that runs at a strict 60 FPS without relying on third-party black-box engines like Ammo or Cannon.
- **Dynamic Environmental Physics**: Real-time manipulation of wind, turbulence, and air density (temperature) which actively disturb the aircraft's physical state.
- **Flight Coach & Educational System**: Real-time evaluation of objectives (e.g., hover stability, payload tests, motor failure recovery) driven by an isolated Scenario Engine.
- **Telemetry & Analysis**: Bounded post-flight debriefing and live Heads-Up Display (HUD) displaying positional, battery, and diagnostic data.
- **External Simulator Readiness**: Architecture explicitly designed to decouple the UI from internal physics, laying the foundation for future connections to PX4 Autopilot or Gazebo (via robust Adapter interfaces).

## Technology Stack

- **Framework**: Next.js 15 (React 19)
- **3D Rendering**: Three.js (@react-three/fiber, @react-three/drei)
- **Styling**: Tailwind CSS
- **Persistence**: Firebase Firestore (Authentication & Data) / LocalStorage Fallback
- **State Management**: React Context, Refs, and pure class-based Singletons (for physics)

## Setup & Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env.local` file with your Firebase configuration. See `.env.example` for the required keys.
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

## Architecture Overview

The system strictly decouples **React Rendering (UI)** from the **6-DoF Physics Loop**. React is driven by a throttled 20Hz telemetry broadcast, ensuring the 60Hz physics solver remains deterministic and computationally lightweight.

For detailed architecture documentation, see [FINAL_ARCHITECTURE.md](./docs/FINAL_ARCHITECTURE.md).

## Future Work

Currently, Drone Pilot serves as an educational internal simulation. The interface layers for external adapters (`PX4SimulationAdapter` and `GazeboSimulationAdapter`) are fully stubbed and architecturally ready, but live network bindings (e.g., `rosbridge`, `mavlink2rest`) are left as future extensions.
