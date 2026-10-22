# DRONE PILOT — Airspace Multiplayer Synchronization Architecture

## 1. Overview
The DRONE PILOT multiplayer system provides real-time airspace synchronization, allowing multiple pilots to share the same island airspace, visual contact, and flight telemetry.

---

## 2. Airspace Telemetry Packet Schema

```typescript
export interface MultiplayerPacket {
  type: "telemetry" | "join" | "leave" | "chat" | "helipad_claim";
  senderId: string;
  callsign: string;
  regionId: string;
  timestamp: number;
  payload: {
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    rotation: { pitch: number; roll: number; yaw: number };
    groundSpeedKmh: number;
    altitudeAgl: number;
    rotorRpmPercent: number;
    flightMode: string;
    droneModelId: string;
  };
}
```

---

## 3. Dead Reckoning & Spatial Interpolation

To ensure smooth 60 FPS remote aircraft rendering across variable network latencies, the `RemoteDroneManager` uses dead-reckoning extrapolation combined with exponential smoothing:

$$\vec{p}_{\text{estimated}}(t + \Delta t) = \vec{p}_{\text{last}} + \vec{v}_{\text{last}} \cdot \Delta t$$

$$\vec{p}_{\text{rendered}} = \text{lerp}(\vec{p}_{\text{rendered}}, \vec{p}_{\text{estimated}}, \alpha), \quad \alpha = \min(1.0, \Delta t \cdot 15.0)$$

Rotations are interpolated in spherical space to prevent gimbal wrap artifacts.

---

## 4. Collision-Free Helipad Spawn Allocator

When multiple drones spawn at the same facility (e.g. `training-alpha`):
1. The client registers its intent on the channel.
2. If another aircraft is within $5.0\text{m}$ of the primary pad, the dynamic allocator shifts the initial spawn position by a radial displacement:
   $$\Delta x = R \cdot \cos\left(\frac{2\pi \cdot k}{N}\right), \quad \Delta z = R \cdot \sin\left(\frac{2\pi \cdot k}{N}\right)$$
3. This guarantees clean, non-overlapping simultaneous takeoffs without airframe collision.

---

## 5. 3D Floating Nameplate & Callsign Billboards

Each remote drone in the Three.js scene graph carries an automated billboard sprite:
* Procedurally drawn High-DPI HTML5 canvas.
* Displays Pilot Callsign (e.g. `PILOT-412`), Flight Mode (`HOVER`, `MANUAL`), and Altitude.
* Rotates automatically to face the active chase/FPV camera viewpoint.
