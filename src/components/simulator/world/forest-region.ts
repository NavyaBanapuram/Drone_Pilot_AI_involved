// ==========================================================
// DRONE PILOT — REGION B: ALPINE & BROADLEAF FOREST
// Instanced Multi-Species Trees, Shrubs, Boulders & Slalom Course
// ==========================================================

import * as THREE from "three";

export class ForestRegion {
  public group = new THREE.Group();

  constructor() {
    this.buildConiferPines();
    this.buildBroadleafTrees();
    this.buildForestUnderstory();
    this.buildGraniteBoulders();
  }

  // 1. CONIFER PINES (160 Instanced Conifers in NE Sector)
  private buildConiferPines() {
    const pineCount = 160;
    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.42, 3.2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, pineCount);

    const foliageGeo = new THREE.ConeGeometry(2.6, 7.0, 7);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1a361a, roughness: 0.85 });
    const foliageInst = new THREE.InstancedMesh(foliageGeo, foliageMat, pineCount);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < pineCount; i++) {
      const radius = 55 + Math.random() * 210;
      const angle = -0.15 - Math.random() * 1.35; // North-East sector
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 0.75 + Math.random() * 0.8;

      // Trunk
      dummy.position.set(x, (3.2 * scale) / 2 + 0.30, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      // Foliage Cone
      dummy.position.set(x, (3.2 * scale) + (7.0 * scale) / 2 - 0.6 + 0.30, z);
      dummy.updateMatrix();
      foliageInst.setMatrixAt(i, dummy.matrix);
    }

    trunkInst.receiveShadow = true;
    trunkInst.castShadow = true;
    foliageInst.receiveShadow = true;
    foliageInst.castShadow = true;

    this.group.add(trunkInst);
    this.group.add(foliageInst);
  }

  // 2. BROADLEAF DECIDUOUS TREES (70 Instanced Broadleaf Trees)
  private buildBroadleafTrees() {
    const treeCount = 70;
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 3.6, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x473322, roughness: 0.88 });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);

    const crownGeo = new THREE.DodecahedronGeometry(3.2, 1);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x2d5e23, roughness: 0.8 });
    const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < treeCount; i++) {
      // Clustered near riverbanks and forest clearings
      const radius = 65 + Math.random() * 180;
      const angle = -0.05 - Math.random() * 1.45;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 0.7 + Math.random() * 0.7;

      dummy.position.set(x, (3.6 * scale) / 2 + 0.30, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, (3.6 * scale) + (3.2 * scale) * 0.7 + 0.30, z);
      dummy.updateMatrix();
      crownInst.setMatrixAt(i, dummy.matrix);
    }

    trunkInst.receiveShadow = true;
    trunkInst.castShadow = true;
    crownInst.receiveShadow = true;
    crownInst.castShadow = true;

    this.group.add(trunkInst);
    this.group.add(crownInst);
  }

  // 3. FOREST UNDERSTORY SHRUBS (90 Instanced Shrubs)
  private buildForestUnderstory() {
    const shrubCount = 90;
    const shrubGeo = new THREE.DodecahedronGeometry(1.2, 1);
    const shrubMat = new THREE.MeshStandardMaterial({ color: 0x3f6b33, roughness: 0.85 });
    const shrubInst = new THREE.InstancedMesh(shrubGeo, shrubMat, shrubCount);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < shrubCount; i++) {
      const radius = 45 + Math.random() * 220;
      const angle = -0.05 - Math.random() * 1.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 0.6 + Math.random() * 0.8;

      dummy.position.set(x, (1.2 * scale) / 2 + 0.30, z);
      dummy.scale.set(scale, scale * 0.75, scale);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.updateMatrix();
      shrubInst.setMatrixAt(i, dummy.matrix);
    }

    shrubInst.receiveShadow = true;
    shrubInst.castShadow = true;
    this.group.add(shrubInst);
  }

  // 4. GRANITE BOULDERS (60 Instanced Boulders)
  private buildGraniteBoulders() {
    const rockCount = 60;
    const rockGeo = new THREE.DodecahedronGeometry(1.8, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.95, flatShading: true });
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < rockCount; i++) {
      const radius = 50 + Math.random() * 210;
      const angle = -0.1 - Math.random() * 1.4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scaleX = 0.8 + Math.random() * 1.6;
      const scaleY = 0.5 + Math.random() * 1.0;
      const scaleZ = 0.8 + Math.random() * 1.6;

      dummy.position.set(x, scaleY * 1.2 + 0.30, z);
      dummy.scale.set(scaleX, scaleY, scaleZ);
      dummy.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
      dummy.updateMatrix();
      rockInst.setMatrixAt(i, dummy.matrix);
    }

    rockInst.receiveShadow = true;
    rockInst.castShadow = true;
    this.group.add(rockInst);
  }
}
