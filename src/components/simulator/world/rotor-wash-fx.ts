// ==========================================================
// DRONE PILOT â€” DYNAMIC ROTOR DOWNWASH & CONTACT FX (PUBG-GRADE)
// Downward rotor wash: Water ripples & spray over water, dust & grass vortex over land
// ==========================================================

import * as THREE from "three";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";

export class RotorWashFX {
  public group = new THREE.Group();

  // Water ripple ring mesh
  private waterRippleMesh: THREE.Mesh;
  private waterRippleMat: THREE.MeshBasicMaterial;

  // Ground dust particle system
  private dustParticles: THREE.Points;
  private dustGeo: THREE.BufferGeometry;
  private dustPositions: Float32Array;
  private dustVelocities: Float32Array;
  private dustCount = 200;

  // Water spray particle system
  private sprayParticles: THREE.Points;
  private sprayGeo: THREE.BufferGeometry;
  private sprayPositions: Float32Array;
  private sprayVelocities: Float32Array;
  private sprayCount = 180;

  private createParticleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1.0)");
      grad.addColorStop(0.3, "rgba(255,255,255,0.7)");
      grad.addColorStop(1, "rgba(255,255,255,0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.format = THREE.RGBAFormat;
    tex.premultiplyAlpha = false;
    return tex;
  }

  constructor() {
    const particleTex = this.createParticleTexture();

    // 1. Water Ripple Disc
    const rippleGeo = new THREE.RingGeometry(0.3, 4.5, 32);
    rippleGeo.rotateX(-Math.PI / 2);
    this.waterRippleMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      alphaTest: 0.05,
    });
    this.waterRippleMesh = new THREE.Mesh(rippleGeo, this.waterRippleMat);
    this.waterRippleMesh.position.set(0, 0.08, 0);
    this.group.add(this.waterRippleMesh);

    // 2. Ground Dust Particles
    this.dustPositions = new Float32Array(this.dustCount * 3);
    this.dustVelocities = new Float32Array(this.dustCount * 3);
    this.dustGeo = new THREE.BufferGeometry();

    for (let i = 0; i < this.dustCount; i++) {
      this.dustPositions[i * 3] = 0;
      this.dustPositions[i * 3 + 1] = -100; // Hidden initially
      this.dustPositions[i * 3 + 2] = 0;
    }
    this.dustGeo.setAttribute("position", new THREE.BufferAttribute(this.dustPositions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0xa8a29e, // Warm dust brown
      size: 0.45,
      map: particleTex,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      alphaTest: 0.05,
    });
    this.dustParticles = new THREE.Points(this.dustGeo, dustMat);
    this.group.add(this.dustParticles);

    // 3. Water Spray Particles
    this.sprayPositions = new Float32Array(this.sprayCount * 3);
    this.sprayVelocities = new Float32Array(this.sprayCount * 3);
    this.sprayGeo = new THREE.BufferGeometry();

    for (let i = 0; i < this.sprayCount; i++) {
      this.sprayPositions[i * 3] = 0;
      this.sprayPositions[i * 3 + 1] = -100;
      this.sprayPositions[i * 3 + 2] = 0;
    }
    this.sprayGeo.setAttribute("position", new THREE.BufferAttribute(this.sprayPositions, 3));

    const sprayMat = new THREE.PointsMaterial({
      color: 0xe0f2fe, // Crisp white-water spray
      size: 0.32,
      map: particleTex,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      alphaTest: 0.05,
    });
    this.sprayParticles = new THREE.Points(this.sprayGeo, sprayMat);
    this.group.add(this.sprayParticles);
  }

  /**
   * Evaluates downwash intensity based on drone altitude above ground (AGL)
   */
  public update(dt: number, elapsed: number, dronePos: THREE.Vector3, thrust = 1.0) {
    const terrainElev = evaluateIslandElevation(dronePos.x, dronePos.z).elevation;
    const isOverWater = terrainElev <= 0.2 || (dronePos.x < -200 && dronePos.x > -350 && dronePos.z < -100 && dronePos.z > -250);
    const surfaceY = isOverWater ? Math.max(0.05, terrainElev) : terrainElev;

    const agl = dronePos.y - surfaceY;

    // Downwash only triggers when drone is below 8 meters AGL
    if (agl <= 0 || agl > 7.5) {
      this.waterRippleMat.opacity = THREE.MathUtils.lerp(this.waterRippleMat.opacity, 0.0, 0.1);
      return;
    }

    const proximityFactor = 1.0 - agl / 7.5; // 0 at 7.5m, 1.0 on ground
    const downwashPower = proximityFactor * thrust;

    if (isOverWater) {
      // 1. Water Ripple Effect
      this.waterRippleMesh.position.set(dronePos.x, surfaceY + 0.04, dronePos.z);
      const pulseScale = 1.0 + (elapsed * 3.5) % 2.5;
      this.waterRippleMesh.scale.set(pulseScale, 1.0, pulseScale);
      this.waterRippleMat.opacity = downwashPower * 0.75 * (1.0 - (pulseScale - 1.0) / 2.5);

      // 2. Water Spray Mist Emitter
      const posAttr = this.sprayGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.sprayCount; i++) {
        let py = this.sprayPositions[i * 3 + 1];

        if (py < surfaceY - 0.2 || Math.random() < 0.06) {
          // Re-spawn droplet at contact center
          const angle = Math.random() * Math.PI * 2;
          const speed = (2.0 + Math.random() * 4.0) * downwashPower;
          this.sprayPositions[i * 3] = dronePos.x + Math.cos(angle) * 0.4;
          this.sprayPositions[i * 3 + 1] = surfaceY + 0.08;
          this.sprayPositions[i * 3 + 2] = dronePos.z + Math.sin(angle) * 0.4;

          this.sprayVelocities[i * 3] = Math.cos(angle) * speed;
          this.sprayVelocities[i * 3 + 1] = 0.4 + Math.random() * 1.2 * downwashPower;
          this.sprayVelocities[i * 3 + 2] = Math.sin(angle) * speed;
        } else {
          // Physics step
          this.sprayPositions[i * 3] += this.sprayVelocities[i * 3] * dt;
          this.sprayPositions[i * 3 + 1] += this.sprayVelocities[i * 3 + 1] * dt - 4.8 * dt * dt; // gravity
          this.sprayPositions[i * 3 + 2] += this.sprayVelocities[i * 3 + 2] * dt;
        }
      }
      posAttr.needsUpdate = true;
    } else {
      // Over Land / Grass / Runway
      this.waterRippleMat.opacity = 0.0;

      // Dust & Grass Vortex Emitter
      const posAttr = this.dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.dustCount; i++) {
        let py = this.dustPositions[i * 3 + 1];

        if (py < surfaceY - 0.2 || Math.random() < 0.08) {
          // Re-spawn particle radially outward
          const angle = Math.random() * Math.PI * 2;
          const speed = (2.5 + Math.random() * 5.0) * downwashPower;
          this.dustPositions[i * 3] = dronePos.x + Math.cos(angle) * 0.5;
          this.dustPositions[i * 3 + 1] = surfaceY + 0.06;
          this.dustPositions[i * 3 + 2] = dronePos.z + Math.sin(angle) * 0.5;

          // Outward velocity + slight tangential swirl
          this.dustVelocities[i * 3] = (Math.cos(angle) + Math.sin(angle) * 0.3) * speed;
          this.dustVelocities[i * 3 + 1] = 0.2 + Math.random() * 0.8 * downwashPower;
          this.dustVelocities[i * 3 + 2] = (Math.sin(angle) - Math.cos(angle) * 0.3) * speed;
        } else {
          // Physics step
          this.dustPositions[i * 3] += this.dustVelocities[i * 3] * dt;
          this.dustPositions[i * 3 + 1] += this.dustVelocities[i * 3 + 1] * dt - 1.8 * dt * dt;
          this.dustPositions[i * 3 + 2] += this.dustVelocities[i * 3 + 2] * dt;
        }
      }
      posAttr.needsUpdate = true;
    }
  }
}






