import * as THREE from "three";

export class CityRegion {
  public group = new THREE.Group();
  private radarDish!: THREE.Mesh;
  private commsStrobe!: THREE.Mesh;

  constructor() {
    this.buildCityBase();
    this.buildSkyscrapers();
    this.buildCommunicationsTower();
  }

  private buildCityBase() {
    // Large Concrete Foundation
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9, metalness: 0.1 });
    const baseGeo = new THREE.BoxGeometry(200, 0.5, 200);
    const baseMesh = new THREE.Mesh(baseGeo, concreteMat);
    baseMesh.position.set(150, 0.25, 150);
    baseMesh.receiveShadow = true;
    this.group.add(baseMesh);

    // City Perimeter Railing
    const railMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.8 });
    const railGroup = new THREE.Group();
    
    // Four sides of the railing
    const edges = [
      { x: 150, z: 50, w: 200, d: 0.4 },
      { x: 150, z: 250, w: 200, d: 0.4 },
      { x: 50, z: 150, w: 0.4, d: 200 },
      { x: 250, z: 150, w: 0.4, d: 200 }
    ];

    edges.forEach(edge => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(edge.w, 1.2, edge.d), railMat);
      rail.position.set(edge.x, 1.1, edge.z);
      rail.castShadow = true;
      railGroup.add(rail);
    });
    this.group.add(railGroup);
  }

  private buildSkyscrapers() {
    const bldgColors = [0x334155, 0x1e293b, 0x475569, 0x0f172a, 0x64748b, 0x94a3b8];
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.9,
    });

    const buildings = [
      { x: 80, z: 80, w: 24, l: 24, h: 60, name: "Skyline Tower A" },
      { x: 140, z: 70, w: 28, l: 26, h: 80, name: "Nexus Headquarters" },
      { x: 210, z: 80, w: 22, l: 28, h: 50, name: "Vanguard Spire" },
      { x: 70, z: 140, w: 26, l: 26, h: 45, name: "Commerce Plaza" },
      { x: 150, z: 150, w: 34, l: 30, h: 90, name: "Apex Center" },
      { x: 220, z: 140, w: 26, l: 24, h: 55, name: "Horizon Hub" },
      { x: 80, z: 210, w: 28, l: 24, h: 40, name: "East River Lofts" },
      { x: 150, z: 220, w: 30, l: 28, h: 65, name: "Tech Core" },
      { x: 220, z: 210, w: 24, l: 26, h: 48, name: "Harbor View" },
      { x: 110, z: 110, w: 18, l: 18, h: 35, name: "Residential 1" },
      { x: 190, z: 110, w: 18, l: 18, h: 35, name: "Residential 2" },
      { x: 110, z: 190, w: 18, l: 18, h: 35, name: "Residential 3" },
      { x: 190, z: 190, w: 18, l: 18, h: 35, name: "Residential 4" },
    ];

    buildings.forEach((b, idx) => {
      const bMat = new THREE.MeshStandardMaterial({
        color: bldgColors[idx % bldgColors.length],
        roughness: 0.4,
        metalness: 0.6,
      });
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.l), bMat);
      bMesh.position.set(b.x, b.h / 2 + 0.5, b.z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      this.group.add(bMesh);

      // Glass window bands on facade
      const winBands = Math.floor(b.h / 5);
      for (let w = 1; w < winBands; w++) {
        const band = new THREE.Mesh(
          new THREE.BoxGeometry(b.w + 0.4, 1.6, b.l + 0.4),
          glassMat
        );
        band.position.set(b.x, w * 5 + 0.5, b.z);
        this.group.add(band);
      }

      // Rooftop Helipad on tall towers
      if (b.h >= 60) {
        const roofH = new THREE.Mesh(
          new THREE.CylinderGeometry(6, 6, 0.4, 16),
          new THREE.MeshStandardMaterial({ color: 0x111827 })
        );
        roofH.position.set(b.x, b.h + 0.7, b.z);
        this.group.add(roofH);

        const hRing = new THREE.Mesh(
          new THREE.RingGeometry(4.8, 5.4, 24),
          new THREE.MeshBasicMaterial({ color: 0xff5500 })
        );
        hRing.rotation.x = -Math.PI / 2;
        hRing.position.set(b.x, b.h + 0.91, b.z);
        this.group.add(hRing);
      }
    });
  }

  private buildCommunicationsTower() {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.8, roughness: 0.3 });
    const towerGroup = new THREE.Group();

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 4, 12, 8), steelMat);
    base.position.y = 6;
    base.castShadow = true;
    towerGroup.add(base);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2, 32, 6), steelMat);
    mast.position.y = 28;
    mast.castShadow = true;
    towerGroup.add(mast);

    this.radarDish = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 1.5, 1, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    );
    this.radarDish.rotation.x = -Math.PI / 2;
    this.radarDish.position.set(0, 36, 1.5);
    towerGroup.add(this.radarDish);

    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.5, 12, 4), steelMat);
    spire.position.y = 50;
    towerGroup.add(spire);

    this.commsStrobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    this.commsStrobe.position.y = 56.5;
    towerGroup.add(this.commsStrobe);

    towerGroup.position.set(150, 0.5, 150);
    this.group.add(towerGroup);
  }

  public update(dt: number, elapsed: number) {
    if (this.radarDish) {
      this.radarDish.rotation.z = elapsed * 1.5;
    }
    if (this.commsStrobe) {
      this.commsStrobe.visible = Math.sin(elapsed * 12) > 0.6;
    }
  }
}
