// ==========================================================
// DRONE PILOT — DENSE LIVING WILDLIFE SIMULATION (PUBG-GRADE)
// 45+ grazing deer/stags in forest & valleys, 18 soaring eagles & 35 coastal gulls
// ==========================================================

import * as THREE from "three";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";

type DeerState = "IDLE" | "WANDER" | "DRINK" | "ALERT" | "FLEE";

interface GrazingDeer {
  root: THREE.Group;
  neck: THREE.Object3D;
  head: THREE.Object3D;
  leftFrontLeg: THREE.Object3D;
  rightFrontLeg: THREE.Object3D;
  leftBackLeg: THREE.Object3D;
  rightBackLeg: THREE.Object3D;
  centerPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  walkTimer: number;
  isWalking: boolean;
  grazePhase: number;
  state: DeerState;
  fleeTimer: number;
  isDrinkingSpot?: boolean;
}

interface SoaringBird {
  root: THREE.Group;
  leftWing: THREE.Object3D;
  rightWing: THREE.Object3D;
  center: THREE.Vector3;
  radius: number;
  altitude: number;
  speed: number;
  angle: number;
  flapFrequency: number;
  scatterTimer?: number;
}

interface GrazingSheep {
  root: THREE.Group;
  neck: THREE.Object3D;
  head: THREE.Object3D;
  leftFrontLeg: THREE.Object3D;
  rightFrontLeg: THREE.Object3D;
  leftBackLeg: THREE.Object3D;
  rightBackLeg: THREE.Object3D;
  tail: THREE.Object3D;
  centerPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  walkTimer: number;
  isWalking: boolean;
  grazePhase: number;
  alert: boolean;
}

interface NimbleSquirrel {
  root: THREE.Group;
  tail: THREE.Object3D;
  head: THREE.Object3D;
  treePos: THREE.Vector3;
  dashTimer: number;
  isDashing: boolean;
  targetPos: THREE.Vector3;
}

export class WildlifeManager {
  public group = new THREE.Group();
  private deer: GrazingDeer[] = [];
  private birds: SoaringBird[] = [];
  private sheep: GrazingSheep[] = [];
  private squirrels: NimbleSquirrel[] = [];

  constructor() {
    this.spawnDeerHerds();
    this.spawnSoaringEagles();
    this.spawnCoastalGulls();
    this.spawnSheepHerds();
    this.spawnSquirrels();
  }

  /**
   * Helper to build an articulated 3D deer / stag model with antlers
   */
  private createDeerModel(hasAntlers = true): {
    root: THREE.Group;
    neck: THREE.Object3D;
    head: THREE.Object3D;
    leftFrontLeg: THREE.Object3D;
    rightFrontLeg: THREE.Object3D;
    leftBackLeg: THREE.Object3D;
    rightBackLeg: THREE.Object3D;
  } {
    const root = new THREE.Group();

    // Natural PBR fur materials
    const coatMat = new THREE.MeshStandardMaterial({
      color: 0x93562a, // Warm rich reddish-brown coat
      roughness: 0.82,
      metalness: 0.05,
    });
    const dorsalMat = new THREE.MeshStandardMaterial({
      color: 0x5a3114, // Darker dorsal spine ridge
      roughness: 0.88,
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xf5f0ea, // Soft cream/white underbelly, throat & rump
      roughness: 0.78,
    });
    const antlerMat = new THREE.MeshStandardMaterial({
      color: 0x5c4d3c, // Weathered bone antler
      roughness: 0.65,
      metalness: 0.1,
    });
    const hoofMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917, // Black cleft keratin hooves
      roughness: 0.45,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a, // Dark reflective deer eyes
      roughness: 0.1,
      metalness: 0.8,
    });

    // 1. Anatomical Torso: Barrel ribcage + sloping flank
    const ribcage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.38, 0.75, 8),
      coatMat
    );
    ribcage.rotation.x = Math.PI / 2;
    ribcage.position.set(0, 1.08, 0.22);
    ribcage.castShadow = true;
    root.add(ribcage);

    // Haunches / Hindquarters
    const haunches = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.30, 0.65, 8),
      coatMat
    );
    haunches.rotation.x = Math.PI / 2;
    haunches.position.set(0, 1.06, -0.42);
    haunches.castShadow = true;
    root.add(haunches);

    // Dark dorsal spine stripe
    const spine = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.04, 1.35),
      dorsalMat
    );
    spine.position.set(0, 1.38, -0.08);
    root.add(spine);

    // White underbelly & throat bib
    const underbelly = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.14, 0.7),
      whiteMat
    );
    underbelly.position.set(0, 0.82, 0.15);
    root.add(underbelly);

    // White rump patch
    const rump = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 6, 6),
      whiteMat
    );
    rump.scale.set(1.0, 1.1, 0.65);
    rump.position.set(0, 1.12, -0.74);
    root.add(rump);

    // Tail (erect with white underside)
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.25, 5),
      coatMat
    );
    tail.rotation.x = -Math.PI / 3;
    tail.position.set(0, 1.18, -0.82);
    root.add(tail);

    // 2. Neck & Head (Hinged at chest: y = 1.2, z = 0.55)
    const neck = new THREE.Group();
    neck.position.set(0, 1.18, 0.52);

    // Muscular curved neck
    const neckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.24, 0.72, 8),
      coatMat
    );
    neckMesh.rotation.x = -Math.PI / 3.8;
    neckMesh.position.set(0, 0.30, 0.22);
    neckMesh.castShadow = true;
    neck.add(neckMesh);

    // White throat patch
    const throat = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.42, 0.12),
      whiteMat
    );
    throat.position.set(0, 0.24, 0.34);
    throat.rotation.x = -Math.PI / 3.8;
    neck.add(throat);

    // Sculpted Head (hinged at neck apex)
    const head = new THREE.Group();
    head.position.set(0, 0.58, 0.45);

    // Cranium
    const cranium = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.22, 0.32),
      coatMat
    );
    cranium.castShadow = true;
    head.add(cranium);

    // Tapered Muzzle / Snout
    const muzzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.14, 0.32, 6),
      coatMat
    );
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, -0.04, 0.28);
    muzzle.castShadow = true;
    head.add(muzzle);

    // Black nose tip & chin
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.08),
      hoofMat
    );
    nose.position.set(0, -0.02, 0.44);
    head.add(nose);

    // Dark eyes (lateral placement)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 5), eyeMat);
    eyeL.position.set(-0.13, 0.04, 0.12);
    head.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 5), eyeMat);
    eyeR.position.set(0.13, 0.04, 0.12);
    head.add(eyeR);

    // Sculpted alert ears
    const earGeo = new THREE.ConeGeometry(0.05, 0.22, 5);
    earGeo.scale(1.2, 1.0, 0.4);

    const earL = new THREE.Mesh(earGeo, coatMat);
    earL.position.set(-0.14, 0.16, -0.06);
    earL.rotation.set(-0.3, -0.4, -0.6);
    head.add(earL);

    const earR = new THREE.Mesh(earGeo, coatMat);
    earR.position.set(0.14, 0.16, -0.06);
    earR.rotation.set(-0.3, 0.4, 0.6);
    head.add(earR);

    // Majestic branching antlers for stags
    if (hasAntlers) {
      const beamGeo = new THREE.CylinderGeometry(0.02, 0.035, 0.55, 5);
      const tineGeo = new THREE.CylinderGeometry(0.012, 0.02, 0.22, 4);

      // Left main beam
      const beamL = new THREE.Mesh(beamGeo, antlerMat);
      beamL.position.set(-0.12, 0.34, -0.02);
      beamL.rotation.set(-0.25, 0, -0.38);
      head.add(beamL);

      // Left brow tine & crown tines
      const browL = new THREE.Mesh(tineGeo, antlerMat);
      browL.position.set(-0.18, 0.32, 0.08);
      browL.rotation.set(0.55, 0, -0.65);
      head.add(browL);

      const crownL = new THREE.Mesh(tineGeo, antlerMat);
      crownL.position.set(-0.24, 0.54, -0.05);
      crownL.rotation.set(-0.2, 0.4, -0.85);
      head.add(crownL);

      // Right main beam
      const beamR = new THREE.Mesh(beamGeo, antlerMat);
      beamR.position.set(0.12, 0.34, -0.02);
      beamR.rotation.set(-0.25, 0, 0.38);
      head.add(beamR);

      // Right brow tine & crown tines
      const browR = new THREE.Mesh(tineGeo, antlerMat);
      browR.position.set(0.18, 0.32, 0.08);
      browR.rotation.set(0.55, 0, 0.65);
      head.add(browR);

      const crownR = new THREE.Mesh(tineGeo, antlerMat);
      crownR.position.set(0.24, 0.54, -0.05);
      crownR.rotation.set(-0.2, -0.4, 0.85);
      head.add(crownR);
    }

    neck.add(head);
    root.add(neck);

    // 3. Anatomical Legs (4 slender limbs with muscular shoulders/thighs + hooves)
    const createLimb = (isRear: boolean) => {
      const legRoot = new THREE.Group();

      // Upper limb / thigh / shoulder
      const upperGeo = new THREE.CylinderGeometry(
        isRear ? 0.14 : 0.11,
        0.08,
        0.48,
        6
      );
      const upper = new THREE.Mesh(upperGeo, coatMat);
      upper.position.y = -0.22;
      upper.castShadow = true;
      legRoot.add(upper);

      // Slender lower cannon bone
      const lowerGeo = new THREE.CylinderGeometry(0.06, 0.045, 0.48, 6);
      const lower = new THREE.Mesh(lowerGeo, coatMat);
      lower.position.y = -0.62;
      lower.castShadow = true;
      legRoot.add(lower);

      // Black keratin hoof
      const hoof = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.11),
        hoofMat
      );
      hoof.position.set(0, -0.88, 0.02);
      hoof.castShadow = true;
      legRoot.add(hoof);

      return legRoot;
    };

    // Left Front (hip at x: -0.20, y: 0.92, z: 0.45)
    const leftFrontLeg = createLimb(false);
    leftFrontLeg.position.set(-0.20, 0.92, 0.45);
    root.add(leftFrontLeg);

    // Right Front
    const rightFrontLeg = createLimb(false);
    rightFrontLeg.position.set(0.20, 0.92, 0.45);
    root.add(rightFrontLeg);

    // Left Back (haunch at x: -0.20, y: 0.92, z: -0.45)
    const leftBackLeg = createLimb(true);
    leftBackLeg.position.set(-0.20, 0.92, -0.45);
    root.add(leftBackLeg);

    // Right Back
    const rightBackLeg = createLimb(true);
    rightBackLeg.position.set(0.20, 0.92, -0.45);
    root.add(rightBackLeg);

    return { root, neck, head, leftFrontLeg, rightFrontLeg, leftBackLeg, rightBackLeg };
  }

  /**
   * Spawns 45+ deer in 3 natural grazing herds across forest clearings and river valleys
   */
  private spawnDeerHerds() {
    const herdConfigs: { cx: number; cz: number; count: number; radius: number; isDrinking?: boolean }[] = [
      // Herd 1: Whispering Pines Forest Sanctuary (center ~ -620, -40) - 20 deer
      { cx: -620, cz: -40, count: 20, radius: 75 },
      // Herd 2: Valley River riparian meadow (center ~ -100, 180) - 15 deer
      { cx: -100, cz: 180, count: 15, radius: 55 },
      // Herd 3: Mount Apex southwest foothill glade (center ~ -460, -140) - 14 deer
      { cx: -460, cz: -140, count: 14, radius: 55 },
      // Herd 4: Emerald Foothills agricultural pasture (center ~ 260, 220) - 16 deer
      { cx: 260, cz: 220, count: 16, radius: 65 },
      // Herd 5: Crystal Lake Shore drinking deer (center ~ -320, -170) - 8 deer
      { cx: -320, cz: -170, count: 8, radius: 24, isDrinking: true },
      // Herd 6: Winding River Shore drinking deer (center ~ -150, 150) - 6 deer
      { cx: -150, cz: 150, count: 6, radius: 18, isDrinking: true },
    ];

    herdConfigs.forEach((cfg) => {
      for (let i = 0; i < cfg.count; i++) {
        const hasAntlers = i % 3 === 0; // 1 in 3 are antlered stags
        const deer = this.createDeerModel(hasAntlers);

        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * cfg.radius;
        const x = cfg.cx + Math.cos(a) * r;
        const z = cfg.cz + Math.sin(a) * r;

        const elev = Math.max(0.5, evaluateIslandElevation(x, z).elevation);
        deer.root.position.set(x, elev, z);
        deer.root.rotation.y = Math.random() * Math.PI * 2;

        const scale = 1.1 + Math.random() * 0.3; // Adult deer scale
        deer.root.scale.set(scale, scale, scale);

        this.group.add(deer.root);

        this.deer.push({
          ...deer,
          centerPos: new THREE.Vector3(x, elev, z),
          targetPos: new THREE.Vector3(x, elev, z),
          walkTimer: Math.random() * 8,
          isWalking: false,
          grazePhase: Math.random() * Math.PI * 2,
          state: cfg.isDrinking ? "DRINK" : "IDLE",
          fleeTimer: 0,
          isDrinkingSpot: !!cfg.isDrinking,
        });
      }
    });
  }

  /**
   * Helper to build soaring eagle model with large 3.2m wingspan
   */
  private createBirdModel(featherColor: number, wingSpan: number): {
    root: THREE.Group;
    leftWing: THREE.Object3D;
    rightWing: THREE.Object3D;
  } {
    const root = new THREE.Group();
    const featherMat = new THREE.MeshStandardMaterial({
      color: featherColor,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });

    // Fuselage / body
    const bodyGeo = new THREE.ConeGeometry(0.24, 1.2, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, featherMat);
    body.castShadow = true;
    root.add(body);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.08, 0.35, 4);
    beakGeo.rotateX(-Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, 0, 0.75);
    root.add(beak);

    // Tail fan
    const tailGeo = new THREE.PlaneGeometry(0.65, 0.5);
    tailGeo.rotateX(-Math.PI / 2);
    const tail = new THREE.Mesh(tailGeo, featherMat);
    tail.position.set(0, 0, -0.75);
    root.add(tail);

    // Left Wing (hinged at x = -0.2)
    const leftWing = new THREE.Group();
    leftWing.position.set(-0.2, 0.08, 0);
    const wingGeo = new THREE.PlaneGeometry(wingSpan / 2, 0.65);
    wingGeo.rotateX(-Math.PI / 2);
    wingGeo.translate(-wingSpan / 4, 0, 0);
    const leftWingMesh = new THREE.Mesh(wingGeo, featherMat);
    leftWingMesh.castShadow = true;
    leftWing.add(leftWingMesh);
    root.add(leftWing);

    // Right Wing (hinged at x = 0.2)
    const rightWing = new THREE.Group();
    rightWing.position.set(0.2, 0.08, 0);
    const rightWingMesh = new THREE.Mesh(wingGeo, featherMat);
    rightWingMesh.scale.x = -1;
    rightWingMesh.castShadow = true;
    rightWing.add(rightWingMesh);
    root.add(rightWing);

    return { root, leftWing, rightWing };
  }

  /**
   * 18 majestic eagles circling thermals over Mount Apex and Western Bluffs
   */
  private spawnSoaringEagles() {
    const eagleZones = [
      { x: -480, y: 85, z: -450, radius: 85, speed: 0.28 },
      { x: -420, y: 110, z: -410, radius: 110, speed: -0.24 },
      { x: -550, y: 95, z: -380, radius: 75, speed: 0.32 },
      { x: -640, y: 70, z: -200, radius: 90, speed: -0.3 }, // Western Bluffs
      { x: -620, y: 80, z: 50, radius: 80, speed: 0.26 },
      { x: 450, y: 65, z: -400, radius: 95, speed: 0.25 }, // Over Whispering Pines
    ];

    eagleZones.forEach((z, i) => {
      // 3 eagles per zone
      for (let k = 0; k < 3; k++) {
        const eagle = this.createBirdModel(0x2d1e12, 3.2); // 3.2m wingspan
        this.group.add(eagle.root);

        this.birds.push({
          ...eagle,
          center: new THREE.Vector3(z.x, z.y + k * 12, z.z),
          radius: z.radius + (k - 1) * 18,
          altitude: z.y + k * 12,
          speed: z.speed * (1 + k * 0.15),
          angle: (k * (Math.PI * 2)) / 3 + i,
          flapFrequency: 0.9, // Slow, majestic flaps
        });
      }
    });
  }

  /**
   * 35 coastal sea gulls gliding along Crescent Beach and the River
   */
  private spawnCoastalGulls() {
    const gullCenters = [
      { x: 550, y: 24, z: -150, radius: 60, speed: 0.45 },
      { x: 580, y: 20, z: 80, radius: 65, speed: -0.4 },
      { x: -120, y: 28, z: 120, radius: 55, speed: 0.5 },
      { x: -140, y: 22, z: 340, radius: 50, speed: -0.48 },
    ];

    gullCenters.forEach((c) => {
      for (let k = 0; k < 9; k++) {
        const gull = this.createBirdModel(0xf1f5f9, 1.4); // 1.4m wingspan
        this.group.add(gull.root);

        this.birds.push({
          ...gull,
          center: new THREE.Vector3(c.x, c.y, c.z),
          radius: c.radius + (Math.random() - 0.5) * 25,
          altitude: c.y + (Math.random() - 0.5) * 8,
          speed: c.speed * (0.85 + Math.random() * 0.3),
          angle: Math.random() * Math.PI * 2,
          flapFrequency: 2.5,
        });
      }
    });
  }

  /**
   * Frame-by-frame animation update for deer grazing and bird flight kinematics
   */
  /**
   * Frame-by-frame animation update for deer grazing, drinking, fleeing, alert states,
   * and bird flight kinematics with reactive evasion.
   */
  public update(dt: number, elapsed: number, dronePos?: THREE.Vector3) {
    // 1. Update Deer Herds
    for (const d of this.deer) {
      // Strictly anchor hooves to the physical terrain surface every frame (zero floating)
      d.root.position.y = Math.max(0.5, evaluateIslandElevation(d.root.position.x, d.root.position.z).elevation);

      const cur = d.root.position;
      let distToDrone = 999;
      if (dronePos) {
        distToDrone = cur.distanceTo(dronePos);
      }

      // State determination based on drone proximity
      if (distToDrone < 18) {
        d.state = "FLEE";
        d.fleeTimer = 3.5;
      } else if (d.fleeTimer > 0) {
        d.fleeTimer -= dt;
        if (d.fleeTimer <= 0) {
          d.state = d.isDrinkingSpot ? "DRINK" : "IDLE";
        }
      } else if (distToDrone < 32) {
        d.state = "ALERT";
      } else if (d.isDrinkingSpot) {
        d.state = "DRINK";
      } else {
        d.state = d.isWalking ? "WANDER" : "IDLE";
      }

      // ----------------- STATE BEHAVIORS -----------------
      if (d.state === "FLEE" && dronePos) {
        // Flee rapidly away from drone
        const fleeDir = new THREE.Vector3().subVectors(cur, dronePos).setY(0);
        if (fleeDir.lengthSq() > 0.001) {
          fleeDir.normalize();
          cur.addScaledVector(fleeDir, 4.2 * dt);
          cur.y = Math.max(0.5, evaluateIslandElevation(cur.x, cur.z).elevation);

          const fleeHeading = Math.atan2(fleeDir.x, fleeDir.z);
          d.root.rotation.y = THREE.MathUtils.lerp(d.root.rotation.y, fleeHeading, dt * 6);
        }

        // Fast escape gallop / trot
        const gallop = Math.sin(elapsed * 14);
        d.leftFrontLeg.rotation.x = gallop * 0.75;
        d.rightFrontLeg.rotation.x = -gallop * 0.75;
        d.leftBackLeg.rotation.x = -gallop * 0.75;
        d.rightBackLeg.rotation.x = gallop * 0.75;

        // Head and neck erect and alarmed
        d.neck.rotation.x = THREE.MathUtils.lerp(d.neck.rotation.x, -0.35, dt * 6);
        d.head.rotation.x = THREE.MathUtils.lerp(d.head.rotation.x, 0.2, dt * 6);
        continue;
      }

      if (d.state === "ALERT" && dronePos) {
        // Alert posture: freeze, neck upright, look directly at drone
        d.leftFrontLeg.rotation.x = THREE.MathUtils.lerp(d.leftFrontLeg.rotation.x, 0, dt * 5);
        d.rightFrontLeg.rotation.x = THREE.MathUtils.lerp(d.rightFrontLeg.rotation.x, 0, dt * 5);
        d.leftBackLeg.rotation.x = THREE.MathUtils.lerp(d.leftBackLeg.rotation.x, 0, dt * 5);
        d.rightBackLeg.rotation.x = THREE.MathUtils.lerp(d.rightBackLeg.rotation.x, 0, dt * 5);

        d.neck.rotation.x = THREE.MathUtils.lerp(d.neck.rotation.x, -0.32, dt * 4);
        d.head.rotation.x = THREE.MathUtils.lerp(d.head.rotation.x, 0.15, dt * 4);

        const lookAngle = Math.atan2(dronePos.x - cur.x, dronePos.z - cur.z);
        d.root.rotation.y = THREE.MathUtils.lerp(d.root.rotation.y, lookAngle, dt * 4);
        continue;
      }

      if (d.state === "DRINK") {
        // Drinking by the lake or river: neck bows deep to water surface, rhythmic lapping
        d.leftFrontLeg.rotation.x = THREE.MathUtils.lerp(d.leftFrontLeg.rotation.x, 0, dt * 5);
        d.rightFrontLeg.rotation.x = THREE.MathUtils.lerp(d.rightFrontLeg.rotation.x, 0, dt * 5);
        d.leftBackLeg.rotation.x = THREE.MathUtils.lerp(d.leftBackLeg.rotation.x, 0, dt * 5);
        d.rightBackLeg.rotation.x = THREE.MathUtils.lerp(d.rightBackLeg.rotation.x, 0, dt * 5);

        d.neck.rotation.x = THREE.MathUtils.lerp(d.neck.rotation.x, 0.95, dt * 3);
        const lap = Math.sin(elapsed * 6) * 0.06;
        d.head.rotation.x = THREE.MathUtils.lerp(d.head.rotation.x, -0.42 + lap, dt * 4);
        continue;
      }

      // Normal grazing / wandering state
      d.grazePhase += dt;
      const grazeCycle = Math.sin(d.grazePhase * 0.6);
      const isEating = grazeCycle > -0.2;

      if (isEating) {
        d.neck.rotation.x = THREE.MathUtils.lerp(d.neck.rotation.x, 0.75, dt * 2);
        d.head.rotation.x = THREE.MathUtils.lerp(d.head.rotation.x, -0.35, dt * 2);
      } else {
        d.neck.rotation.x = THREE.MathUtils.lerp(d.neck.rotation.x, -0.15, dt * 2);
        d.head.rotation.x = THREE.MathUtils.lerp(d.head.rotation.x, 0.1, dt * 2);
      }

      // Wander behavior
      d.walkTimer -= dt;
      if (d.walkTimer <= 0) {
        d.walkTimer = 6 + Math.random() * 10;
        d.isWalking = Math.random() < 0.45; // 45% chance to stroll to next patch

        if (d.isWalking) {
          const ang = Math.random() * Math.PI * 2;
          const dist = 3 + Math.random() * 8;
          const tx = d.centerPos.x + Math.cos(ang) * dist;
          const tz = d.centerPos.z + Math.sin(ang) * dist;
          const ty = Math.max(0.5, evaluateIslandElevation(tx, tz).elevation);
          d.targetPos.set(tx, ty, tz);
        }
      }

      if (d.isWalking) {
        const dir = new THREE.Vector3().subVectors(d.targetPos, cur);
        const dist = dir.length();

        if (dist > 0.2) {
          dir.normalize();
          cur.addScaledVector(dir, 1.2 * dt);
          cur.y = Math.max(0.5, evaluateIslandElevation(cur.x, cur.z).elevation);

          const heading = Math.atan2(dir.x, dir.z);
          d.root.rotation.y = THREE.MathUtils.lerp(d.root.rotation.y, heading, dt * 3);

          // 4-leg walk cycle
          const legPhase = Math.sin(elapsed * 6);
          d.leftFrontLeg.rotation.x = legPhase * 0.45;
          d.rightFrontLeg.rotation.x = -legPhase * 0.45;
          d.leftBackLeg.rotation.x = -legPhase * 0.45;
          d.rightBackLeg.rotation.x = legPhase * 0.45;
        } else {
          d.isWalking = false;
          d.leftFrontLeg.rotation.x = 0;
          d.rightFrontLeg.rotation.x = 0;
          d.leftBackLeg.rotation.x = 0;
          d.rightBackLeg.rotation.x = 0;
        }
      }
    }

    // 2. Update Soaring Birds & Coastal Flocks with Reactive Evasion
    for (const b of this.birds) {
      let isNearDrone = false;
      if (dronePos && b.root.position.distanceTo(dronePos) < 26) {
        isNearDrone = true;
        b.scatterTimer = 2.0;
      } else if (b.scatterTimer && b.scatterTimer > 0) {
        b.scatterTimer -= dt;
        isNearDrone = true;
      }

      const effectiveSpeed = isNearDrone ? b.speed * 1.6 : b.speed;
      b.angle += effectiveSpeed * dt;

      if (isNearDrone) {
        // Gain altitude quickly when startled by drone
        b.altitude = Math.min(140, b.altitude + 5.0 * dt);
      }

      const x = b.center.x + Math.cos(b.angle) * b.radius;
      const z = b.center.z + Math.sin(b.angle) * b.radius;
      const y = b.altitude + Math.sin(elapsed * 0.5 + b.angle) * 3.5;

      b.root.position.set(x, y, z);

      const dirSign = b.speed >= 0 ? 1 : -1;
      const heading = b.angle + (dirSign > 0 ? Math.PI / 2 : -Math.PI / 2);
      b.root.rotation.y = -heading;
      b.root.rotation.z = dirSign * (isNearDrone ? 0.45 : 0.25); // Steep bank if startled

      // Fluttering flaps vs glide
      if (isNearDrone) {
        // Fast panic flapping
        const flap = Math.sin(elapsed * 4.2 * Math.PI * 2) * 0.55;
        b.leftWing.rotation.z = flap;
        b.rightWing.rotation.z = -flap;
      } else {
        const glidePhase = Math.sin(elapsed * 0.35 + b.radius);
        const isGliding = glidePhase > 0.2;

        if (isGliding) {
          b.leftWing.rotation.z = THREE.MathUtils.lerp(b.leftWing.rotation.z, 0.04, 0.1);
          b.rightWing.rotation.z = THREE.MathUtils.lerp(b.rightWing.rotation.z, -0.04, 0.1);
        } else {
          const flap = Math.sin(elapsed * b.flapFrequency * Math.PI * 2) * 0.45;
          b.leftWing.rotation.z = flap;
          b.rightWing.rotation.z = -flap;
        }
      }
    }

    // 3. Update Grazing Sheep
    for (const s of this.sheep) {
      s.root.position.y = Math.max(0.4, evaluateIslandElevation(s.root.position.x, s.root.position.z).elevation);

      let distToDrone = 999;
      if (dronePos) distToDrone = s.root.position.distanceTo(dronePos);

      // Alert if drone is hovering close
      s.alert = distToDrone < 22;

      s.walkTimer -= dt;
      if (s.walkTimer <= 0) {
        s.walkTimer = s.isWalking ? 4.0 + Math.random() * 5.0 : 2.5 + Math.random() * 3.5;
        s.isWalking = !s.isWalking;
        if (s.isWalking) {
          const wanderAngle = Math.random() * Math.PI * 2;
          const wanderDist = 2.0 + Math.random() * 4.0;
          s.targetPos.set(
            s.centerPos.x + Math.cos(wanderAngle) * wanderDist,
            0,
            s.centerPos.z + Math.sin(wanderAngle) * wanderDist
          );
        }
      }

      if (s.isWalking && !s.alert) {
        // Step leisurely towards wander target
        const dir = new THREE.Vector3().subVectors(s.targetPos, s.root.position).setY(0);
        if (dir.lengthSq() > 0.05) {
          dir.normalize();
          s.root.position.addScaledVector(dir, 0.65 * dt);
          const heading = Math.atan2(dir.x, dir.z);
          s.root.rotation.y = THREE.MathUtils.lerp(s.root.rotation.y, heading, dt * 3.0);

          // Leg stepping swing
          const step = Math.sin(elapsed * 5.5) * 0.35;
          s.leftFrontLeg.rotation.x = step;
          s.rightFrontLeg.rotation.x = -step;
          s.leftBackLeg.rotation.x = -step;
          s.rightBackLeg.rotation.x = step;

          // Head lifted slightly while walking
          s.neck.rotation.x = THREE.MathUtils.lerp(s.neck.rotation.x, -0.15, dt * 4.0);
        } else {
          s.isWalking = false;
        }
      } else if (s.alert) {
        // Head erect, watching drone
        s.neck.rotation.x = THREE.MathUtils.lerp(s.neck.rotation.x, -0.45, dt * 6.0);
        s.tail.rotation.x = Math.sin(elapsed * 12) * 0.4;
        if (distToDrone < 12 && dronePos) {
          // Slow jog away from drone
          const fleeDir = new THREE.Vector3().subVectors(s.root.position, dronePos).setY(0).normalize();
          s.root.position.addScaledVector(fleeDir, 1.8 * dt);
          s.root.rotation.y = Math.atan2(fleeDir.x, fleeDir.z);
        }
      } else {
        // Peaceful Grazing: head dips down to nibble grass
        s.grazePhase += dt * 1.5;
        const dip = Math.sin(s.grazePhase) * 0.25 + 0.38;
        s.neck.rotation.x = THREE.MathUtils.lerp(s.neck.rotation.x, dip, dt * 3.0);
        s.head.rotation.x = Math.sin(s.grazePhase * 2.0) * 0.08;
        s.tail.rotation.x = Math.sin(elapsed * 3) * 0.15;
      }
    }

    // 4. Update Nimble Squirrels
    for (const sq of this.squirrels) {
      sq.root.position.y = Math.max(0.2, evaluateIslandElevation(sq.root.position.x, sq.root.position.z).elevation);

      sq.dashTimer -= dt;
      if (sq.dashTimer <= 0) {
        sq.isDashing = !sq.isDashing;
        sq.dashTimer = sq.isDashing ? 1.0 + Math.random() * 1.5 : 2.0 + Math.random() * 3.0;
        if (sq.isDashing) {
          const ang = Math.random() * Math.PI * 2;
          const dist = 1.5 + Math.random() * 2.5;
          sq.targetPos.set(
            sq.treePos.x + Math.cos(ang) * dist,
            0,
            sq.treePos.z + Math.sin(ang) * dist
          );
        }
      }

      if (sq.isDashing) {
        const dir = new THREE.Vector3().subVectors(sq.targetPos, sq.root.position).setY(0);
        if (dir.lengthSq() > 0.04) {
          dir.normalize();
          sq.root.position.addScaledVector(dir, 3.2 * dt);
          sq.root.rotation.y = Math.atan2(dir.x, dir.z);
          // Tail ripple during dash
          sq.tail.rotation.x = 0.5 + Math.sin(elapsed * 20) * 0.25;
        } else {
          sq.isDashing = false;
        }
      } else {
        // Sitting upright on hind legs, twitching tail and surveying
        sq.tail.rotation.x = 0.8 + Math.sin(elapsed * 4.0) * 0.18;
        sq.head.rotation.y = Math.sin(elapsed * 2.5) * 0.35;
      }
    }
  }

  /**
   * Procedural articulated sheep model (fluffy wool body, dark face/legs, animated neck & legs)
   */
  private createSheepModel(): {
    root: THREE.Group;
    neck: THREE.Object3D;
    head: THREE.Object3D;
    leftFrontLeg: THREE.Object3D;
    rightFrontLeg: THREE.Object3D;
    leftBackLeg: THREE.Object3D;
    rightBackLeg: THREE.Object3D;
    tail: THREE.Object3D;
  } {
    const root = new THREE.Group();

    const woolMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f0,
      roughness: 0.95,
      metalness: 0.02,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

    // Main Woolly Body (rounded cloud shape)
    const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), woolMat);
    bodyMesh.scale.set(0.95, 0.85, 1.35);
    bodyMesh.position.set(0, 0.65, 0);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    root.add(bodyMesh);

    // Woolly puffs adding cloud texture
    const puffPositions = [
      { x: -0.28, y: 0.78, z: 0.2, s: 0.38 },
      { x: 0.28, y: 0.78, z: 0.2, s: 0.38 },
      { x: -0.25, y: 0.75, z: -0.3, s: 0.35 },
      { x: 0.25, y: 0.75, z: -0.3, s: 0.35 },
      { x: 0.0, y: 0.85, z: 0.0, s: 0.42 },
    ];
    puffPositions.forEach((p) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(p.s, 7, 7), woolMat);
      puff.position.set(p.x, p.y, p.z);
      root.add(puff);
    });

    // Articulated Neck & Head
    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 0.72, 0.58);

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.36, 7), darkMat);
    head.position.set(0, 0.08, 0.2);
    head.rotation.x = Math.PI / 4;
    head.castShadow = true;
    neckPivot.add(head);

    // Woolly fleece cap on head
    const fleeceCap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 7), woolMat);
    fleeceCap.position.set(0, 0.2, 0.12);
    neckPivot.add(fleeceCap);

    // Cute floppy ears
    const earLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.07), darkMat);
    earLeft.position.set(-0.18, 0.16, 0.14);
    earLeft.rotation.z = -0.3;
    neckPivot.add(earLeft);

    const earRight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.07), darkMat);
    earRight.position.set(0.18, 0.16, 0.14);
    earRight.rotation.z = 0.3;
    neckPivot.add(earRight);

    // Eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), eyeMat);
    eyeL.position.set(-0.11, 0.12, 0.3);
    neckPivot.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), eyeMat);
    eyeR.position.set(0.11, 0.12, 0.3);
    neckPivot.add(eyeR);

    root.add(neckPivot);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.45, 6);
    legGeo.translate(0, -0.22, 0);

    const lfLeg = new THREE.Mesh(legGeo, darkMat);
    lfLeg.position.set(-0.25, 0.45, 0.4);
    lfLeg.castShadow = true;
    root.add(lfLeg);

    const rfLeg = new THREE.Mesh(legGeo, darkMat);
    rfLeg.position.set(0.25, 0.45, 0.4);
    rfLeg.castShadow = true;
    root.add(rfLeg);

    const lbLeg = new THREE.Mesh(legGeo, darkMat);
    lbLeg.position.set(-0.25, 0.45, -0.4);
    lbLeg.castShadow = true;
    root.add(lbLeg);

    const rbLeg = new THREE.Mesh(legGeo, darkMat);
    rbLeg.position.set(0.25, 0.45, -0.4);
    rbLeg.castShadow = true;
    root.add(rbLeg);

    // Little woolly tail
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 5), woolMat);
    tail.position.set(0, 0.65, -0.68);
    root.add(tail);

    return {
      root,
      neck: neckPivot,
      head,
      leftFrontLeg: lfLeg,
      rightFrontLeg: rfLeg,
      leftBackLeg: lbLeg,
      rightBackLeg: rbLeg,
      tail,
    };
  }

  /**
   * Spawns picturesque grazing sheep herds across island pastures and meadow hillsides
   */
  private spawnSheepHerds() {
    const herdCenters = [
      { x: 210, z: 95, count: 10 },  // Rural Farmstead pasture
      { x: 360, z: -140, count: 8 }, // East Emerald foothill meadow
      { x: -50, z: 240, count: 8 },  // River canyon grassy meadow
    ];

    herdCenters.forEach((herd) => {
      for (let i = 0; i < herd.count; i++) {
        const ang = (i / herd.count) * Math.PI * 2 + Math.random() * 0.4;
        const rad = 4.0 + Math.random() * 18.0;
        const sx = herd.x + Math.cos(ang) * rad;
        const sz = herd.z + Math.sin(ang) * rad;
        const sy = Math.max(0.4, evaluateIslandElevation(sx, sz).elevation);

        const model = this.createSheepModel();
        model.root.position.set(sx, sy, sz);
        model.root.rotation.y = Math.random() * Math.PI * 2;

        const scale = 0.85 + Math.random() * 0.25;
        model.root.scale.set(scale, scale, scale);
        this.group.add(model.root);

        this.sheep.push({
          ...model,
          centerPos: new THREE.Vector3(herd.x, sy, herd.z),
          targetPos: new THREE.Vector3(sx, sy, sz),
          walkTimer: 2.0 + Math.random() * 6.0,
          isWalking: Math.random() > 0.6,
          grazePhase: Math.random() * Math.PI * 2,
          alert: false,
        });
      }
    });
  }

  /**
   * Procedural nimble squirrel model
   */
  private createSquirrelModel(): {
    root: THREE.Group;
    tail: THREE.Object3D;
    head: THREE.Object3D;
  } {
    const root = new THREE.Group();
    const furMat = new THREE.MeshStandardMaterial({ color: 0x9e4822, roughness: 0.85 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfdebd0, roughness: 0.8 });
    const darkMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    // Torso
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.32, 7), furMat);
    body.position.set(0, 0.18, 0);
    body.rotation.x = 0.25;
    body.castShadow = true;
    root.add(body);

    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.22, 0.06), bellyMat);
    belly.position.set(0, 0.18, 0.08);
    root.add(belly);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 7), furMat);
    head.position.set(0, 0.36, 0.08);
    root.add(head);

    // Ears
    [-0.06, 0.06].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), furMat);
      ear.position.set(ex, 0.44, 0.08);
      root.add(ear);
    });

    // Eyes
    [-0.06, 0.06].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), darkMat);
      eye.position.set(ex, 0.38, 0.16);
      root.add(eye);
    });

    // Bushy Tail arching up over back
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.12, -0.12);

    const tailGeo = new THREE.CylinderGeometry(0.04, 0.09, 0.36, 6);
    tailGeo.translate(0, 0.18, 0);
    const tailMesh = new THREE.Mesh(tailGeo, furMat);
    tailMesh.rotation.x = 0.8;
    tailPivot.add(tailMesh);
    root.add(tailPivot);

    return { root, tail: tailPivot, head };
  }

  /**
   * Spawns agile squirrels near tree clusters in forest & park clearings
   */
  private spawnSquirrels() {
    const squirrelSpots = [
      { x: -520, z: 20 },
      { x: -480, z: 70 },
      { x: -560, z: -40 },
      { x: -440, z: -80 },
      { x: 580, z: 240 },
      { x: 620, z: 290 },
      { x: 180, z: 120 },
      { x: -120, z: 80 },
    ];

    squirrelSpots.forEach((spot) => {
      for (let i = 0; i < 2; i++) {
        const sx = spot.x + (Math.random() - 0.5) * 6;
        const sz = spot.z + (Math.random() - 0.5) * 6;
        const sy = Math.max(0.2, evaluateIslandElevation(sx, sz).elevation);

        const sq = this.createSquirrelModel();
        sq.root.position.set(sx, sy, sz);
        sq.root.rotation.y = Math.random() * Math.PI * 2;
        sq.root.scale.set(1.2, 1.2, 1.2);
        this.group.add(sq.root);

        this.squirrels.push({
          ...sq,
          treePos: new THREE.Vector3(spot.x, sy, spot.z),
          targetPos: new THREE.Vector3(sx, sy, sz),
          dashTimer: 1.0 + Math.random() * 3.0,
          isDashing: false,
        });
      }
    });
  }
}
