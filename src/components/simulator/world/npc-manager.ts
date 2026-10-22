// ==========================================================
// DRONE PILOT ?" NPC & HUMAN CREW SIMULATION (LIVING WORLD)
// Animated flightline ground crew, marshals with wands & pedestrians
// ==========================================================

import * as THREE from "three";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";

interface NPCCharacter {
  root: THREE.Group;
  headGroup: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  isWalking: boolean;
  walkSpeed: number;
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  t: number;
  dir: number;
  isMarshal?: boolean;
}

interface NPCDrone {
  root: THREE.Group;
  props: THREE.Object3D[];
  t: number;
  speed: number;
  p1: THREE.Vector3;
  p2: THREE.Vector3;
}

export class NPCManager {
  public group = new THREE.Group();
  private npcs: NPCCharacter[] = [];
  private drones: NPCDrone[] = [];

  constructor() {
    this.spawnFlightlineGroundCrew();
    this.spawnCityPedestrians();
    this.spawnForestRangers();
    this.spawnBeachNPCs();
    this.spawnIndustrialWorkers();
    this.spawnScatteredNPCs();
    this.spawnAutonomousDrones();
  }

  private spawnAutonomousDrones() {
    const droneMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
    const propMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
    
    // Forest and general area drone paths
    const paths = [
      { p1: new THREE.Vector3(-100, 35, 100), p2: new THREE.Vector3(-250, 45, -50), speed: 0.05 },
      { p1: new THREE.Vector3(-300, 60, -200), p2: new THREE.Vector3(100, 65, -300), speed: 0.04 },
      { p1: new THREE.Vector3(200, 40, 200), p2: new THREE.Vector3(250, 50, -50), speed: 0.06 },
      { p1: new THREE.Vector3(50, 80, 50), p2: new THREE.Vector3(-150, 90, 150), speed: 0.045 },
    ];

    paths.forEach(path => {
      const droneGroup = new THREE.Group();
      
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4), droneMat);
      droneGroup.add(body);
      
      const props: THREE.Object3D[] = [];
      const offsets = [{x: 0.25, z: 0.25}, {x: -0.25, z: 0.25}, {x: 0.25, z: -0.25}, {x: -0.25, z: -0.25}];
      
      offsets.forEach(off => {
        const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), propMat);
        prop.position.set(off.x, 0.1, off.z);
        droneGroup.add(prop);
        props.push(prop);
      });

      this.group.add(droneGroup);
      this.drones.push({ root: droneGroup, props, t: Math.random(), speed: path.speed, p1: path.p1, p2: path.p2 });
    });
  }

  /**
   * Helper to build a humanoid 3D figure with articulated limbs for walk cycles
   */
  private createHumanoid(options: {
    vestColor?: number;
    pantsColor?: number;
    shirtColor?: number;
    isMarshal?: boolean;
  }): {
    root: THREE.Group;
    headGroup: THREE.Group;
    leftLeg: THREE.Object3D;
    rightLeg: THREE.Object3D;
    leftArm: THREE.Object3D;
    rightArm: THREE.Object3D;
  } {
    const root = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2a679, roughness: 0.75 });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: options.pantsColor || 0x1e293b,
      roughness: 0.78,
    });
    const torsoMat = new THREE.MeshStandardMaterial({
      color: options.vestColor || options.shirtColor || 0xf97316, // Default Hi-Vis Orange
      roughness: 0.68,
    });
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Tactical black leather boots
      roughness: 0.5,
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x27272a, // Mechanix flight gloves
      roughness: 0.6,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Dark polarized aviator visor / sunglasses
      roughness: 0.1,
      metalness: 0.9,
    });

    // 1. Torso: Tapered athletic chest
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.42, 8), torsoMat);
    chest.position.y = 1.34;
    chest.castShadow = true;
    root.add(chest);

    // Abdomen / Pelvis
    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.19, 0.32, 8), pantsMat);
    pelvis.position.y = 1.02;
    pelvis.castShadow = true;
    root.add(pelvis);

    // Tactical utility belt & radio pouch
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 8), bootMat);
    belt.position.y = 0.94;
    root.add(belt);

    // Reflective safety harness on chest
    if (options.vestColor) {
      const stripeMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xeab308,
        emissiveIntensity: 0.5,
      });
      const harness = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.32), stripeMat);
      harness.position.y = 1.35;
      root.add(harness);
    }

    // 2. Head, Cap / Helmet & Aviation Headset
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.58, 0);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.16, 6), skinMat);
    neck.position.y = 0;
    headGroup.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinMat);
    head.scale.set(1.0, 1.15, 1.0);
    head.position.y = 0.14;
    head.castShadow = true;
    headGroup.add(head);

    // Polarized sunglasses / aviator visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.12), visorMat);
    visor.position.set(0, 0.16, 0.10);
    headGroup.add(visor);

    // Baseball cap / flightline hardhat
    const capMat = new THREE.MeshStandardMaterial({
      color: options.vestColor ? 0xfacc15 : 0x0f172a,
      roughness: 0.5,
    });
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), capMat);
    capDome.position.set(0, 0.18, 0);
    headGroup.add(capDome);

    // Cap visor bill
    const capBill = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.12), capMat);
    capBill.position.set(0, 0.18, 0.14);
    headGroup.add(capBill);

    root.add(headGroup);

    // 3. Articulated Legs with Flight Boots
    const createLeg = (xOffset: number) => {
      const legRoot = new THREE.Group();
      legRoot.position.set(xOffset, 0.88, 0);

      // Thigh
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.08, 0.44, 6), pantsMat);
      thigh.position.y = -0.22;
      thigh.castShadow = true;
      legRoot.add(thigh);

      // Calf / shin
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.42, 6), pantsMat);
      shin.position.y = -0.58;
      shin.castShadow = true;
      legRoot.add(shin);

      // Tactical combat boot with sole
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.22), bootMat);
      boot.position.set(0, -0.82, 0.04);
      boot.castShadow = true;
      legRoot.add(boot);

      return legRoot;
    };

    const leftLeg = createLeg(-0.12);
    root.add(leftLeg);

    const rightLeg = createLeg(0.12);
    root.add(rightLeg);

    // 4. Articulated Arms with Gloves
    const createArm = (xOffset: number) => {
      const armRoot = new THREE.Group();
      armRoot.position.set(xOffset, 1.45, 0);

      // Upper arm sleeve
      const bicep = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.35, 6), torsoMat);
      bicep.position.y = -0.18;
      bicep.castShadow = true;
      armRoot.add(bicep);

      // Forearm
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.32, 6), skinMat);
      forearm.position.y = -0.45;
      forearm.castShadow = true;
      armRoot.add(forearm);

      // Flight glove
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.09), gloveMat);
      hand.position.set(0, -0.62, 0);
      hand.castShadow = true;
      armRoot.add(hand);

      return armRoot;
    };

    const leftArm = createArm(-0.28);
    root.add(leftArm);

    const rightArm = createArm(0.28);
    root.add(rightArm);

    // If flightline marshal, add luminescent orange marshaling wands!
    if (options.isMarshal) {
      const wandMat = new THREE.MeshStandardMaterial({
        color: 0xff3b00,
        emissive: 0xff2200,
        emissiveIntensity: 2.5,
      });
      const wandGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6);

      const wandL = new THREE.Mesh(wandGeo, wandMat);
      wandL.position.set(0, -0.65, 0.15);
      wandL.rotation.x = Math.PI / 4;
      leftArm.add(wandL);

      const wandR = new THREE.Mesh(wandGeo, wandMat);
      wandR.position.set(0, -0.65, 0.15);
      wandR.rotation.x = Math.PI / 4;
      rightArm.add(wandR);
    }

    return { root, headGroup, leftLeg, rightLeg, leftArm, rightArm };
  }

  /**
   * Ground crew marshaling drones and patrolling the flight apron
   */
  private spawnFlightlineGroundCrew() {
    // 1. Marshalling officer at Operations Observation Apron (safe distance from active pads)
    const marshal = this.createHumanoid({ vestColor: 0xf97316, isMarshal: true });
    marshal.root.position.set(-22.0, 1.22, 18.0);
    marshal.root.rotation.y = Math.PI / 4;
    this.group.add(marshal.root);

    this.npcs.push({
      ...marshal,
      isWalking: false,
      isMarshal: true,
      walkSpeed: 0,
      p1: new THREE.Vector3(-22.0, 1.22, 18.0),
      p2: new THREE.Vector3(-22.0, 1.22, 18.0),
      t: 0,
      dir: 1,
    });

    // 2. Flightline technician walking along West Hangar maintenance service lane
    const tech = this.createHumanoid({ vestColor: 0x84cc16, pantsColor: 0x0f172a });
    this.group.add(tech.root);

    this.npcs.push({
      ...tech,
      isWalking: true,
      walkSpeed: 1.2,
      p1: new THREE.Vector3(-28.0, 1.22, -20.0),
      p2: new THREE.Vector3(-28.0, 1.22, -75.0),
      t: 0.1,
      dir: 1,
    });

    // 3. Drone Inspector near East Workshop facility
    const inspector = this.createHumanoid({ vestColor: 0x06b6d4, pantsColor: 0x1e293b });
    this.group.add(inspector.root);

    this.npcs.push({
      ...inspector,
      isWalking: true,
      walkSpeed: 1.1,
      p1: new THREE.Vector3(62.0, 1.22, 35.0),
      p2: new THREE.Vector3(75.0, 1.22, 35.0),
      t: 0.5,
      dir: 1,
    });
  }

  /**
   * Pedestrians walking along Downtown Metropolis sidewalks and plazas
   */
  private spawnCityPedestrians() {
    const pedConfigs = [
      // 1st Avenue West Sidewalk
      {
        shirtColor: 0x3b82f6,
        pantsColor: 0x1e293b,
        p1: new THREE.Vector3(632, 2.53, 240),
        p2: new THREE.Vector3(632, 2.53, 390),
      },
      // 1st Avenue East Sidewalk
      {
        shirtColor: 0xec4899,
        pantsColor: 0x374151,
        p1: new THREE.Vector3(648, 2.53, 380),
        p2: new THREE.Vector3(648, 2.53, 250),
      },
      // 2nd Avenue Downtown Pedestrians
      {
        shirtColor: 0x10b981,
        pantsColor: 0x111827,
        p1: new THREE.Vector3(772, 2.53, 260),
        p2: new THREE.Vector3(772, 2.53, 380),
      },
      // Central Crosswalk & Commercial Plaza
      {
        shirtColor: 0xf59e0b,
        pantsColor: 0x1e293b,
        p1: new THREE.Vector3(650, 2.53, 320),
        p2: new THREE.Vector3(770, 2.53, 320),
      },
      // Apex Tower Plaza
      {
        shirtColor: 0x8b5cf6,
        pantsColor: 0x334155,
        p1: new THREE.Vector3(740, 2.53, 340),
        p2: new THREE.Vector3(780, 2.53, 380),
      },
      // 8 new pedestrians
      {
        shirtColor: 0xd946ef, pantsColor: 0x1e293b,
        p1: new THREE.Vector3(660, 2.5, 280), p2: new THREE.Vector3(660, 2.5, 360)
      },
      {
        shirtColor: 0x06b6d4, pantsColor: 0x0f172a,
        p1: new THREE.Vector3(700, 2.5, 245), p2: new THREE.Vector3(760, 2.5, 245)
      },
      {
        shirtColor: 0x84cc16, pantsColor: 0x1e293b,
        p1: new THREE.Vector3(740, 2.5, 310), p2: new THREE.Vector3(740, 2.5, 370)
      },
      {
        shirtColor: 0xf43f5e, pantsColor: 0x334155,
        p1: new THREE.Vector3(800, 2.5, 300), p2: new THREE.Vector3(800, 2.5, 380)
      },
      {
        shirtColor: 0x3b82f6, pantsColor: 0x111827,
        p1: new THREE.Vector3(650, 2.5, 400), p2: new THREE.Vector3(720, 2.5, 400)
      },
      {
        shirtColor: 0x10b981, pantsColor: 0x1e293b,
        p1: new THREE.Vector3(730, 2.5, 210), p2: new THREE.Vector3(730, 2.5, 190)
      },
      {
        shirtColor: 0xf59e0b, pantsColor: 0x111827,
        p1: new THREE.Vector3(720, 2.5, 200), p2: new THREE.Vector3(750, 2.5, 200)
      },
      {
        shirtColor: 0x8b5cf6, pantsColor: 0x334155,
        p1: new THREE.Vector3(680, 2.5, 350), p2: new THREE.Vector3(680, 2.5, 420)
      }
    ];

    pedConfigs.forEach((cfg, i) => {
      const ped = this.createHumanoid({
        shirtColor: cfg.shirtColor,
        pantsColor: cfg.pantsColor,
      });
      this.group.add(ped.root);

      this.npcs.push({
        ...ped,
        isWalking: true,
        walkSpeed: 1.3 + (i % 3) * 0.2,
        p1: cfg.p1,
        p2: cfg.p2,
        t: (i / pedConfigs.length),
        dir: 1,
      });
    });
  }

  /**
   * Rangers at Whispering Pines Outpost and Crystal Mountain Lake
   */
  private spawnForestRangers() {
    // 1. Whispering Pines Station Ranger
    const ranger1 = this.createHumanoid({
      shirtColor: 0x3f6212, // Forest Green
      pantsColor: 0x451a03, // Khaki
    });
    this.group.add(ranger1.root);

    this.npcs.push({
      ...ranger1,
      isWalking: true,
      walkSpeed: 1.1,
      p1: new THREE.Vector3(-625, 5.5, -45),
      p2: new THREE.Vector3(-605, 5.5, -35),
      t: 0.2,
      dir: 1,
    });

    // 2. Crystal Mountain Lake Shoreline Ranger
    const ranger2 = this.createHumanoid({
      shirtColor: 0x1e3a8a, // Park Police Blue
      pantsColor: 0x1e293b,
    });
    this.group.add(ranger2.root);

    this.npcs.push({
      ...ranger2,
      isWalking: true,
      walkSpeed: 1.2,
      p1: new THREE.Vector3(-310, 8.6, -240),
      p2: new THREE.Vector3(-280, 8.6, -250),
      t: 0.6,
      dir: 1,
    });
  }

  private spawnBeachNPCs() {
    const configs = [
      { p1: new THREE.Vector3(-715, 0.8, 520), p2: new THREE.Vector3(-715, 0.8, 550), shirt: 0xff0000, pants: 0xffffff },
      { p1: new THREE.Vector3(-725, 0.8, 530), p2: new THREE.Vector3(-725, 0.8, 560), shirt: 0x00ff00, pants: 0xeeeeee },
      { p1: new THREE.Vector3(-710, 0.8, 580), p2: new THREE.Vector3(-730, 0.8, 600), shirt: 0xffff00, pants: 0xff00ff },
      { p1: new THREE.Vector3(-720, 0.8, 610), p2: new THREE.Vector3(-740, 0.8, 610), shirt: 0x00ffff, pants: 0x0000ff },
      { p1: new THREE.Vector3(-735, 0.8, 590), p2: new THREE.Vector3(-720, 0.8, 570), shirt: 0xffa500, pants: 0xffffff }
    ];

    configs.forEach((cfg, i) => {
      const npc = this.createHumanoid({ shirtColor: cfg.shirt, pantsColor: cfg.pants });
      this.group.add(npc.root);
      this.npcs.push({
        ...npc,
        isWalking: true, walkSpeed: 1.0 + (i % 2) * 0.2,
        p1: cfg.p1, p2: cfg.p2, t: i / configs.length, dir: 1
      });
    });
  }

  private spawnIndustrialWorkers() {
    for (let i = 0; i < 6; i++) {
      const npc = this.createHumanoid({ vestColor: 0xfacc15, pantsColor: 0x1e293b }); // yellow high-vis
      this.group.add(npc.root);
      const startX = 380 + (Math.random() - 0.5) * 40;
      const startZ = 780 + (Math.random() - 0.5) * 40;
      const endX = startX + (Math.random() - 0.5) * 20;
      const endZ = startZ + (Math.random() - 0.5) * 20;
      
      this.npcs.push({
        ...npc,
        isWalking: true, walkSpeed: 1.2,
        p1: new THREE.Vector3(startX, 1.8, startZ),
        p2: new THREE.Vector3(endX, 1.8, endZ),
        t: Math.random(), dir: 1
      });
    }
  }

  private spawnScatteredNPCs() {
    const configs = [
      // Hikers
      { p1: new THREE.Vector3(-400, 15, -100), p2: new THREE.Vector3(-380, 18, -120), shirt: 0x8b4513, pants: 0x556b2f },
      { p1: new THREE.Vector3(-450, 12, -80), p2: new THREE.Vector3(-430, 16, -60), shirt: 0xff4500, pants: 0x8b4513 },
      { p1: new THREE.Vector3(-350, 22, -150), p2: new THREE.Vector3(-320, 25, -170), shirt: 0x2e8b57, pants: 0x000000 },
      // Fishers
      { p1: new THREE.Vector3(-200, 2, 100), p2: new THREE.Vector3(-210, 2, 120), shirt: 0x4682b4, pants: 0x808080 },
      { p1: new THREE.Vector3(-150, 2, 150), p2: new THREE.Vector3(-140, 2, 170), shirt: 0x696969, pants: 0x2f4f4f },
      { p1: new THREE.Vector3(-180, 2, 80), p2: new THREE.Vector3(-190, 2, 90), shirt: 0xa0522d, pants: 0xd2b48c }
    ];

    configs.forEach((cfg, i) => {
      const elev1 = evaluateIslandElevation(cfg.p1.x, cfg.p1.z).elevation;
      const elev2 = evaluateIslandElevation(cfg.p2.x, cfg.p2.z).elevation;
      cfg.p1.y = elev1;
      cfg.p2.y = elev2;

      const npc = this.createHumanoid({ shirtColor: cfg.shirt, pantsColor: cfg.pants });
      this.group.add(npc.root);
      this.npcs.push({
        ...npc,
        isWalking: true, walkSpeed: 0.8 + (i % 3) * 0.2,
        p1: cfg.p1, p2: cfg.p2, t: i / configs.length, dir: 1
      });
    });
  }

  /**
   * Frame-by-frame walk cycle animation, patrol waypoint tracking, and drone reactive tracking
   */
  public update(dt: number, elapsed: number, dronePos?: THREE.Vector3) {

      for (const d of this.drones) {
        d.t += d.speed * dt;
        if (d.t > 1) { d.t = 1; d.speed *= -1; }
        if (d.t < 0) { d.t = 0; d.speed *= -1; }
        
        // Smooth ease in-out
        const ease = d.t * d.t * (3 - 2 * d.t);
        d.root.position.lerpVectors(d.p1, d.p2, ease);
        
        const lookHeading = Math.atan2(d.p2.x - d.p1.x, d.p2.z - d.p1.z);
        d.root.rotation.y = d.speed > 0 ? lookHeading : lookHeading + Math.PI;
        
        d.props.forEach(p => p.rotation.y += 20 * dt);
      }
    for (const npc of this.npcs) {
      const curPos = npc.root.position;
      let dist3d = 999;
      let distHoriz = 999;
      if (dronePos) {
        dist3d = curPos.distanceTo(dronePos);
        distHoriz = Math.hypot(dronePos.x - curPos.x, dronePos.z - curPos.z);

        // Strict aeronautical safety perimeter: NPCs dynamically step back and cannot overlap drone
        const minSafetyRadius = 14.0;
        if (distHoriz < minSafetyRadius) {
          const dx = curPos.x - dronePos.x;
          const dz = curPos.z - dronePos.z;
          const currentDist = Math.max(0.01, distHoriz);
          const pushAmount = minSafetyRadius - currentDist;
          curPos.x += (dx / currentDist) * pushAmount;
          curPos.z += (dz / currentDist) * pushAmount;
          const sample = evaluateIslandElevation(curPos.x, curPos.z);
          curPos.y = sample.elevation;
          distHoriz = minSafetyRadius;
          dist3d = curPos.distanceTo(dronePos);
        }
      }

      const isDroneNear = dist3d < 18;

      if (npc.isMarshal) {
        if (isDroneNear && dronePos) {
          // Marshaller actively guides approaching drone with rapid wand waving
          npc.leftArm.rotation.x = -Math.PI / 1.8 + Math.sin(elapsed * 7) * 0.5;
          npc.rightArm.rotation.x = -Math.PI / 1.8 - Math.sin(elapsed * 7) * 0.5;
          npc.leftArm.rotation.z = Math.sin(elapsed * 4) * 0.4;
          npc.rightArm.rotation.z = -Math.sin(elapsed * 4) * 0.4;
          
          const lookHeading = Math.atan2(dronePos.x - curPos.x, dronePos.z - curPos.z);
          npc.root.rotation.y = THREE.MathUtils.lerp(npc.root.rotation.y, lookHeading, dt * 5);
          const pitch = Math.atan2(dronePos.y - (curPos.y + 1.6), Math.max(1, distHoriz));
          npc.headGroup.rotation.x = THREE.MathUtils.lerp(npc.headGroup.rotation.x, -pitch, dt * 6);
        } else {
          // Marshaller waving wands in steady circular guidance motion
          npc.leftArm.rotation.x = -Math.PI / 2 + Math.sin(elapsed * 4) * 0.4;
          npc.rightArm.rotation.x = -Math.PI / 2 - Math.sin(elapsed * 4) * 0.4;
          npc.leftArm.rotation.z = Math.sin(elapsed * 2) * 0.3;
          npc.rightArm.rotation.z = -Math.sin(elapsed * 2) * 0.3;
          npc.headGroup.rotation.x = THREE.MathUtils.lerp(npc.headGroup.rotation.x, 0, dt * 3);
        }
        continue;
      }

      if (isDroneNear && dronePos) {
        // Pedestrian stops, faces drone, and tilts head up to watch the drone fly by!
        const lookHeading = Math.atan2(dronePos.x - curPos.x, dronePos.z - curPos.z);
        npc.root.rotation.y = THREE.MathUtils.lerp(npc.root.rotation.y, lookHeading, dt * 4);

        const pitch = Math.atan2(dronePos.y - (curPos.y + 1.6), Math.max(1, distHoriz));
        npc.headGroup.rotation.x = THREE.MathUtils.lerp(npc.headGroup.rotation.x, -pitch, dt * 6);

        // Stand idle, gentle breathing
        npc.leftLeg.rotation.x = THREE.MathUtils.lerp(npc.leftLeg.rotation.x, 0, dt * 5);
        npc.rightLeg.rotation.x = THREE.MathUtils.lerp(npc.rightLeg.rotation.x, 0, dt * 5);
        npc.leftArm.rotation.x = THREE.MathUtils.lerp(npc.leftArm.rotation.x, Math.sin(elapsed * 1.5) * 0.05, dt * 4);
        npc.rightArm.rotation.x = THREE.MathUtils.lerp(npc.rightArm.rotation.x, -Math.sin(elapsed * 1.5) * 0.05, dt * 4);
        continue;
      }

      // Reset head tilt when drone is far
      npc.headGroup.rotation.x = THREE.MathUtils.lerp(npc.headGroup.rotation.x, 0, dt * 4);

      if (npc.isWalking) {
        const segDist = npc.p1.distanceTo(npc.p2);
        if (segDist > 0.01) {
          npc.t += (npc.dir * npc.walkSpeed * dt) / segDist;

          if (npc.t >= 1.0) {
            npc.t = 1.0;
            npc.dir = -1;
          } else if (npc.t <= 0.0) {
            npc.t = 0.0;
            npc.dir = 1;
          }

          npc.root.position.lerpVectors(npc.p1, npc.p2, npc.t);

          // Face direction of travel
          const target = npc.dir > 0 ? npc.p2 : npc.p1;
          const heading = Math.atan2(
            target.x - npc.root.position.x,
            target.z - npc.root.position.z
          );
          npc.root.rotation.y = THREE.MathUtils.lerp(npc.root.rotation.y, heading, dt * 6);

          // Leg & arm swing walk cycles
          const walkCycle = Math.sin(elapsed * 7.5);
          npc.leftLeg.rotation.x = walkCycle * 0.6;
          npc.rightLeg.rotation.x = -walkCycle * 0.6;
          npc.leftArm.rotation.x = -walkCycle * 0.5;
          npc.rightArm.rotation.x = walkCycle * 0.5;
        }
      }
    }
  }
}


