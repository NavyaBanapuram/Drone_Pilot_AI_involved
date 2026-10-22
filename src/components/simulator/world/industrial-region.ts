// ==========================================================
// DRONE PILOT — REGION E: INDUSTRIAL & LOGISTICS DISTRICT
// Hangars, Storage Silos, Intermodal Containers, Utility Pipes
// ==========================================================

import * as THREE from "three";

export class IndustrialRegion {
  public group = new THREE.Group();

  constructor() {
    this.buildHangars();
    this.buildStorageSilos();
    this.buildShippingContainers();
    this.buildIndustrialPiping();
  }

  // 1. INDUSTRIAL HANGARS
  private buildHangars() {
    const hangarMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 });
    const hangars = [
      { x: 55, z: 125, w: 22, l: 36, h: 9 },
      { x: 55, z: 170, w: 22, l: 36, h: 9 },
    ];
    hangars.forEach((h) => {
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(h.w, h.h, h.l), hangarMat);
      bldg.position.set(h.x, h.h / 2 + 0.30, h.z);
      bldg.castShadow = true;
      bldg.receiveShadow = true;
      this.group.add(bldg);

      // Curved corrugated barrel roof
      const roof = new THREE.Mesh(
        new THREE.CylinderGeometry(h.w * 0.52, h.w * 0.52, h.l, 12, 1, false, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 })
      );
      roof.rotation.z = Math.PI / 2;
      roof.rotation.x = Math.PI / 2;
      roof.position.set(h.x, h.h + 0.30, h.z);
      roof.castShadow = true;
      this.group.add(roof);
    });
  }

  // 2. FUEL & GRAIN STORAGE SILOS
  private buildStorageSilos() {
    const siloMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.3 });
    const silos = [
      { x: 58, z: 48 },
      { x: 72, z: 48 },
      { x: 58, z: 62 },
      { x: 72, z: 62 },
    ];

    silos.forEach((s) => {
      const silo = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 14, 16), siloMat);
      silo.position.set(s.x, 7 + 0.30, s.z);
      silo.castShadow = true;
      silo.receiveShadow = true;
      this.group.add(silo);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(4.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        siloMat
      );
      dome.position.set(s.x, 14 + 0.30, s.z);
      this.group.add(dome);
    });
  }

  // 3. STACKED INTERMODAL SHIPPING CONTAINERS
  private buildShippingContainers() {
    const colors = [0x0284c7, 0xe11d48, 0x16a34a, 0xd97706, 0x4f46e5];
    const stacks = [
      // Stack 1
      { x: 42, y: 1.6, z: 95, rot: 0.1, c: colors[0] },
      { x: 42, y: 4.2, z: 95, rot: 0.1, c: colors[1] },
      { x: 45, y: 1.6, z: 95, rot: 0.1, c: colors[2] },
      // Stack 2
      { x: 40, y: 1.6, z: 105, rot: -0.2, c: colors[3] },
      { x: 40, y: 4.2, z: 105, rot: -0.2, c: colors[0] },
      // Stack 3
      { x: 44, y: 1.6, z: 115, rot: 0.05, c: colors[4] },
    ];

    stacks.forEach((s) => {
      const mat = new THREE.MeshStandardMaterial({ color: s.c, roughness: 0.55, metalness: 0.4 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 6.0), mat);
      box.position.set(s.x, s.y + 0.30, s.z);
      box.rotation.y = s.rot;
      box.castShadow = true;
      box.receiveShadow = true;
      this.group.add(box);
    });
  }

  // 4. OVERHEAD INDUSTRIAL UTILITY PIPING
  private buildIndustrialPiping() {
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.35 });
    const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 28, 8), pipeMat);
    pipe1.rotation.x = Math.PI / 2;
    pipe1.position.set(65, 5.5 + 0.30, 55);
    pipe1.castShadow = true;
    this.group.add(pipe1);

    // Support pylons
    [43, 55, 67].forEach((z) => {
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 5.5, 6), pipeMat);
      pylon.position.set(65, 2.75 + 0.30, z);
      pylon.castShadow = true;
      this.group.add(pylon);
    });
  }
}
