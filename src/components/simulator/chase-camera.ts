// ==========================================================
// DRONE PILOT — CHASE CAMERA CONTROLLER
// Cinematic 3rd-Person Spring-Damped Follow Camera,
// FPV Gimbal Cockpit View, and Tactical Top-Down Mode.
// Scroll-to-Zoom supported. Aircraft-size-adaptive framing.
// ==========================================================

import * as THREE from "three";
import { TelemetryState } from "@/lib/simulation/types";

export type CameraMode = "chase" | "fpv" | "topdown";

export class ChaseCameraController {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = "chase";

  // Zoom state (meters from target)
  private followDistance = 4.5;
  private minFollowDistance = 1.5;
  private maxFollowDistance = 40.0;

  private currentPos    = new THREE.Vector3(0, 3.2, 4.5);
  private currentLookAt = new THREE.Vector3(0, 0.5, 0);

  // Orbit drag state
  public orbitYaw   = 0;
  public orbitPitch = 0.15;   // slight upward initial orbit for hero presentation
  public isOrbiting = false;

  constructor(fov = 55, aspect = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.12, 6000);
    this.camera.position.set(0, 3.2, 4.5);
  }

  /**
   * Set camera follow distance and zoom limits appropriate for the aircraft size.
   * Call once after the drone mesh is built, before the first frame.
   */
  public setInitialFramingForAircraft(type: string) {
    // Distances are chosen so the aircraft occupies 25-35% of the viewport height
    // at the default FOV=55°, which feels like professional simulation framing.
    switch (type) {
      case "octacopter":
        this.followDistance    = 3.8;
        this.minFollowDistance = 2.0;
        this.maxFollowDistance = 45.0;
        break;
      case "hexacopter":
        this.followDistance    = 3.2;
        this.minFollowDistance = 1.8;
        this.maxFollowDistance = 42.0;
        break;
      case "quadcopter":
      default:
        this.followDistance    = 2.6;
        this.minFollowDistance = 1.5;
        this.maxFollowDistance = 38.0;
        break;
    }
  }

  public setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  public setMode(mode: CameraMode): CameraMode {
    this.mode = mode;
    return this.mode;
  }

  public cycleMode(): CameraMode {
    if (this.mode === "chase")   this.mode = "fpv";
    else if (this.mode === "fpv") this.mode = "topdown";
    else                          this.mode = "chase";
    return this.mode;
  }

  /**
   * Adjust follow distance by scroll delta.
   * delta > 0 → scroll down → zoom out; delta < 0 → scroll up → zoom in.
   * Uses exponential feel for smooth zoom at all distances.
   */
  public adjustZoom(delta: number) {
    const factor = 1.0 + Math.sign(delta) * Math.min(0.15, Math.abs(delta) * 0.002);
    // Adjust optical zoom (FOV) instead of physical distance to maintain perspective
    this.camera.fov = Math.max(15, Math.min(100, this.camera.fov * factor));
    this.camera.updateProjectionMatrix();
  }

  public getFollowDistance(): number {
    return this.followDistance;
  }

  public setOrbitDelta(deltaX: number, deltaY: number) {
    this.orbitYaw -= deltaX * 0.007;
    // Allows steep overhead (+1.25 rad) down to slight below-horizon (-0.9 rad)
    this.orbitPitch = Math.max(-0.90, Math.min(1.25, this.orbitPitch + deltaY * 0.006));
    this.isOrbiting = true;
  }

  public stopOrbiting() {
    this.isOrbiting = false;
  }

  public resetOrbit() {
    this.orbitYaw   = 0;
    this.orbitPitch = 0.15;
    this.followDistance = (() => {
      // Keep current type-appropriate distance on reset
      return this.followDistance;
    })();
    this.isOrbiting = false;
  }

  public update(telemetry: TelemetryState, dt: number) {
    const dronePos = new THREE.Vector3(
      telemetry.position.x,
      telemetry.position.y,
      telemetry.position.z
    );
    const droneYaw = telemetry.rotation.yaw + this.orbitYaw;

    // Gently align orbit yaw back with flight heading when traveling fast
    if (!this.isOrbiting && telemetry.groundSpeed > 15) {
      this.orbitYaw *= 0.985;
    }

    if (this.mode === "chase") {
      // ── Third-Person Spherical Orbit Follow Cam ───────────────────────
      const effectivePitch = this.orbitPitch + 0.45;
      const clampedPitch   = Math.max(-0.5, Math.min(1.35, effectivePitch));
      const horizDist = this.followDistance * Math.cos(clampedPitch);
      const vertDist  = this.followDistance * Math.sin(clampedPitch);

      const targetX = dronePos.x - Math.sin(droneYaw) * horizDist;
      const targetZ = dronePos.z - Math.cos(droneYaw) * horizDist;
      // Ensure camera stays safely above terrain (at least 0.8m)
      const targetY = Math.max(0.8, dronePos.y + vertDist + 0.6);

      const targetPos    = new THREE.Vector3(targetX, targetY, targetZ);
      // Look slightly above drone centre for a more cinematic frame
      const targetLookAt = dronePos.clone().add(new THREE.Vector3(0, 0.35, 0));

      // Smooth lerp — fast enough to be responsive, slow enough to avoid jitter
      const lerpSpeed = Math.min(1.0, dt * 10.0);
      this.currentPos.lerp(targetPos, lerpSpeed);
      this.currentLookAt.lerp(targetLookAt, lerpSpeed);

      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLookAt);

    } else if (this.mode === "fpv") {
      // ── Nose FPV Cockpit View ─────────────────────────────────────────
      const forwardX = -Math.sin(telemetry.rotation.yaw);
      const forwardZ = -Math.cos(telemetry.rotation.yaw);

      const eyePos  = dronePos.clone().add(new THREE.Vector3(forwardX * 0.25, -0.02, forwardZ * 0.25));
      const lookPos = eyePos.clone().add(new THREE.Vector3(forwardX * 20.0, -0.4, forwardZ * 20.0));

      this.camera.position.copy(eyePos);
      this.camera.lookAt(lookPos);

    } else if (this.mode === "topdown") {
      // ── Tactical Top-Down View ────────────────────────────────────────
      const topDistance = Math.max(12, this.followDistance * 4.0);
      const targetPos   = dronePos.clone().add(new THREE.Vector3(0, topDistance, 0.01));
      this.currentPos.lerp(targetPos, dt * 10.0);
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(dronePos);
    }
  }
}
