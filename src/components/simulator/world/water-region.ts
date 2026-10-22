// ==========================================================
// DRONE PILOT — REGION F: WATER BODIES & COASTAL MARINA
// Mountain Lake, Winding River Delta, Stone Bridge & Marina Pier
// ==========================================================

import * as THREE from "three";

export class WaterRegion {
  public group = new THREE.Group();

  constructor() {
    this.buildMountainLake();
    this.buildWindingRiver();
    // this.buildStoneBridge();
    this.buildCoastalMarina();
  }

  // 1. MOUNTAIN FRESHWATER LAKE (North-West Foothills: X: -140, Z: -50)
  private buildMountainLake() {
    const shorelineMat = new THREE.MeshStandardMaterial({
      color: 0xd4b996,
      roughness: 0.9,
    });

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.08,
      metalness: 0.90,
      transparent: true,
      opacity: 0.95,
    });

    const lakeRim = new THREE.Mesh(
      new THREE.CylinderGeometry(44, 46, 0.45, 32),
      shorelineMat
    );
    lakeRim.position.set(-140, 0.32, -50);
    this.group.add(lakeRim);

    const lakeWater = new THREE.Mesh(
      new THREE.CylinderGeometry(42, 42, 0.48, 32),
      waterMat
    );
    lakeWater.position.set(-140, 0.33, -50);
    this.group.add(lakeWater);

    // Lake Island Rock Outcropping
    const lakeRock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(4.5, 1),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 })
    );
    lakeRock.position.set(-142, 1.8, -52);
    this.group.add(lakeRock);
  }

  // 2. WINDING VALLEY RIVER (Lake -> Valley Pass -> Ocean Delta)
  private buildWindingRiver() {
    const shorelineMat = new THREE.MeshStandardMaterial({ color: 0xd4b996, roughness: 0.9 });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.08,
      metalness: 0.90,
      transparent: true,
      opacity: 0.95,
    });

    const riverSegments = [
      { x: -120, z: -25, w: 16, l: 45, rotY: 0.5 },
      { x: -95, z: 0, w: 18, l: 48, rotY: 0.9 },
      { x: -70, z: 28, w: 20, l: 52, rotY: 1.1 },
      { x: -55, z: 65, w: 22, l: 55, rotY: 0.4 },
      { x: -65, z: 110, w: 25, l: 60, rotY: -0.2 },
      { x: -85, z: 165, w: 32, l: 75, rotY: -0.4 },
      { x: -115, z: 225, w: 45, l: 90, rotY: -0.5 }, // Ocean delta estuary
    ];

    riverSegments.forEach((seg) => {
      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(seg.w + 4, 0.25, seg.l + 4),
        shorelineMat
      );
      bed.position.set(seg.x, 0.32, seg.z);
      bed.rotation.y = seg.rotY;
      this.group.add(bed);

      const water = new THREE.Mesh(
        new THREE.BoxGeometry(seg.w, 0.28, seg.l),
        waterMat
      );
      water.position.set(seg.x, 0.33, seg.z);
      water.rotation.y = seg.rotY;
      this.group.add(water);
    });
  }

  // 3. STONE ARCHED VEHICULAR RIVER BRIDGE (X: -55, Z: 65)
  private buildStoneBridge() {
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
    const bridgeSpan = new THREE.Mesh(
      new THREE.BoxGeometry(10, 1.2, 30),
      bridgeMat
    );
    bridgeSpan.position.set(-55, 1.6, 65);
    bridgeSpan.rotation.y = 0.4;
    bridgeSpan.castShadow = true;
    this.group.add(bridgeSpan);

    // Guardrails
    [-4.5, 4.5].forEach((offset) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.8, 30),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      rail.position.set(-55 + Math.cos(0.4) * offset, 2.5, 65 - Math.sin(0.4) * offset);
      rail.rotation.y = 0.4;
      this.group.add(rail);
    });
  }

  // 4. COASTAL MARINA BAY & DOCK PIER (X: -145, Z: 185)
  private buildCoastalMarina() {
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const pier = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.4, 45), pierMat);
    pier.position.set(-145, 0.55, 185);
    pier.castShadow = true;
    this.group.add(pier);

    // Pier Pilings
    [-2.6, 2.6].forEach((xOff) => {
      [170, 185, 200].forEach((zPos) => {
        const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 2.2, 8), pierMat);
        piling.position.set(-145 + xOff, -0.2, zPos);
        this.group.add(piling);
      });
    });

    // Marine Channel Navigation Buoys
    [
      { x: -130, z: 235, color: 0xef4444 },
      { x: -165, z: 250, color: 0x22c55e },
      { x: -110, z: 275, color: 0xf59e0b },
    ].forEach((b) => {
      const buoyBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.3, 1.5, 12),
        new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.5 })
      );
      buoyBase.position.set(b.x, 0.7, b.z);
      this.group.add(buoyBase);

      const buoyLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshBasicMaterial({ color: b.color })
      );
      buoyLight.position.set(b.x, 1.7, b.z);
      this.group.add(buoyLight);
    });
  }
}

