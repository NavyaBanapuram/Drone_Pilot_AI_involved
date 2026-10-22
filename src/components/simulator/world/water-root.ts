// ==========================================================
// DRONE PILOT — WATER ROOT
// 4000m x 4000m Ocean Expanse with animated surface waves
// ==========================================================

import * as THREE from "three";
import { WORLD_CONFIG } from "@/lib/world/world-config";

export class WaterRoot {
  public group = new THREE.Group();
  private animatedElements: Array<(elapsed: number) => void> = [];

  constructor() {
    this.buildOceanExpanse();
  }

  private buildOceanExpanse() {
    const oceanGeo = new THREE.PlaneGeometry(
      WORLD_CONFIG.worldWidth,
      WORLD_CONFIG.worldLength,
      48,
      48
    );
    oceanGeo.rotateX(-Math.PI / 2);

    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1, // Deep coastal blue
      roughness: 0.12,
      metalness: 0.85,
      transparent: true,
      opacity: 0.92,
    });

    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.position.y = WORLD_CONFIG.seaLevel;
    ocean.receiveShadow = true;
    this.group.add(ocean);

    // Dynamic wave oscillation
    const posAttr = oceanGeo.attributes.position;
    const initialY: number[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      initialY.push(posAttr.getY(i));
    }

    this.animatedElements.push((elapsed) => {
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const z = posAttr.getZ(i);
        posAttr.setY(
          i,
          initialY[i] +
            Math.sin(elapsed * 1.1 + x * 0.02) * 0.22 +
            Math.cos(elapsed * 0.85 + z * 0.02) * 0.16
        );
      }
      posAttr.needsUpdate = true;
    });
  }

  public update(_dt: number, elapsed: number) {
    for (let i = 0; i < this.animatedElements.length; i++) {
      this.animatedElements[i](elapsed);
    }
  }
}
