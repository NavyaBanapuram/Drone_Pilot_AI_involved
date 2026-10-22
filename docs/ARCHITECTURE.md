# DRONE PILOT — System Architecture Documentation

## 1. Executive Summary
**DRONE PILOT** is a high-fidelity, web-based multirotor flight simulation platform designed for aerospace training, mission planning, and aeronautical education. The architecture decouples simulation dynamics, environmental physics, 3D WebGL rendering, and flight telemetry into modular, testable, and reusable subsystems.

---

## 2. High-Level System Architecture

```
+-----------------------------------------------------------------------+
|                              USER CLIENT                              |
+-----------------------------------------------------------------------+
|  Next.js 14 App Router (React 18 + Tailwind CSS + Lucide Avionics)    |
|                                                                       |
|  +--------------------+  +--------------------+  +-----------------+  |
|  | Flight Prep Flow   |  | Cockpit HUD        |  | Post-Flight     |  |
|  | (Region & Helipad, |  | (Horizon, Motors,  |  | Analysis &      |  |
|  | Payload & Weather) |  | Compass, Minimap)  |  | Replay Engine   |  |
|  +--------------------+  +--------------------+  +-----------------+  |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|                      FLIGHT SIMULATION PROVIDER                       |
|                       (ISimulationProvider)                           |
+-----------------------------------------------------------------------+
|  [BrowserSimulationProvider]          [PX4SimulationProvider]         |
|  6-DoF Numerical RK4/Euler            MAVLink WebSocket Gateway       |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  |                      SIMULATION ENGINE CORE                     |  |
|  |                                                                 |  |
|  |  +-------------------+  +-------------------+  +--------------+ |  |
|  |  | Flight Physics    |  | Motor Mixer       |  | LiPo Battery | |  |
|  |  | 6-DoF Rigid Body  |  | Quad / Hex / Oct  |  | Internal Res | |  |
|  |  +-------------------+  +-------------------+  +--------------+ |  |
|  |  +-------------------+  +-------------------+  +--------------+ |  |
|  |  | Environment Engine|  | Incident Detector |  | Telemetry    | |  |
|  |  | Wind, Temp, Rain  |  | Collision & Energy|  | 20Hz Stream  | |  |
|  |  +-------------------+  +-------------------+  +--------------+ |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
          |                                            |
          v                                            v
+-----------------------+                    +-----------------------+
|    THREE.JS 3D SCENE  |                    |  MULTIPLAYER NETWORK  |
+-----------------------+                    +-----------------------+
| - 2000m Island Mesh   |                    | - Peer Discovery      |
| - Biome Runways & Pads|                    | - Dead Reckoning      |
| - Dynamic Water Waves |                    | - Airspace Tracking   |
| - Remote Drone Avatars|                    | - Non-colliding Spawns|
+-----------------------+                    +-----------------------+
```

---

## 3. Directory Layout & Module Responsibilities

```
src/
├── app/
│   ├── fly/
│   │   ├── page.tsx            # Simulator entry point & staging
│   │   └── select/page.tsx     # Flight preparation & deployment flow
│   ├── dashboard/page.tsx      # Drone fleet hanger & specifications
│   └── login/page.tsx          # Pilot authentication
├── components/
│   ├── simulator/
│   │   ├── flight-simulator.tsx             # 3D canvas lifecycle coordinator
│   │   ├── telemetry-hud.tsx                # Industry-grade avionics HUD
│   │   ├── environment-control-panel.tsx    # Live meteorological control modal
│   │   ├── tutorial-overlay.tsx             # Step-by-step flight academy guidance
│   │   ├── chase-camera.tsx                 # 3-mode aeronautical camera
│   │   ├── analysis/
│   │   │   └── flight-analysis-modal.tsx    # Post-flight incident report & debrief
│   │   ├── replay/
│   │   │   └── flight-replay-modal.tsx      # Scrubbable 20Hz telemetry playback
│   │   ├── multiplayer/
│   │   │   ├── multiplayer-roster-widget.tsx# Connected pilot airspace roster
│   │   │   └── remote-drone-manager.ts      # 3D remote drone interpolator & labels
│   │   ├── loading/
│   │   │   └── simulation-loading-screen.tsx# Phased aeronautical asset boot
│   │   └── debug/
│   │       ├── physics-debug-hud.tsx        # 6-DoF dynamic forces telemetry HUD
│   │       └── terrain-debug-hud.tsx        # Terrain elevation diagnostics
│   └── flight-prep/
│       ├── flight-prep-container.tsx        # Preparation page state manager
│       ├── flight-config-summary.tsx        # Manifest, payload & weather card
│       ├── world-map-selector.tsx           # Interactive island tactical map
│       └── helipad-selector.tsx             # Precision takeoff pad selector
├── lib/
│   ├── simulation/
│   │   ├── types.ts                # Strict TypeScript avionics data schemas
│   │   ├── flight-physics.ts       # 6-DoF rigid-body aerodynamics solver
│   │   ├── motor-mixer.ts          # Geometric multirotor thrust distribution
│   │   ├── battery-model.ts        # Electrochemical LiPo voltage sag dynamics
│   │   ├── environment-model.ts    # Atmosphere, turbulence & wind model
│   │   ├── flight-recorder.ts      # Telemetry logger & post-flight forensics
│   │   ├── educational-engine.ts   # Real-time event->cause->action advisories
│   │   └── simulation-provider.ts  # Digital twin abstraction interface
│   ├── multiplayer/
│   │   ├── multiplayer-types.ts    # Airspace telemetry synchronization packet
│   │   └── multiplayer-client.ts   # Network synchronization client
│   └── world/
│       ├── terrain-math.ts         # Single-source deterministic elevation function
│       ├── region-definitions.ts   # 8 registered world zones
│       ├── helipad-definitions.ts  # 9 registered precision helipads
│       └── spawn-system.ts         # Query-driven spawn point resolver
```

---

## 4. Key Engineering Standards
1. **Single Source of Ground Elevation**: Both the WebGL vertex shaders/geometry and the CPU flight physics engine share `evaluateIslandElevation(x, z)` from `terrain-math.ts` down to sub-millimeter precision.
2. **Fixed Frequency Avionics**: Physics runs at delta-time integration up to 120Hz; UI telemetry syncs at a steady 20Hz (50ms interval) to maximize framerate while eliminating React state thrashing.
3. **Decoupled Architecture**: Physics engine instances contain zero DOM or WebGL dependencies, allowing headless unit testing and digital twin server-side simulation.
