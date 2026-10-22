// ==========================================================
// DRONE PILOT — REGION C: MOUNTAIN MASSIF (MOUNT APEX)
// Craggy Peaks, Ridgelines, Valleys, Snow Caps & Summit Beacon
// ==========================================================

import * as THREE from "three";

export class MountainRegion {
  public group = new THREE.Group();
  private summitStrobe!: THREE.Mesh;

  constructor() {
    this.buildMountainMassif();
  }

  private buildMountainMassif() {
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.92,
      flatShading: true,
    });

    const snowPeakMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.80,
      flatShading: true,
    });

    // 8 Majestic peaks forming an epic ridgeline in North-West quadrant
    const peaks = [
      { x: -180, z: -170, radius: 68, height: 62 }, // Mount Apex Summit
      { x: -130, z: -195, radius: 56, height: 54 },
      { x: -225, z: -135, radius: 58, height: 50 },
      { x: -95, z: -145, radius: 48, height: 42 },
      { x: -160, z: -105, radius: 42, height: 36 },
      { x: -75, z: -185, radius: 40, height: 32 },
      { x: -245, z: -75, radius: 52, height: 46 },
      { x: -110, z: -90, radius: 36, height: 28 },
    ];

    peaks.forEach((peak) => {
      // Main Craggy Mountain Peak
      const bodyGeo = new THREE.ConeGeometry(peak.radius, peak.height, 9);
      const bodyMesh = new THREE.Mesh(bodyGeo, mountainMat);
      bodyMesh.position.set(peak.x, peak.height / 2 + 0.30, peak.z);
      bodyMesh.rotation.y = Math.random() * Math.PI;
      bodyMesh.receiveShadow = true;
      bodyMesh.castShadow = true;
      this.group.add(bodyMesh);

      // Snow Cap on High Peaks (> 35m)
      if (peak.height > 35) {
        const capHeight = peak.height * 0.34;
        const capGeo = new THREE.ConeGeometry(peak.radius * 0.34, capHeight, 9);
        const capMesh = new THREE.Mesh(capGeo, snowPeakMat);
        capMesh.position.set(peak.x, peak.height - capHeight / 2 + 0.30, peak.z);
        capMesh.rotation.y = bodyMesh.rotation.y;
        this.group.add(capMesh);
      }
    });

    // Mount Apex Summit Radio Mast & Warning Strobe (Total elev: ~69.5m)
    const summitMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.25, 7.5, 6),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 })
    );
    summitMast.position.set(-180, 65.5, -170);
    this.group.add(summitMast);

    this.summitStrobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    this.summitStrobe.position.set(-180, 69.5, -170);
    this.group.add(this.summitStrobe);
  }

  public update(_dt: number, elapsed: number) {
    if (this.summitStrobe) {
      this.summitStrobe.visible = Math.floor(elapsed * 2) % 2 === 0;
    }
  }
}
