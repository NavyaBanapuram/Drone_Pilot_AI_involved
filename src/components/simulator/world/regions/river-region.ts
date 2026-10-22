// ==========================================================
// DRONE PILOT — REGION 4: VALLEY RIVER & CANYON (PHASE 1)
// River Overlook Pad, Canyon Observation Platform & Bridge Abutment
// ==========================================================

import * as THREE from "three";
import { HELIPADS } from "@/lib/world/helipad-definitions";
import { createHelipadMesh } from "../helipad-mesh";

export class RiverRegion {
  public group = new THREE.Group();

  constructor() {
    // 1. Valley Observation Helipad at (-85, 10.0, 195)
    const pad = createHelipadMesh(HELIPADS["river-alpha"]);
    this.group.add(pad);

    // 2. Canyon Observation Deck beside the pad
    this.buildObservationPlatform();
  }

  private buildObservationPlatform() {
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 16), deckMat);
    platform.position.set(-85, 9.6, 195);
    platform.castShadow = true;
    platform.receiveShadow = true;
    this.group.add(platform);

    // Safety perimeter railing
    const railMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6 });
    const sides = [
      { x: 0, z: -8, rot: 0 },
      { x: 0, z: 8, rot: 0 },
      { x: -8, z: 0, rot: Math.PI / 2 },
    ];
    sides.forEach((s) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(16, 0.08, 0.08), railMat);
      rail.position.set(-85 + s.x, 10.0 + 1.0, 195 + s.z);
      rail.rotation.y = s.rot;
      this.group.add(rail);
    });
  }

  public update(_dt: number, _elapsed: number) {
    // Ready for future river stream animations
  }
}
