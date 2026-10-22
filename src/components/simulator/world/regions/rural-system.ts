// ==========================================================
// DRONE PILOT — RURAL SETTLEMENTS & HOMESTEADS SYSTEM
// Rustic farmhouses, barns, animated windmills, wooden fences,
// haystacks & lakeside campsites populating open meadows & valleys
// ==========================================================

import * as THREE from "three";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";

interface AnimatedWindmill {
  bladesGroup: THREE.Group;
  speed: number;
}

export class RuralSystem {
  public group = new THREE.Group();
  private windmills: AnimatedWindmill[] = [];

  constructor() {
    this.buildFarmHomesteads();
    this.buildLakesideCampgrounds();
    this.buildRuralWindmills();
    this.buildFencesAndHayBales();
    this.buildSunflowerFields();
    this.buildStripCropFields();
  }

  /**
   * Helper to construct a cozy rural farmhouse cottage with pitched roof & chimney
   */
  private createFarmhouse(wallColor = 0xe2e8f0, roofColor = 0x991b1b): THREE.Group {
    const house = new THREE.Group();

    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.65 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.8 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });

    // Main House Body (10m x 7m x 4.5m)
    const body = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 7), wallMat);
    body.position.y = 2.25;
    body.castShadow = true;
    body.receiveShadow = true;
    house.add(body);

    // Pitched Gable Roof
    const roofGeo = new THREE.ConeGeometry(7.2, 3.2, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.scale(1.2, 1.0, 0.9);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 4.5 + 1.6;
    roof.castShadow = true;
    house.add(roof);

    // Stone Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.5, 1.2), stoneMat);
    chimney.position.set(3.8, 4.2, 1.8);
    chimney.castShadow = true;
    house.add(chimney);

    // Front Door (timber)
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.2), woodMat);
    door.position.set(0, 1.3, 3.55);
    house.add(door);

    // Glass Windows
    [-3.0, 3.0].forEach((wx) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.15), glassMat);
      win.position.set(wx, 2.4, 3.55);
      house.add(win);
    });

    return house;
  }

  /**
   * Helper to construct a traditional red agricultural barn
   */
  private createBarn(): THREE.Group {
    const barn = new THREE.Group();

    const barnRedMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

    // Barn Body (16m x 11m x 7m)
    const body = new THREE.Mesh(new THREE.BoxGeometry(16, 7.0, 11), barnRedMat);
    body.position.y = 3.5;
    body.castShadow = true;
    body.receiveShadow = true;
    barn.add(body);

    // Gambrel Barn Roof
    const roofGeo = new THREE.ConeGeometry(10.5, 4.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.scale(1.35, 1.0, 0.95);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 7.0 + 2.25;
    roof.castShadow = true;
    barn.add(roof);

    // Large Double Barn Doors with X trim
    const door = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.8, 0.2), whiteTrimMat);
    door.position.set(0, 2.4, 5.55);
    barn.add(door);

    return barn;
  }

  /**
   * Builds rural farmsteads across meadows and foothill grasslands
   */
  private buildFarmHomesteads() {
    const farms = [
      // Farm 1: Emerald Grassland Homestead (East of Academy runway)
      { x: 220, z: 80, rot: 0.3, hasBarn: true },
      // Farm 2: Southern River Valley Ranch
      { x: -90, z: 380, rot: 1.2, hasBarn: true },
      // Farm 3: Pelican Foothill Homestead
      { x: -580, z: 460, rot: -0.4, hasBarn: false },
      // Farm 4: Whispering Pines Border Cabin (on dry scenic mountain ridge)
      { x: -520, z: -280, rot: 0.8, hasBarn: false },
    ];

    farms.forEach((f) => {
      const elev = evaluateIslandElevation(f.x, f.z).elevation;
      const farmGroup = new THREE.Group();
      farmGroup.position.set(f.x, elev, f.z);
      farmGroup.rotation.y = f.rot;

      const house = this.createFarmhouse(0xf1f5f9, 0xb91c1c);
      farmGroup.add(house);

      if (f.hasBarn) {
        const barn = this.createBarn();
        barn.position.set(22, 0, -8);
        farmGroup.add(barn);

        // Grain Silo beside barn
        const siloMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
        const silo = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 11, 14), siloMat);
        silo.position.set(32, 5.5, -8);
        silo.castShadow = true;
        farmGroup.add(silo);

        const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), siloMat);
        dome.position.set(32, 11.0, -8);
        farmGroup.add(dome);
      }

      this.group.add(farmGroup);
    });
  }

  /**
   * Lakeside and riverbank campgrounds with tents and stone fire pits
   */
  private buildLakesideCampgrounds() {
    const camps = [
      { x: -250, z: -120, tents: 3 }, // Scenic ridge overlooking Crystal Lake
      { x: -110, z: 80, tents: 2 },   // Valley meadow east of river canyon
    ];

    const tentMat1 = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 });
    const tentMat2 = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });

    camps.forEach((c) => {
      const elev = evaluateIslandElevation(c.x, c.z).elevation;
      const campGroup = new THREE.Group();
      campGroup.position.set(c.x, elev, c.z);

      for (let i = 0; i < c.tents; i++) {
        const ang = (i / c.tents) * Math.PI * 2;
        const tx = Math.cos(ang) * 8.0;
        const tz = Math.sin(ang) * 8.0;

        // A-frame tent (width 3.2m x length 4.0m x height 2.2m)
        const tentGeo = new THREE.ConeGeometry(2.8, 2.4, 4);
        tentGeo.rotateY(Math.PI / 4);
        tentGeo.scale(1.2, 1.0, 0.85);

        const tent = new THREE.Mesh(tentGeo, i % 2 === 0 ? tentMat1 : tentMat2);
        tent.position.set(tx, 1.2, tz);
        tent.rotation.y = ang + Math.PI;
        tent.castShadow = true;
        campGroup.add(tent);
      }

      // Stone fire pit with glowing ember center
      const pitGeo = new THREE.TorusGeometry(1.2, 0.3, 6, 12);
      pitGeo.rotateX(Math.PI / 2);
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
      const pit = new THREE.Mesh(pitGeo, stoneMat);
      pit.position.y = 0.2;
      campGroup.add(pit);

      const emberGeo = new THREE.CircleGeometry(0.8, 8);
      emberGeo.rotateX(-Math.PI / 2);
      const emberMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
      const ember = new THREE.Mesh(emberGeo, emberMat);
      ember.position.y = 0.25;
      campGroup.add(ember);

      this.group.add(campGroup);
    });
  }

  /**
   * Functional rural farm windmills with rotating 4-blade fans
   */
  private buildRuralWindmills() {
    const locations = [
      { x: 190, z: 120 },
      { x: -540, z: 420 },
    ];

    const towerMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

    locations.forEach((loc) => {
      const elev = evaluateIslandElevation(loc.x, loc.z).elevation;
      const mill = new THREE.Group();
      mill.position.set(loc.x, elev, loc.z);

      // Lattice Tower
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.2, 14, 6), towerMat);
      tower.position.y = 7.0;
      tower.castShadow = true;
      mill.add(tower);

      // Nacelle Head
      const nacelle = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 2.4), towerMat);
      nacelle.position.set(0, 14.5, 0);
      mill.add(nacelle);

      // 4-Blade Windmill Rotor
      const rotorGroup = new THREE.Group();
      rotorGroup.position.set(0, 14.5, 1.3);

      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.2, 0.08), bladeMat);
        blade.position.y = 2.6;
        blade.castShadow = true;

        const bladePivot = new THREE.Group();
        bladePivot.rotation.z = (b * Math.PI) / 2;
        bladePivot.add(blade);
        rotorGroup.add(bladePivot);
      }

      mill.add(rotorGroup);
      this.group.add(mill);

      this.windmills.push({
        bladesGroup: rotorGroup,
        speed: 1.2 + Math.random() * 0.8,
      });
    });
  }

  /**
   * Wooden paddock fences and golden cylindrical hay bales in pastures
   */
  private buildFencesAndHayBales() {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.95 });

    // Pasture at Emerald Grassland (X: 200 to 250, Z: 50 to 90)
    const pX = 200;
    const pZ = 50;
    const pWidth = 45;
    const pLength = 35;
    const elev = evaluateIslandElevation(pX, pZ).elevation;

    // 4 Fence Rails enclosing paddock
    const railGeo = new THREE.BoxGeometry(pWidth, 0.15, 0.08);

    const r1 = new THREE.Mesh(railGeo, fenceMat);
    r1.position.set(pX + pWidth / 2, elev + 0.9, pZ);
    this.group.add(r1);

    const r2 = new THREE.Mesh(railGeo, fenceMat);
    r2.position.set(pX + pWidth / 2, elev + 0.9, pZ + pLength);
    this.group.add(r2);

    // Scattered round hay bales in meadow
    const balePositions = [
      { x: 215, z: 62 },
      { x: 228, z: 74 },
      { x: 236, z: 58 },
      { x: 242, z: 70 },
      { x: -75, z: 360 },
      { x: -105, z: 400 },
    ];

    balePositions.forEach((bp) => {
      const bElev = evaluateIslandElevation(bp.x, bp.z).elevation;
      const bale = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.8, 12), hayMat);
      bale.rotation.z = Math.PI / 2;
      bale.position.set(bp.x, bElev + 1.1, bp.z);
      bale.castShadow = true;
      this.group.add(bale);
    });
  }

  /**
   * Vibrant golden sunflower fields with tilled dark earth, post fences, and thousands of instanced blooms
   */
  private buildSunflowerFields() {
    const plots = [
      { centerX: 270, centerZ: -70, width: 52, length: 38, rows: 14, perRow: 22 },
      { centerX: 385, centerZ: 25, width: 60, length: 44, rows: 16, perRow: 26 },
      { centerX: 440, centerZ: -150, width: 48, length: 36, rows: 12, perRow: 20 },
    ];

    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x3b2614,
      roughness: 0.95,
      metalness: 0.05,
    });
    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.9,
    });

    // Count total sunflowers
    let totalFlowers = 0;
    plots.forEach(p => totalFlowers += p.rows * p.perRow);

    // Stem Instanced Mesh
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.35, 5);
    stemGeo.translate(0, 0.675, 0);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.85 });
    const stemMesh = new THREE.InstancedMesh(stemGeo, stemMat, totalFlowers);
    stemMesh.castShadow = true;

    // Petal disc Instanced Mesh
    const headGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.06, 12);
    headGeo.rotateX(Math.PI / 3); // Face towards morning sun
    headGeo.translate(0, 1.35, 0.12);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.6,
      emissive: 0xd97706,
      emissiveIntensity: 0.15,
    });
    const headMesh = new THREE.InstancedMesh(headGeo, headMat, totalFlowers);
    headMesh.castShadow = true;

    // Center seed disc
    const seedGeo = new THREE.SphereGeometry(0.18, 8, 6);
    seedGeo.scale(1.0, 0.4, 1.0);
    seedGeo.rotateX(Math.PI / 3);
    seedGeo.translate(0, 1.37, 0.14);
    const seedMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.95 });
    const seedMesh = new THREE.InstancedMesh(seedGeo, seedMat, totalFlowers);

    let idx = 0;
    const dummy = new THREE.Object3D();

    for (const plot of plots) {
      const { centerX, centerZ, width, length, rows, perRow } = plot;
      const baseElev = evaluateIslandElevation(centerX, centerZ).elevation;

      // Dark tilled soil bed
      const soil = new THREE.Mesh(new THREE.BoxGeometry(width + 2, 0.4, length + 2), soilMat);
      soil.position.set(centerX, baseElev + 0.15, centerZ);
      soil.receiveShadow = true;
      this.group.add(soil);

      // Boundary post & rail fence
      const postGeo = new THREE.CylinderGeometry(0.09, 0.1, 1.2, 6);
      const postMat = fenceMat;
      const numPostsX = Math.floor(width / 6);
      const numPostsZ = Math.floor(length / 6);

      for (let i = 0; i <= numPostsX; i++) {
        const x = centerX - width / 2 + (i / numPostsX) * width;
        const postFront = new THREE.Mesh(postGeo, postMat);
        const zFront = centerZ - length / 2;
        postFront.position.set(x, evaluateIslandElevation(x, zFront).elevation + 0.6, zFront);
        postFront.castShadow = true;
        this.group.add(postFront);

        const postBack = new THREE.Mesh(postGeo, postMat);
        const zBack = centerZ + length / 2;
        postBack.position.set(x, evaluateIslandElevation(x, zBack).elevation + 0.6, zBack);
        postBack.castShadow = true;
        this.group.add(postBack);
      }

      // Populate sunflowers
      const startX = centerX - width / 2 + 2;
      const startZ = centerZ - length / 2 + 2;
      const stepX = (width - 4) / perRow;
      const stepZ = (length - 4) / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < perRow; c++) {
          const fx = startX + c * stepX + (Math.sin(r * 4.3 + c) * 0.25);
          const fz = startZ + r * stepZ + (Math.cos(c * 3.1 + r) * 0.25);
          const fElev = evaluateIslandElevation(fx, fz).elevation;
          const jitterScale = 0.85 + ((r * 17 + c * 29) % 30) * 0.01;

          dummy.position.set(fx, fElev + 0.1, fz);
          dummy.rotation.y = (Math.sin(fx * 0.5 + fz * 0.8) * 0.3);
          dummy.scale.set(jitterScale, jitterScale, jitterScale);
          dummy.updateMatrix();

          stemMesh.setMatrixAt(idx, dummy.matrix);
          headMesh.setMatrixAt(idx, dummy.matrix);
          seedMesh.setMatrixAt(idx, dummy.matrix);
          idx++;
        }
      }
    }

    stemMesh.instanceMatrix.needsUpdate = true;
    headMesh.instanceMatrix.needsUpdate = true;
    seedMesh.instanceMatrix.needsUpdate = true;

    this.group.add(stemMesh);
    this.group.add(headMesh);
    this.group.add(seedMesh);
  }

  /**
   * Agricultural crop strip fields: alternating furrows of wheat, lavender, canola, and parked tractor
   */
  private buildStripCropFields() {
    const fieldConfigs = [
      { centerX: 180, centerZ: -140, width: 70, length: 55, orientation: 0.1 },
      { centerX: 330, centerZ: -230, width: 85, length: 65, orientation: -0.2 },
      { centerX: 470, centerZ: -80, width: 75, length: 50, orientation: 0.3 },
    ];

    const stripColors = [
      0xdfb15b, // Golden Wheat
      0x7c3aed, // Purple Lavender
      0xfacc15, // Bright Canola
      0x2e7d32, // Lush Alfalfa
      0xc29b38, // Ripe Barley
    ];

    fieldConfigs.forEach((fc) => {
      const fieldGroup = new THREE.Group();
      const numStrips = 9;
      const stripWidth = fc.width / numStrips;
      const baseElev = evaluateIslandElevation(fc.centerX, fc.centerZ).elevation;

      for (let s = 0; s < numStrips; s++) {
        const mat = new THREE.MeshStandardMaterial({
          color: stripColors[s % stripColors.length],
          roughness: 0.85,
        });

        // Elevated strip bed with slight furrow contour
        const stripMesh = new THREE.Mesh(
          new THREE.BoxGeometry(stripWidth * 0.94, 0.45, fc.length),
          mat
        );
        const offsetX = -fc.width / 2 + (s + 0.5) * stripWidth;
        stripMesh.position.set(offsetX, 0.22, 0);
        stripMesh.receiveShadow = true;
        fieldGroup.add(stripMesh);
      }

      fieldGroup.position.set(fc.centerX, baseElev, fc.centerZ);
      fieldGroup.rotation.y = fc.orientation;
      this.group.add(fieldGroup);

      // Add a couple of rolled hay bales near field edges
      const hayMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.9 });
      for (let b = 0; b < 3; b++) {
        const bx = fc.centerX + (b - 1) * 14 + 10;
        const bz = fc.centerZ - fc.length / 2 - 6;
        const be = evaluateIslandElevation(bx, bz).elevation;
        const bale = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.6, 12), hayMat);
        bale.rotation.z = Math.PI / 2;
        bale.position.set(bx, be + 1.0, bz);
        bale.castShadow = true;
        this.group.add(bale);
      }
    });

    // Parked Red Farm Tractor at Farm 2 edge
    this.buildFarmTractor(160, -110, 0.4);
  }

  /**
   * Detailed procedural farm tractor
   */
  private buildFarmTractor(x: number, z: number, rotationY = 0) {
    const elev = evaluateIslandElevation(x, z).elevation;
    const tractor = new THREE.Group();

    const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4, metalness: 0.3 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, metalness: 0.6 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.6, roughness: 0.1 });

    // Chassis / Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 3.6), redMat);
    body.position.set(0, 1.4, 0);
    body.castShadow = true;
    tractor.add(body);

    // Engine Hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.0), redMat);
    hood.position.set(0, 1.35, 1.5);
    hood.castShadow = true;
    tractor.add(hood);

    // Glass Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 1.5), glassMat);
    cab.position.set(0, 2.4, -0.4);
    tractor.add(cab);

    // Cab Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.15, 1.7), redMat);
    roof.position.set(0, 3.15, -0.4);
    roof.castShadow = true;
    tractor.add(roof);

    // Exhaust Pipe
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), darkMetalMat);
    exhaust.position.set(0.65, 2.4, 1.8);
    tractor.add(exhaust);

    // Large Rear Wheels
    const rearWheelGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.7, 16);
    rearWheelGeo.rotateZ(Math.PI / 2);
    const leftRear = new THREE.Mesh(rearWheelGeo, rubberMat);
    leftRear.position.set(-1.25, 1.2, -0.8);
    leftRear.castShadow = true;
    tractor.add(leftRear);

    const rightRear = new THREE.Mesh(rearWheelGeo, rubberMat);
    rightRear.position.set(1.25, 1.2, -0.8);
    rightRear.castShadow = true;
    tractor.add(rightRear);

    // Smaller Front Wheels
    const frontWheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.45, 14);
    frontWheelGeo.rotateZ(Math.PI / 2);
    const leftFront = new THREE.Mesh(frontWheelGeo, rubberMat);
    leftFront.position.set(-1.1, 0.7, 1.8);
    leftFront.castShadow = true;
    tractor.add(leftFront);

    const rightFront = new THREE.Mesh(frontWheelGeo, rubberMat);
    rightFront.position.set(1.1, 0.7, 1.8);
    rightFront.castShadow = true;
    tractor.add(rightFront);

    tractor.position.set(x, elev, z);
    tractor.rotation.y = rotationY;
    this.group.add(tractor);
  }

  /**
   * Frame-by-frame animation of windmill rotation
   */
  public update(dt: number) {
    for (const w of this.windmills) {
      w.bladesGroup.rotation.z += w.speed * dt;
    }
  }
}

