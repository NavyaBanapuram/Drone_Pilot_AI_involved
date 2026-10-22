# DRONE PILOT — DRONE RENDERING & FLIGHT ANIMATION ARCHITECTURE

## 1. System Overview

The Drone Rendering and Animation system in DRONE PILOT is built upon a strict decoupling between **Physical Simulation** (`FlightPhysicsEngine`) and **Visual Drone Representation** (`ModularDrone`).

The physical simulation runs deterministically at 60Hz, calculating:
- Rigid body 6-DoF dynamics (mass, inertia, translational and angular accelerations)
- Motor mixing and battery voltage sag authority
- Aerodynamic drag and 3D turbulent wind forces
- Contact collision with physical terrain and AABB obstacles

The visual system translates this telemetry stream into a rich, believable, modern civilian multirotor without injecting false or fighting physics.

---

## 2. 3D Model Hierarchy (`ModularDrone`)

```
ModularDrone.group (THREE.Group)
├── Fuselage Group
│   ├── Bottom Structural Carbon Tub (sloped keel)
│   ├── Main Mid-Hull Deck (electronics enclosure)
│   ├── Sculpted Aerodynamic Nose Canopy (Front Indicator)
│   ├── Dual Forward Inspection Headlights (Warm White)
│   ├── Forward Stereo Obstacle-Avoidance Vision Eyes (Sapphire Lenses)
│   ├── Top RTK GNSS Antenna Disc (Metallic Bezel & Carbon Core)
│   ├── Top Aluminum Heat-Sink Cooling Fins
│   ├── Rear Quick-Release Battery Cartridge (Rear Indicator)
│   ├── 4-Segment Real-Time Battery Fuel Gauge LEDs
│   ├── Rear High-Intensity Anti-Collision Strobe Beacon (1.0 Hz Pulse)
│   └── Downward Optical Flow & LiDAR Sensor Pod
│
├── 3-Axis Stabilized Camera Gimbal (`gimbalGroup`)
│   ├── Vibration Damper Plate
│   ├── Yaw Motor Housing
│   ├── Roll Arm & Motor (`gimbalRollArm`)
│   └── Pitch Bracket & Camera Pod (`cameraPod`)
│       ├── Main Inspection Camera Barrel
│       ├── Titanium Lens Bezel
│       └── Coated Optical Front Element (AR Cyan Internal Glow)
│
├── Structural Arms & Motor Array (Quad / Hexa / Octa)
│   └── For each motor index i:
│       ├── CNC Fuselage Root Collar Clamp
│       ├── Streamlined Carbon Spar (Oval Aerodynamic Cross-Section)
│       ├── Orange Leading-Edge Accent Stripe (Front Arms Only)
│       ├── Aerodynamic Motor Nacelle & Top Mounting Bracket
│       ├── Brushless Outrunner Motor (Anodized Bell & Visible Copper Stator)
│       ├── Aviation Navigation LED (Starboard = Green, Port = Red)
│       ├── Motor-Integrated Angled Landing Gear Strut
│       ├── Silicone Elastomer Vibration Damper Foot
│       └── Dual-State Propeller Assembly (`propAssemblyGroup`)
│           ├── Aerodynamic Blade Group (Twisted Airfoil & Safety Tips)
│           └── Procedural Radial Motion Blur Disc (High-RPM Specular Sheen)
│
├── Particle Damage VFX (Activated on Crash)
│   ├── Billowing Smoke (`THREE.Points`)
│   └── High-Voltage Electrical Sparks (`THREE.Points`)
│
├── Pilot Callsign HUD Billboard (`THREE.Sprite`)
└── Ground Contact Soft Shadow Decal (`groundShadowMesh`, projected on terrain)
```

---

## 3. Motor & Propeller Mapping

### Quadcopter X-Configuration
- **Motor 0 (Front-Right / Starboard)**: Direction `+1` (CW), Green Nav LED, Motor Output `[0]`
- **Motor 1 (Rear-Right / Starboard)**: Direction `-1` (CCW), Green Nav LED, Motor Output `[1]`
- **Motor 2 (Rear-Left / Port)**: Direction `+1` (CW), Red Nav LED, Motor Output `[2]`
- **Motor 3 (Front-Left / Port)**: Direction `-1` (CCW), Red Nav LED, Motor Output `[3]`

Hexacopter and Octacopter dynamically position motors radially and alternate CW/CCW directions.

---

## 4. Dual-State Propeller Dynamics & Motion Blur

At high RPM, physical drone propellers turn into a translucent disc rather than remaining as distinct rigid blades. `ModularDrone` implements a dual-state representation:

| RPM / Throttle Range | Blade Opacity | Blur Disc Opacity | Visual Representation |
|---|---|---|---|
| **Idle (< 18%)** | `1.0` (Sharp) | `0.0` (Hidden) | Crisp aerodynamic twisted blades |
| **Cruising (18% – 55%)** | `1.0 → 0.35` | `0.0 → 0.70` | Blades blur into motion streak disc |
| **High Speed (> 55%)** | `0.22` (Ghosting) | `0.82` (Active) | High-speed radial blur disc with specular sheen |

Each propeller rotates and blends blur based on its **individual motor output** (`telemetry.motorOutputs[i]`), reflecting differential thrust during flight maneuvers.

---

## 5. Active 3-Axis Gimbal Stabilization

To simulate a motorized inspection camera gimbal, the camera pod counter-rotates relative to the drone's attitude:
```ts
const counterPitch = -this.visualPitch * 0.92;
const counterRoll = -this.visualRoll * 0.88;
this.cameraPod.rotation.x = counterPitch;
this.gimbalRollArm.rotation.z = counterRoll;
```
When the drone pitches forward 15° to accelerate, the camera tilts up to maintain a level view of the horizon.

---

## 6. Flight Attitude Smoothing & Hover Micro-Dynamics

- **Fast Exponential Smoothing**: Visual pitch and roll track simulated attitude with exponential damping (`dt * 28.0`), eliminating micro-stutter while preserving 1:1 control responsiveness.
- **Organic Hover Micro-Stabilization**: When airborne (`altitude > 0.08m`), microscopic high-frequency stabilization corrections (0.15°–0.25° amplitude) simulate active PID loop compensation, preventing the drone from looking like a frozen static mesh.
- **Ground Settle**: On ground, micro-movements are disabled and the silicone damper feet rest firmly on the surface.

---

## 7. Anti-Collision & Status Avionics

- **Anti-Collision Strobe**: Rear white beacon flashes at 1.0 Hz with an 80ms pulse.
- **Battery Fuel Gauge**: 4 green/amber/red LEDs reflect real-time battery charge (`telemetry.batteryLevel`).
- **FAA Navigation Lights**: Red on Port (Left), Green on Starboard (Right).
- **Inspection Headlights**: Dual forward warm-white spotlights provide orientation and illumination.

---

## 8. Multiplayer Representation

`RemoteDroneManager` uses an updated professional multirotor model for peer pilots with:
- Cobalt blue aeronautical chassis
- Streamlined carbon arms and motor nacelles
- Aviation navigation LEDs (Red/Green)
- Animated rotating propellers
- Smooth network position and Euler rotation interpolation
