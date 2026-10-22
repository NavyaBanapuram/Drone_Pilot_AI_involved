import * as THREE from "three";
import { RemotePlayerState } from "@/lib/multiplayer/multiplayer-types";

interface RemoteDroneInstance {
  group: THREE.Group;
  rotors: THREE.Group[];
  targetPos: THREE.Vector3;
  targetRot: THREE.Euler;
  currentPos: THREE.Vector3;
  currentRot: THREE.Euler;
  velocity: THREE.Vector3;
  lastPacketTime: number;
}

export class RemoteDroneManager {
  public group = new THREE.Group();
  private drones: Map<string, RemoteDroneInstance> = new Map();

  constructor() {}

  public update(remotePlayers: RemotePlayerState[], dt: number) {
    const activeIds = new Set(remotePlayers.map((p) => p.playerId));
    const now = Date.now();

    // 1. Evict removed/disconnected remote pilots cleanly
    for (const [id, instance] of this.drones.entries()) {
      if (!activeIds.has(id)) {
        this.group.remove(instance.group);
        this.drones.delete(id);
      }
    }

    // 2. Update and dead-reckon active pilots
    for (const p of remotePlayers) {
      let instance = this.drones.get(p.playerId);
      if (!instance) {
        instance = this.createRemoteDroneMesh(p.callsign, p.droneType || p.airframeType);
        this.drones.set(p.playerId, instance);
        this.group.add(instance.group);
      }

      instance.velocity.set(p.velocity.x, p.velocity.y, p.velocity.z);

      // Dead-reckoning: if packet is slightly aged, extrapolate position by velocity (up to 0.4s max)
      const packetAgeSec = Math.max(0, Math.min(0.4, (now - p.lastUpdate) / 1000.0));
      const extrapolatedX = p.position.x + instance.velocity.x * packetAgeSec;
      const extrapolatedY = p.position.y + instance.velocity.y * packetAgeSec;
      const extrapolatedZ = p.position.z + instance.velocity.z * packetAgeSec;

      instance.targetPos.set(extrapolatedX, extrapolatedY, extrapolatedZ);
      instance.targetRot.set(p.rotation.pitch, p.rotation.yaw, p.rotation.roll);

      // Exponential frame-rate independent smoothing
      const blend = 1.0 - Math.exp(-14.0 * dt);
      instance.currentPos.lerp(instance.targetPos, blend);
      instance.group.position.copy(instance.currentPos);

      // Wrap-safe angular interpolation for pitch, yaw, roll
      const lerpAngle = (current: number, target: number, alpha: number) => {
        let diff = (target - current) % (Math.PI * 2);
        if (diff < -Math.PI) diff += Math.PI * 2;
        if (diff > Math.PI) diff -= Math.PI * 2;
        return current + diff * alpha;
      };

      instance.currentRot.x = lerpAngle(instance.currentRot.x, instance.targetRot.x, blend);
      instance.currentRot.y = lerpAngle(instance.currentRot.y, instance.targetRot.y, blend);
      instance.currentRot.z = lerpAngle(instance.currentRot.z, instance.targetRot.z, blend);
      instance.group.rotation.copy(instance.currentRot);

      const rpmSpeed = (p.rotorRpmPercent / 100) * 45;
      for (const r of instance.rotors) {
        r.rotation.y += rpmSpeed * dt;
      }
    }
  }


  private createRemoteDroneMesh(callsign: string, droneType?: string): RemoteDroneInstance {
    const group = new THREE.Group();

    // Materials
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // Professional aeronautical cobalt blue for remote pilots
      roughness: 0.35,
      metalness: 0.25,
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x181a1f,
      roughness: 0.45,
      metalness: 0.35,
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x5a606d,
      roughness: 0.22,
      metalness: 0.88,
    });

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x1d1f24,
      roughness: 0.30,
      metalness: 0.25,
    });

    const orangeTipMat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      roughness: 0.30,
      metalness: 0.10,
    });

    const ledGreen = new THREE.MeshBasicMaterial({ color: 0x00e676 });
    const ledRed = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const ledHeadlight = new THREE.MeshBasicMaterial({ color: 0xfffaed });

    // Fuselage
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.46), hullMat);
    body.position.y = 0.02;
    group.add(body);

    const bottomTub = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.04, 0.44), carbonMat);
    bottomTub.position.y = -0.04;
    group.add(bottomTub);

    // Nose Cowl
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.14, 6), hullMat);
    nose.rotateX(-Math.PI / 2);
    nose.position.set(0, 0.02, 0.28);
    group.add(nose);

    // Forward Headlight
    const headlight = new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), ledHeadlight);
    headlight.position.set(0, -0.01, 0.34);
    group.add(headlight);

    // RTK Antenna Puck
    const rtkPuck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.048, 0.03, 16), titaniumMat);
    rtkPuck.position.set(0, 0.075, -0.04);
    group.add(rtkPuck);

    // Arms & Rotors
    const rotors: THREE.Group[] = [];
    let armCount = 4;
    const lowerType = (droneType || "").toLowerCase();
    if (lowerType.includes("hexa")) armCount = 6;
    if (lowerType.includes("octa")) armCount = 8;
    
    const armDefs: Array<{ x: number; z: number; isRight: boolean; dir: number }> = [];
    
    if (armCount === 8) {
      armDefs.push(
        { x: 0.22, z: 0.32, isRight: true, dir: 1 },
        { x: 0.35, z: 0.10, isRight: true, dir: -1 },
        { x: 0.35, z: -0.10, isRight: true, dir: 1 },
        { x: 0.22, z: -0.32, isRight: true, dir: -1 },
        { x: -0.22, z: 0.32, isRight: false, dir: -1 },
        { x: -0.35, z: 0.10, isRight: false, dir: 1 },
        { x: -0.35, z: -0.10, isRight: false, dir: -1 },
        { x: -0.22, z: -0.32, isRight: false, dir: 1 }
      );
    } else if (armCount === 6) {
      armDefs.push(
        { x: 0.22, z: 0.28, isRight: true, dir: 1 },
        { x: 0.32, z: 0.0, isRight: true, dir: -1 },
        { x: 0.22, z: -0.28, isRight: true, dir: 1 },
        { x: -0.22, z: 0.28, isRight: false, dir: -1 },
        { x: -0.32, z: 0.0, isRight: false, dir: 1 },
        { x: -0.22, z: -0.28, isRight: false, dir: -1 }
      );
    } else {
      armDefs.push(
        { x: 0.22, z: 0.22, isRight: true, dir: 1 },
        { x: -0.22, z: 0.22, isRight: false, dir: -1 },
        { x: 0.22, z: -0.22, isRight: true, dir: -1 },
        { x: -0.22, z: -0.22, isRight: false, dir: 1 }
      );
    }

    armDefs.forEach((armDef) => {
      const armLength = Math.hypot(armDef.x, armDef.z);
      const angle = Math.atan2(armDef.x, armDef.z);

      const armGroup = new THREE.Group();
      armGroup.rotation.y = angle;

      const spar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.018, armLength, 8),
        carbonMat
      );
      spar.rotation.x = Math.PI / 2;
      spar.position.z = armLength / 2;
      armGroup.add(spar);

      // Motor Bell
      const motorBell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.045, 0.032, 12),
        titaniumMat
      );
      motorBell.position.set(0, 0.04, armLength);
      armGroup.add(motorBell);

      // Nav LED
      const navLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 8, 8),
        armDef.isRight ? ledGreen : ledRed
      );
      navLed.position.set(0, -0.015, armLength);
      armGroup.add(navLed);

      // Landing leg
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.18, 6), carbonMat);
      leg.position.set(0, -0.09, armLength);
      armGroup.add(leg);

      // Propeller Group
      const rotorGroup = new THREE.Group();
      rotorGroup.position.set(0, 0.065, armLength);

      const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.025, 8), titaniumMat);
      spinner.position.y = 0.01;
      rotorGroup.add(spinner);

      [-1, 1].forEach((d) => {
        const bladeHalf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.005, 0.028), bladeMat);
        bladeHalf.position.x = (d * 0.16) / 2;
        bladeHalf.rotation.x = d * armDef.dir * 0.14;
        rotorGroup.add(bladeHalf);

        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.006, 0.027), orangeTipMat);
        tip.position.x = d * (0.16 + 0.025);
        tip.rotation.x = d * armDef.dir * 0.14;
        rotorGroup.add(tip);
      });

      armGroup.add(rotorGroup);
      group.add(armGroup);
      rotors.push(rotorGroup);
    });

    // Remote Pilot Name Tag Billboard
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Dark high-contrast rounded badge
      ctx.fillStyle = "rgba(15, 23, 42, 0.90)";
      ctx.beginPath();
      ctx.roundRect(12, 16, 488, 96, 28);
      ctx.fill();

      // Neon Cyan border for remote pilots
      ctx.strokeStyle = "#06B6D4";
      ctx.lineWidth = 6;
      ctx.stroke();

      // Glowing cyan beacon indicator (left)
      ctx.fillStyle = "#06B6D4";
      ctx.beginPath();
      ctx.arc(60, 64, 14, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright white dot
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(60, 64, 6, 0, Math.PI * 2);
      ctx.fill();

      // Remote pilot callsign / name
      const name = callsign.toUpperCase();
      const displayName = name.length > 18 ? name.substring(0, 16) + "…" : name;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 36px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(displayName, 95, 64);

      // "PILOT" tag on the right
      ctx.fillStyle = "#06B6D4";
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "right";
      ctx.fillText("PILOT", 470, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 0.45, 0);
    sprite.scale.set(0.7, 0.175, 1);
    group.add(sprite);

    return {
      group,
      rotors,
      targetPos: new THREE.Vector3(),
      targetRot: new THREE.Euler(),
      currentPos: new THREE.Vector3(),
      currentRot: new THREE.Euler(),
      velocity: new THREE.Vector3(),
      lastPacketTime: Date.now(),
    };
  }
}

