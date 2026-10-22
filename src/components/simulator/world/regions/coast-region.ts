// ==========================================================
// DRONE PILOT — REGION 7: PELICAN COVE & COASTAL BLUFFS (PHASE 1)
// Marine Rescue Pad, Boardwalk Pier, Channel Buoy & Sea Stack
// ==========================================================

import * as THREE from "three";
import { HELIPADS } from "@/lib/world/helipad-definitions";
import { createHelipadMesh } from "../helipad-mesh";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";

export class CoastRegion {
  public group = new THREE.Group();

  constructor() {
    // 1. Marine Rescue Helipad at (-720, 2.0, 560)
    const pad = createHelipadMesh(HELIPADS["coast-alpha"]);
    this.group.add(pad);

    // 2. Wooden Boardwalk Pier extending into the cove
    this.buildMarinaPier();

    // 3. Marine Channel Buoy with flashing navigation LED
    this.buildNavigationBuoy();

    // 4. Granite Sea Stack Rock Formation
    this.buildSeaStack();

    // 5. Beach Enhancements (Palms, Umbrellas, Towels, Tiki Bar, Boulders)
    this.buildBeachEnhancements();
  }

  private buildMarinaPier() {
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 48), pierMat);
    deck.position.set(-750, 0.8, 590);
    deck.rotation.y = 0.4;
    deck.castShadow = true;
    this.group.add(deck);

    // Pilings
    for (let i = -20; i <= 20; i += 10) {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.8, 8), pierMat);
      piling.position.set(-750 + Math.sin(0.4) * i, 0, 590 + Math.cos(0.4) * i);
      this.group.add(piling);
    }
  }

  private buildNavigationBuoy() {
    const buoyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const buoy = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 1.6, 12), buoyMat);
    buoy.position.set(-800, 0.8, 620);
    this.group.add(buoy);

    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    light.position.set(-800, 1.8, 620);
    this.group.add(light);
  }

  /**
   * Granite Sea Stack offshore rock landmark in crashing surf
   */
  private buildSeaStack() {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
      metalness: 0.1,
    });
    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 12, 22, 7),
      rockMat
    );
    stack.position.set(-840, 10, 650);
    stack.rotation.y = 0.5;
    stack.castShadow = true;
    this.group.add(stack);
  }

  private buildBeachEnhancements() {
    const beachGroup = new THREE.Group();
    
    // 1. Coconut Palm Trees
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 12, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 });
    const frondGeo = new THREE.PlaneGeometry(2, 6);
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, side: THREE.DoubleSide, roughness: 0.8 });
    
    const treePositions = [
      { x: -710, z: 510 }, { x: -725, z: 530 }, { x: -715, z: 560 },
      { x: -730, z: 580 }, { x: -718, z: 610 }, { x: -735, z: 630 },
      { x: -720, z: 645 }, { x: -740, z: 600 }
    ];
    
    treePositions.forEach(pos => {
      const elevation = evaluateIslandElevation(pos.x, pos.z).elevation;
      if (elevation >= 0.5 && elevation <= 3.0) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 6;
        tree.add(trunk);
        
        for (let i = 0; i < 5; i++) {
          const frond = new THREE.Mesh(frondGeo, frondMat);
          frond.position.y = 12;
          frond.rotation.x = Math.PI / 4;
          frond.rotation.y = (Math.PI * 2 / 5) * i;
          frond.position.x = Math.sin(frond.rotation.y) * 1.5;
          frond.position.z = Math.cos(frond.rotation.y) * 1.5;
          tree.add(frond);
        }
        
        tree.position.set(pos.x, elevation, pos.z);
        tree.rotation.z = (Math.random() - 0.5) * 0.2;
        tree.rotation.x = (Math.random() - 0.5) * 0.2;
        beachGroup.add(tree);
      }
    });

    // 2. Beach Umbrellas & Towels
    const umbrellaGeo = new THREE.ConeGeometry(2, 1.5, 8);
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 3);
    const towelGeo = new THREE.PlaneGeometry(1, 2);
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    
    const leisurePositions = [
      { x: -715, z: 520 }, { x: -725, z: 550 }, { x: -720, z: 590 }, { x: -730, z: 620 }
    ];
    
    leisurePositions.forEach((pos, i) => {
      const elevation = evaluateIslandElevation(pos.x, pos.z).elevation;
      const uColor = colors[i % colors.length];
      
      const umbrella = new THREE.Group();
      const top = new THREE.Mesh(umbrellaGeo, new THREE.MeshStandardMaterial({ color: uColor }));
      top.position.y = 3;
      const pole = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
      pole.position.y = 1.5;
      umbrella.add(top);
      umbrella.add(pole);
      umbrella.position.set(pos.x, elevation, pos.z);
      umbrella.rotation.z = 0.1;
      beachGroup.add(umbrella);
      
      const towel = new THREE.Mesh(towelGeo, new THREE.MeshStandardMaterial({ color: colors[(i+1)%colors.length] }));
      towel.rotation.x = -Math.PI / 2;
      towel.position.set(pos.x + 1.5, elevation + 0.05, pos.z);
      towel.rotation.z = Math.random();
      beachGroup.add(towel);
    });
    
    // 3. Tiki Bar
    const hutPos = { x: -705, z: 570 };
    const hutElev = evaluateIslandElevation(hutPos.x, hutPos.z).elevation;
    const hut = new THREE.Group();
    const hutBase = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2.5, 3),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    hutBase.position.y = 1.25;
    const hutRoof = new THREE.Mesh(
      new THREE.ConeGeometry(3.5, 2, 4),
      new THREE.MeshStandardMaterial({ color: 0xcd853f })
    );
    hutRoof.position.y = 3.5;
    hutRoof.rotation.y = Math.PI / 4;
    hut.add(hutBase);
    hut.add(hutRoof);
    hut.position.set(hutPos.x, hutElev, hutPos.z);
    beachGroup.add(hut);

    // 4. Shoreline Boulders
    const boulderGeo = new THREE.DodecahedronGeometry(1.5, 1);
    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x7c858e, // Natural coastal granite
      roughness: 0.90,
      metalness: 0.03,
      flatShading: true,
    });
    const boulderPos = [
      { x: -735, z: 540 }, { x: -745, z: 575 }, { x: -740, z: 610 }
    ];
    boulderPos.forEach(pos => {
      const elevation = evaluateIslandElevation(pos.x, pos.z).elevation;
      const b = new THREE.Mesh(boulderGeo, boulderMat);
      b.position.set(pos.x, elevation, pos.z);
      b.scale.set(1 + Math.random(), 0.8 + Math.random()*0.4, 1 + Math.random());
      beachGroup.add(b);
    });
    
    this.group.add(beachGroup);
  }

  public update(_dt: number, _elapsed: number) {
    // Ready for future maritime wave animations
  }
}
