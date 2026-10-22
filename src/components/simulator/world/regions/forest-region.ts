// ==========================================================
// DRONE PILOT — REGION 2: WHISPERING PINES FOREST (PHASE 1)
// Ranger Outpost, Watchtower, Timber Helipad & Western Woodland
// ==========================================================

import * as THREE from "three";
import { HELIPADS } from "@/lib/world/helipad-definitions";
import { createHelipadMesh } from "../helipad-mesh";

export class ForestRegion {
  public group = new THREE.Group();

  constructor() {
    // 1. Forest Ranger Helipad at (-620, 5.5, -40)
    const pad = createHelipadMesh(HELIPADS["forest-alpha"]);
    this.group.add(pad);

    // 2. Ranger Station Watchtower & Log Cabin
    this.buildRangerStation();

    // 3. Perimeter Timber Fence
    this.buildTimberPerimeter();
  }

  /**
   * Ranger station cabin and elevated fire lookout watchtower
   */
  private buildRangerStation() {
    const stationGroup = new THREE.Group();
    stationGroup.position.set(-635, 5.5, -25);

    // Rustic wood cabin base
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x223322, roughness: 0.8 });

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 6), cabinMat);
    cabin.position.set(0, 2.25, 0);
    cabin.castShadow = true;
    stationGroup.add(cabin);

    // Pitched roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.5, 4), roofMat);
    roof.position.set(0, 5.75, 0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    stationGroup.add(roof);

    // Fire Lookout Watchtower (18m elevated wooden observation deck)
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-595, 5.5, -60);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
    const legGeo = new THREE.CylinderGeometry(0.22, 0.28, 18, 6);

    const offsets = [
      { x: -2.5, z: -2.5 },
      { x: 2.5, z: -2.5 },
      { x: -2.5, z: 2.5 },
      { x: 2.5, z: 2.5 },
    ];
    offsets.forEach((o) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(o.x, 9, o.z);
      leg.castShadow = true;
      towerGroup.add(leg);
    });

    // Lookout Cabin atop tower
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x5a3e22, roughness: 0.8 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(7, 3.8, 7), deckMat);
    deck.position.set(0, 18 + 1.9, 0);
    deck.castShadow = true;
    towerGroup.add(deck);

    // Observation windows band
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.7,
    });
    const windows = new THREE.Mesh(new THREE.BoxGeometry(7.1, 1.4, 7.1), glassMat);
    windows.position.set(0, 18 + 2.2, 0);
    towerGroup.add(windows);

    this.group.add(stationGroup);
    this.group.add(towerGroup);
  }

  /**
   * Log fence defining the ranger compound
   */
  private buildTimberPerimeter() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
    const postGeo = new THREE.CylinderGeometry(0.18, 0.22, 2.4, 6);

    const corners = [
      { x: -650, z: -10 },
      { x: -590, z: -10 },
      { x: -590, z: -70 },
      { x: -650, z: -70 },
    ];

    corners.forEach((c) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(c.x, 5.5 + 1.2, c.z);
      post.castShadow = true;
      this.group.add(post);
    });
  }

  public update(_dt: number, _elapsed: number) {
    // Ambience update hook
  }
}
