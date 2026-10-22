// ==========================================================
// DRONE PILOT — REGION 1: CENTRAL TRAINING ACADEMY
// Foundation: Helipad Alpha & Bravo, Windsock, and Safety Arena
// ==========================================================

import * as THREE from "three";
import { HELIPADS } from "@/lib/world/helipad-definitions";
import { createHelipadMesh } from "../helipad-mesh";

export class TrainingRegion {
  public group = new THREE.Group();
  private animatedElements: Array<(elapsed: number) => void> = [];

  constructor() {
    // 1. Physical Helipads
    const padAlpha = createHelipadMesh(HELIPADS["training-alpha"]);
    this.group.add(padAlpha);

    const padBravo = createHelipadMesh(HELIPADS["training-bravo"]);
    this.group.add(padBravo);

    // 2. Windsock Station beside Helipad Alpha
    this.buildWindsock();

    // 3. Safety Boundary Cones
    this.buildSafetyCones();
  }

  private buildWindsock() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.8, 8), poleMat);
    pole.position.set(16, 1.2 + 2.4, -14);
    this.group.add(pole);

    const sockMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.6 });
    const sock = new THREE.Mesh(new THREE.ConeGeometry(0.38, 2.0, 12), sockMat);
    sock.rotation.z = Math.PI / 2;
    sock.position.set(16.9, 1.2 + 4.6, -14);
    this.group.add(sock);

    this.animatedElements.push((elapsed) => {
      sock.rotation.y = Math.sin(elapsed * 0.8) * 0.28;
    });
  }

  private buildSafetyCones() {
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
    const coneGeo = new THREE.ConeGeometry(0.25, 0.65, 8);
    const positions = [
      { x: -12, z: 12 },
      { x: 12, z: 12 },
      { x: -12, z: -12 },
      { x: 12, z: -12 },
    ];
    positions.forEach((p) => {
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(p.x, 1.2 + 0.325, p.z);
      cone.castShadow = true;
      this.group.add(cone);
    });
  }

  public update(_dt: number, elapsed: number) {
    for (let i = 0; i < this.animatedElements.length; i++) {
      this.animatedElements[i](elapsed);
    }
  }
}
