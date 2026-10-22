// ==========================================================
// DRONE PILOT — MODULAR 3D DRONE (ENTERPRISE MATRICE SPEC)
// Hierarchical Component Architecture:
// Frame, Motors, Propellers (with Orange Tips), Battery,
// Flight Controller, RTK GNSS, Cameras, Landing Gear.
// ==========================================================

import * as THREE from "three";
import { DroneDefinition, TelemetryState } from "@/lib/simulation/types";
import { buildProfessionalUAV, LedMaterials } from "../ui/aircraft-model-builder";

interface PropellerAssembly {
  bladeGroup: THREE.Group;
  blurMesh: THREE.Mesh;
  blurMaterial: THREE.MeshBasicMaterial;
  bladeMaterial: THREE.MeshStandardMaterial;
  direction: 1 | -1;
  motorIndex: number;
}

export class ModularDrone {
  public group = new THREE.Group();
  /** Ground contact shadow decal — managed by the drone group internally. */
  public groundShadowMesh!: THREE.Mesh;
  public def: DroneDefinition;
  private propellers: PropellerAssembly[] = [];
  private armGroups: THREE.Group[] = [];
  private armOriginalAngles: number[] = [];
  private propGroups: THREE.Group[] = [];

  // Active 3-axis stabilized camera gimbal
  private gimbalGroup: THREE.Group | null = null;
  private gimbalRollArm: THREE.Group | null = null;
  private cameraPod: THREE.Group | null = null;

  // Battery gauge LEDs — use shared materials from builder (always initialized)
  private batteryLeds: THREE.Mesh[] = [];
  private readonly ledBatteryGreenMat = LedMaterials.green;
  private readonly ledBatteryAmberMat = LedMaterials.amber;
  private readonly ledBatteryRedMat   = LedMaterials.red;
  private readonly ledBatteryOffMat   = LedMaterials.off;

  // Anti-collision strobe
  private tailStrobeMesh: THREE.Mesh | null = null;
  private strobeMaterial!: THREE.MeshBasicMaterial;
  private strobeTimer = 0;
  private payloadGroup: THREE.Group | null = null;

  // Smoothing & visual attitude state
  private visualPos = new THREE.Vector3();
  private visualPitch = 0;
  private visualRoll = 0;
  private visualYaw = 0;
  private isInitialized = false;

  public isDamaged = false;
  private smokeParticles: THREE.Points | null = null;
  private smokePositions!: Float32Array;
  private sparkParticles: THREE.Points | null = null;
  private sparkPositions!: Float32Array;
  private nameTagSprite: THREE.Sprite | null = null;
  private pilotName = "PILOT";

  constructor(definition: DroneDefinition, pilotName = "PILOT") {
    this.def = definition;
    this.pilotName = pilotName;
    this.buildDrone();
    this.updateNameTag();
  }

  public setPilotName(name: string) {
    this.pilotName = name.toUpperCase();
    this.updateNameTag();
  }

  public setNameTagVisible(visible: boolean) {
    if (this.nameTagSprite) {
      this.nameTagSprite.visible = visible;
    }
  }

  private updateNameTag() {
    if (this.nameTagSprite) {
      this.group.remove(this.nameTagSprite);
      this.nameTagSprite.material.dispose();
      this.nameTagSprite = null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Minimal dark pill background
    ctx.fillStyle = "rgba(8, 9, 10, 0.82)";
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 80, 40);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Small orange dot
    ctx.fillStyle = "#FF5500";
    ctx.beginPath();
    ctx.arc(46, 48, 7, 0, Math.PI * 2);
    ctx.fill();

    // Pilot name
    const displayName = this.pilotName.length > 20 ? this.pilotName.substring(0, 18) + "…" : this.pilotName;
    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.font = "700 24px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(displayName, 68, 48);

    // YOU badge
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "600 16px monospace";
    ctx.textAlign = "right";
    ctx.fillText("YOU", 480, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: true,
      depthWrite: false,
    });
    this.nameTagSprite = new THREE.Sprite(spriteMat);
    this.nameTagSprite.position.set(0, 0.65, 0);
    this.nameTagSprite.scale.set(0.65, 0.13, 1);
    this.group.add(this.nameTagSprite);
  }


  public setDefinition(definition: DroneDefinition) {
    this.def = definition;
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.propellers = [];
    this.armGroups = [];
    this.armOriginalAngles = [];
    this.propGroups = [];
    this.batteryLeds = [];
    this.nameTagSprite = null;
    this.buildDrone();
    this.updateNameTag();
  }

  /**
   * Generates a realistic procedural radial motion-blur texture for high-RPM propellers.
   * Uses a bright white/light-grey semi-transparent disc so it is visible over ANY
   * background colour (green grass, dark runway, water, etc.).
   */
  private createPropBlurTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const center = size / 2;
    const outerRadius = size / 2 - 4;
    const innerHub   = outerRadius * 0.08;

    ctx.clearRect(0, 0, size, size);

    // 1. Frosted-glass disc: semi-transparent grey visible on any bg
    const baseGrad = ctx.createRadialGradient(center, center, innerHub, center, center, outerRadius);
    baseGrad.addColorStop(0.0,  "rgba(120,120,120,0.0)");
    baseGrad.addColorStop(0.12, "rgba(80,85,90,0.40)");
    baseGrad.addColorStop(0.55, "rgba(60,65,70,0.45)");
    baseGrad.addColorStop(0.82, "rgba(40,45,50,0.55)");
    baseGrad.addColorStop(1.0,  "rgba(20,25,30,0.0)");
    ctx.beginPath();
    ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // 2. Concentric motion-streak rings in darker grey
    for (let r = innerHub + 4; r < outerRadius - 6; r += 3.5) {
      const normR = (r - innerHub) / (outerRadius - innerHub);
      const alpha = Math.sin(normR * Math.PI) * 0.18 + 0.06;
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(30, 30, 30, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // 3. Blade tip safety-orange outer ring
    for (let r = outerRadius - 22; r < outerRadius - 2; r += 1.8) {
      const t = (r - (outerRadius - 22)) / 20;
      const alpha = Math.sin(t * Math.PI) * 0.85;
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 100, 0, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // 4. Specular sheen slash
    const grad = ctx.createLinearGradient(center - outerRadius, center - outerRadius, center + outerRadius, center + outerRadius);
    grad.addColorStop(0.0,  "rgba(255,255,255,0.0)");
    grad.addColorStop(0.42, "rgba(255,255,255,0.0)");
    grad.addColorStop(0.50, "rgba(255,255,255,0.15)");
    grad.addColorStop(0.58, "rgba(255,255,255,0.0)");
    grad.addColorStop(1.0,  "rgba(255,255,255,0.0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // 5. Soft feathered edge
    const edgeGrad = ctx.createRadialGradient(center, center, outerRadius - 18, center, center, outerRadius);
    edgeGrad.addColorStop(0, "rgba(0,0,0,0.0)");
    edgeGrad.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = edgeGrad;
    ctx.beginPath();
    ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.format = THREE.RGBAFormat;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  private buildDrone() {
    // Generate the canonical visual drone matching the Hangar perfectly
    const parts = buildProfessionalUAV(this.def.type as any);

    this.group.add(parts.rootGroup);

    this.gimbalGroup = parts.gimbalGroup;
    this.gimbalRollArm = parts.gimbalGroup; // Fallback mapping
    this.cameraPod = parts.cameraPitchGroup;

    this.batteryLeds = parts.batteryLeds;
    this.tailStrobeMesh = parts.tailStrobe;

    // Create a dummy empty payload group so the update loop doesn't crash
    this.payloadGroup = new THREE.Group();
    this.payloadGroup.visible = false;
    this.group.add(this.payloadGroup);

    const propBlurTex = this.createPropBlurTexture();

    // Compute inter-motor min distance to derive accurate prop radius for blur disc
    let minMotorDist = Infinity;
    for (let i = 0; i < this.def.motors.length; i++) {
      for (let j = i + 1; j < this.def.motors.length; j++) {
        const dx = this.def.motors[i].position.x - this.def.motors[j].position.x;
        const dz = this.def.motors[i].position.z - this.def.motors[j].position.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < minMotorDist) minMotorDist = d;
      }
    }
    const propRadius = minMotorDist * 0.38;
    const blurDiscDiameter = propRadius * 2.0;

    parts.propellers.forEach((p) => {
      // High-RPM motion-blur disc — sized to match actual propeller sweep area
            const blurDiscGeo = new THREE.CircleGeometry(blurDiscDiameter / 2, 32);
      const blurDiscMat = new THREE.MeshBasicMaterial({
        map: propBlurTex,
        transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide,
      });
      const blurMesh = new THREE.Mesh(blurDiscGeo, blurDiscMat);
      blurMesh.rotation.x = -Math.PI / 2;
      blurMesh.position.y = 0.005;
      p.bladeGroup.add(blurMesh);

      // Override blade material with transparent-capable version for blur cross-fade
      const bladeMaterial = new THREE.MeshStandardMaterial({
        color: 0x4f545e,
        roughness: 0.32,
        metalness: 0.22,
        transparent: true,
        opacity: 1.0,
        depthWrite: true, // Fixed occlusion
      });

      p.bladeGroup.traverse((c) => {
        if ((c as THREE.Mesh).isMesh && c !== blurMesh) {
          (c as THREE.Mesh).material = bladeMaterial;
        }
      });

      this.propellers.push({
        bladeGroup:   p.bladeGroup,
        blurMesh,
        blurMaterial: blurDiscMat,
        bladeMaterial,
        direction:    p.direction,
        motorIndex:   p.motorIndex,
      });

      // Track prop and arm groups for crash FX
      this.armGroups.push(p.bladeGroup.parent?.parent as THREE.Group);
      this.propGroups.push(p.bladeGroup.parent as THREE.Group);
    });

    this.buildCrashFX();

    this.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh) !== this.groundShadowMesh) {
        child.castShadow = true;
      }
    });
    
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(0,0,0,0.55)");
      grad.addColorStop(0.35, "rgba(0,0,0,0.28)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    // Shadow diameter: ~2× the aircraft motor-tip diameter
    const shadowSize = Math.max(1.8, minMotorDist * 4.2);
    this.groundShadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(shadowSize, shadowSize),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, alphaTest: 0.02 })
    );
    this.groundShadowMesh.rotation.x = -Math.PI / 2;
    this.groundShadowMesh.position.y = -0.12;
    // Shadow lives inside this.group — do NOT add it to scene separately.
    this.group.add(this.groundShadowMesh);
  }



  /**
   * Builds billowing smoke and sparking particle systems for visual crash damage
   */
  private buildCrashFX() {
    // 1. Billowing Dark Smoke
    const smokeCount = 50;
    this.smokePositions = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount; i++) {
      this.smokePositions[i * 3] = (Math.random() - 0.5) * 0.2;
      this.smokePositions[i * 3 + 1] = Math.random() * 0.9;
      this.smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }
    const smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(this.smokePositions, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0x1f2937,
      size: 0.25,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    this.smokeParticles = new THREE.Points(smokeGeo, smokeMat);
    this.smokeParticles.visible = false;
    this.group.add(this.smokeParticles);

    // 2. High-Voltage Electrical Sparks
    const sparkCount = 35;
    this.sparkPositions = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      this.sparkPositions[i * 3] = (Math.random() - 0.5) * 0.25;
      this.sparkPositions[i * 3 + 1] = Math.random() * 0.4;
      this.sparkPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.25;
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(this.sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.09,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    this.sparkParticles = new THREE.Points(sparkGeo, sparkMat);
    this.sparkParticles.visible = false;
    this.group.add(this.sparkParticles);
  }

  public setDamaged(damaged: boolean) {
    this.isDamaged = damaged;

    if (damaged) {
      if (this.armGroups[0]) {
        this.armGroups[0].rotation.z = -0.65;
        this.armGroups[0].rotation.x = 0.45;
      }
      if (this.armGroups[1]) {
        this.armGroups[1].rotation.z = 0.52;
        this.armGroups[1].rotation.x = -0.38;
      }
      if (this.propGroups[0]) {
        this.propGroups[0].visible = false;
      }
      if (this.propGroups[1]) {
        this.propGroups[1].scale.set(0.25, 0.25, 0.25);
      }
      if (this.smokeParticles) this.smokeParticles.visible = true;
      if (this.sparkParticles) this.sparkParticles.visible = true;
    } else {
      this.armGroups.forEach((arm, i) => {
        arm.rotation.set(0, this.armOriginalAngles[i] || 0, 0);
      });
      this.propGroups.forEach((prop) => {
        prop.visible = true;
        prop.scale.set(1, 1, 1);
      });
      if (this.smokeParticles) this.smokeParticles.visible = false;
      if (this.sparkParticles) this.sparkParticles.visible = false;
    }
  }

  /**
   * Master frame-by-frame visual simulation update.
   * Integrates physics attitude smoothing, dual-state propeller blur,
   * active 3-axis camera gimbal stabilization, hover micro-corrections,
   * battery status gauge, anti-collision beacon, and ground shadow.
   */
  public update(telemetry: TelemetryState, dt: number) {
    // 1. Crash State Transition
    const isCrashed = !!telemetry.isCrashed;
    if (isCrashed !== this.isDamaged) {
      this.setDamaged(isCrashed);
    }

    // 2. Animate Crash Particles
    if (this.isDamaged) {
      if (this.smokePositions && this.smokeParticles) {
        for (let i = 0; i < this.smokePositions.length / 3; i++) {
          this.smokePositions[i * 3 + 1] += dt * 0.85;
          this.smokePositions[i * 3] += (Math.random() - 0.5) * dt * 0.18;
          this.smokePositions[i * 3 + 2] += (Math.random() - 0.5) * dt * 0.18;
          if (this.smokePositions[i * 3 + 1] > 1.8) {
            this.smokePositions[i * 3 + 1] = 0.05;
            this.smokePositions[i * 3] = (Math.random() - 0.5) * 0.2;
            this.smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
          }
        }
        this.smokeParticles.geometry.attributes.position.needsUpdate = true;
      }

      if (this.sparkPositions && this.sparkParticles) {
        for (let i = 0; i < this.sparkPositions.length / 3; i++) {
          this.sparkPositions[i * 3 + 1] += (Math.random() - 0.45) * dt * 2.0;
          this.sparkPositions[i * 3] += (Math.random() - 0.5) * dt * 1.6;
          this.sparkPositions[i * 3 + 2] += (Math.random() - 0.5) * dt * 1.6;
          if (this.sparkPositions[i * 3 + 1] > 0.8 || this.sparkPositions[i * 3 + 1] < 0) {
            this.sparkPositions[i * 3 + 1] = Math.random() * 0.2;
            this.sparkPositions[i * 3] = (Math.random() - 0.5) * 0.25;
            this.sparkPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.25;
          }
        }
        this.sparkParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    // 3. Smooth Physical-to-Visual Attitude Interpolation & Hover Micro-Dynamics
    const targetPos = new THREE.Vector3(telemetry.position.x, telemetry.position.y, telemetry.position.z);
    
    // Calculate subtle organic hover micro-corrections ONLY when hovering at low speeds (< 3 km/h)
    let microPitch = 0;
    let microRoll = 0;
    const isAirborne = telemetry.altitude > 0.08 && !isCrashed;
    if (isAirborne) {
      const speedKmh = telemetry.groundSpeed || 0;
      // Fade out completely as speed increases above 3 km/h to eliminate WASD vibration
      const hoverFactor = Math.max(0, Math.min(1, 1.0 - (speedKmh / 3.0)));
      if (hoverFactor > 0.01) {
        const time = performance.now() * 0.002;
        microPitch = (Math.sin(time * 2.8) * 0.003 + Math.cos(time * 5.1) * 0.0015) * hoverFactor;
        microRoll = (Math.cos(time * 3.2) * 0.003 + Math.sin(time * 4.5) * 0.0015) * hoverFactor;
      }
    }

    const targetPitch = telemetry.rotation.pitch + microPitch;
    const targetRoll = telemetry.rotation.roll + microRoll;
    const targetYaw = telemetry.rotation.yaw;

    if (!this.isInitialized) {
      this.visualPos.copy(targetPos);
      this.visualPitch = targetPitch;
      this.visualRoll = targetRoll;
      this.visualYaw = targetYaw;
      this.isInitialized = true;
    } else {
      // Direct positioning for instant responsive handling without visual lag
      this.visualPos.copy(targetPos);
      // Fast exponential smoothing on attitude to eliminate micro-stutter
      const smoothFactor = Math.min(1.0, dt * 12.0);
      this.visualPitch += (targetPitch - this.visualPitch) * smoothFactor;
      this.visualRoll += (targetRoll - this.visualRoll) * smoothFactor;
      let yawDiff = targetYaw - this.visualYaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      this.visualYaw += yawDiff * smoothFactor;
    }

    this.group.position.copy(this.visualPos);
    
    // Only apply YAW to the parent group so the nametag and shadow don't tilt
    this.group.rotation.order = "YXZ";
    this.group.rotation.y = this.visualYaw;
    this.group.rotation.x = 0;
    this.group.rotation.z = 0;

    // Apply Pitch and Roll to the physical drone model itself
    // Assuming parts.rootGroup is the first child added, or we kept a reference.
    // Wait, we don't have a direct reference to parts.rootGroup on `this`.
    // Let's find it. It's the first child that is a Group and not a Sprite/Points/Mesh.
    // Actually, we can just save it when building. 
    // Since we didn't save it, let's just find it by name. We know `buildDrone` adds `parts.rootGroup`.
    // Let's modify the class to store `this.modelRoot = parts.rootGroup;` Wait, I can't easily add a property without changing the class definition. 
    // I can just find it: 
    const model = this.group.children.find(c => c.type === "Group");
    if (model) {
       model.rotation.order = "YXZ";
       model.rotation.x = this.visualPitch;
       model.rotation.z = this.visualRoll;
    }

    // 4. Active 3-Axis Horizon-Locked Camera Gimbal Stabilization
    if (this.cameraPod && this.gimbalRollArm) {
      // Counter-pitch and counter-roll to keep the inspection camera locked to the horizon!
      const counterPitch = -this.visualPitch * 0.92;
      const counterRoll = -this.visualRoll * 0.88;
      this.cameraPod.rotation.x = counterPitch;
            this.gimbalRollArm.rotation.z = counterRoll;
    }

    // 6. Visual Payload Mass
    if (this.payloadGroup) {
      const pm = telemetry.payloadMassKg || 0;
      if (pm > 0.1) {
        this.payloadGroup.visible = true;
        // Scale box based on mass (e.g., 1.0x to 2.5x)
        const s = 0.8 + (pm * 0.05); 
        this.payloadGroup.scale.set(s, s, s);
      } else {
        this.payloadGroup.visible = false;
      }
    }

    // 5. Dual-State Propeller Spin & Motion-Blur Disc Cross-Fade
    const baseRpmPercent = telemetry.rotorRpmPercent || 0;
    const isArmed = baseRpmPercent > 0;
    const outputs = telemetry.motorOutputs && telemetry.motorOutputs.length > 0 
      ? telemetry.motorOutputs 
      : [];

    this.propellers.forEach((p) => {
      // If armed, idle is ~15%. But we multiply by the actual motor output or health.
      // We don't have direct access to motorHealth here, but outputs[i] tells us the thrust.
      // If output is very low, it should spin slowly.
      let motorThrottle = 0;
      if (isArmed) {
        // If we have individual outputs, use them. If they are 0 (ground idle), use a baseline 0.15,
        // BUT only if the motor actually has output when throttling up. 
        // We can just use the direct output if it's > 0, otherwise baseRpmPercent.
        const output = outputs[p.motorIndex];
        if (output !== undefined) {
           // We want the visual to match the output. If output is capped by override, it will be low.
           // To ensure it spins at idle on the ground, we add a small idle base IF output is 0.
           // However, if output is 0 because of failure, we don't want it to spin.
           // Since we can't tell failure from idle just from output=0, we rely on the fact that
           // in the air, output is > 0.
           motorThrottle = output > 0 ? output : (baseRpmPercent / 100);
           
           // If the output is explicitly lower than idle (e.g. override is 5%), show it!
           if (output > 0 && output < 0.15) {
               motorThrottle = output;
           }
        } else {
           motorThrottle = baseRpmPercent / 100;
        }
      }

      // Rotation angular velocity (rad/s) - carefully chosen to avoid perfect 60fps aliasing
      const spinSpeed = (motorThrottle * 1500.0 + 50.0) * p.direction;
      p.bladeGroup.rotation.y += spinSpeed * dt;

      // Blur disc blending logic: make it look exactly like a real fan circle!
      if (motorThrottle < 0.05) {
        p.blurMaterial.opacity = 0.0;
        p.blurMesh.visible = false;
        p.bladeMaterial.opacity = 1.0; 
      } else {
        p.blurMesh.visible = true;
        // Fade to fully blurred circle extremely quickly as throttle goes up
        const blurFade = Math.min(1.0, (motorThrottle - 0.05) / 0.15); 
        p.blurMaterial.opacity = blurFade * 0.95; // Strong solid blur disc
        p.bladeMaterial.opacity = 1.0 - blurFade; // Completely vanish the solid blades
      }
    });

    // 6. Anti-Collision White Beacon Strobe Flash (1.0 Hz strobe pulse)
    this.strobeTimer += dt;
    if (this.strobeTimer >= 1.0) {
      this.strobeTimer = 0;
    }
    if (this.tailStrobeMesh) {
      const isFlash = this.strobeTimer < 0.08;
      this.tailStrobeMesh.visible = isFlash;
    }

    // 7. Battery Pack Fuel Gauge LEDs
    const batteryPct = telemetry.batteryLevel || 100;
    const activeLedCount = Math.ceil((batteryPct / 100) * 4);
    this.batteryLeds.forEach((led, i) => {
      if (i < activeLedCount) {
        if (batteryPct > 40) {
          led.material = this.ledBatteryGreenMat;
        } else if (batteryPct > 20) {
          led.material = this.ledBatteryAmberMat;
        } else {
          led.material = this.ledBatteryRedMat;
        }
      } else {
        led.material = this.ledBatteryOffMat;
      }
    });

    // 8. Dedicated Ground Contact Shadow Decal
    if (this.groundShadowMesh) {
      const surfaceY = Math.max(0.01, telemetry.position.y - telemetry.altitude - 0.245 + 0.005);
      this.groundShadowMesh.position.set(0, surfaceY - this.visualPos.y, 0);
      this.groundShadowMesh.rotation.z = -telemetry.rotation.yaw;

      const alt = Math.max(0, telemetry.altitude);
      const isOverWater = surfaceY <= 0.02;
        const opacity = isOverWater ? 0 : Math.max(0, 0.50 * Math.exp(-alt / 5.2));
      (this.groundShadowMesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      const scale = 1.0 + alt * 0.09;
      this.groundShadowMesh.scale.set(scale, scale, 1);
      this.groundShadowMesh.visible = opacity > 0.01;
    }
  }
}

















