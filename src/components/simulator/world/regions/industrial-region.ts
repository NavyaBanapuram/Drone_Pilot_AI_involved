// ==========================================================
// DRONE PILOT — REGION 6: SCENIC COASTAL COVE & LIGHTHOUSE LOOKOUT
// Replaces previous industrial slab with natural coastal boardwalk,
// maritime stone terraces, lighthouse, and scenic helipad
// ==========================================================

import * as THREE from "three";
import { HELIPADS } from "@/lib/world/helipad-definitions";
import { createHelipadMesh } from "../helipad-mesh";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";

export class IndustrialRegion {
  public group = new THREE.Group();

  constructor() {
    // 1. Scenic Landing Platform (elevated wooden deck pad matching terrain)
    const pad = createHelipadMesh(HELIPADS["industrial-alpha"]);
    this.group.add(pad);

    // 2. Coastal Lookout Architecture (Lighthouse, Wooden Boardwalk, Stone Terraces)
    this.buildCoastalLighthouse();
    this.buildScenicBoardwalk();
    this.buildStoneLookoutTerrace();
  }

  /**
   * Classic coastal lighthouse overlooking the harbor bay
   */
  private buildCoastalLighthouse() {
    const lx = 370;
    const lz = 820;
    const elev = evaluateIslandElevation(lx, lz).elevation;

    const lhGroup = new THREE.Group();
    lhGroup.position.set(lx, elev, lz);

    // Octagonal Stone Foundation
    const baseGeo = new THREE.CylinderGeometry(8, 9, 3.5, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 1.75;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    lhGroup.add(baseMesh);

    // Tapered White & Red Lighthouse Tower
    const towerMatWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const towerMatRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });

    const bandHeights = [4, 4, 4, 4, 4];
    let curY = 3.5;
    let bottomR = 6.2;

    for (let i = 0; i < 5; i++) {
      const topR = bottomR - 0.5;
      const geo = new THREE.CylinderGeometry(topR, bottomR, bandHeights[i], 16);
      const mat = i % 2 === 0 ? towerMatWhite : towerMatRed;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = curY + bandHeights[i] / 2;
      mesh.castShadow = true;
      lhGroup.add(mesh);

      curY += bandHeights[i];
      bottomR = topR;
    }

    // Gallery Deck & Railing
    const deckGeo = new THREE.CylinderGeometry(5.2, 5.2, 0.6, 16);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = curY + 0.3;
    lhGroup.add(deck);

    // Lantern Room (Glass Chamber + Light Core)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.9,
    });
    const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 3.2, 12), glassMat);
    lanternGlass.position.y = curY + 2.2;
    lhGroup.add(lanternGlass);

    // Bright Lantern Core
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), coreMat);
    core.position.y = curY + 2.2;
    lhGroup.add(core);

    // Conical Copper Roof
    const roofGeo = new THREE.ConeGeometry(4.2, 3.0, 16);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x164e2a, roughness: 0.5, metalness: 0.4 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = curY + 3.8 + 1.5;
    lhGroup.add(roof);

    this.group.add(lhGroup);
  }

  /**
   * Scenic wooden boardwalk overlooking the waters of the cove
   */
  private buildScenicBoardwalk() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.85 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });

    // Boardwalk pier walkway
    const pierLength = 65;
    const pierWidth = 5.5;
    const pierGeo = new THREE.BoxGeometry(pierWidth, 0.4, pierLength);
    const pier = new THREE.Mesh(pierGeo, woodMat);
    pier.position.set(400, 1.6, 855);
    pier.castShadow = true;
    pier.receiveShadow = true;
    this.group.add(pier);

    // Support pilings along pier
    for (let z = -pierLength / 2 + 3; z <= pierLength / 2 - 3; z += 6) {
      [-pierWidth / 2 + 0.3, pierWidth / 2 - 0.3].forEach((xOff) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 4.5, 6), postMat);
        post.position.set(400 + xOff, 0.5, 855 + z);
        this.group.add(post);
      });
    }

    // Safety wood railings
    [-pierWidth / 2 + 0.15, pierWidth / 2 - 0.15].forEach((xOff) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, pierLength), woodMat);
      rail.position.set(400 + xOff, 2.6, 855);
      this.group.add(rail);

      for (let z = -pierLength / 2 + 2; z <= pierLength / 2 - 2; z += 4) {
        const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 4), woodMat);
        baluster.position.set(400 + xOff, 2.15, 855 + z);
        this.group.add(baluster);
      }
    });

    // Harbor channel navigation light at pier tip
    const lightHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    lightHead.position.set(400, 3.2, 855 + pierLength / 2 - 1);
    this.group.add(lightHead);
  }

  /**
   * Natural stone terrace with park benches overlooking the bay
   */
  private buildStoneLookoutTerrace() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
    const woodBenchMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

    // Semi-circular stone retaining terrace wall
    const wallSegments = 10;
    const radius = 18;
    for (let i = 0; i <= wallSegments; i++) {
      const angle = Math.PI * 0.8 + (i / wallSegments) * Math.PI * 0.9;
      const wx = 380 + Math.cos(angle) * radius;
      const wz = 770 + Math.sin(angle) * radius;
      const welev = evaluateIslandElevation(wx, wz).elevation;

      const block = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.8, 1.2), stoneMat);
      block.position.set(wx, welev + 0.4, wz);
      block.rotation.y = -angle + Math.PI / 2;
      block.castShadow = true;
      this.group.add(block);
    }

    // Scenic resting benches
    [
      { x: 375, z: 780, rot: 0.4 },
      { x: 388, z: 782, rot: -0.3 },
    ].forEach((b) => {
      const belev = evaluateIslandElevation(b.x, b.z).elevation;
      const benchGroup = new THREE.Group();
      benchGroup.position.set(b.x, belev, b.z);
      benchGroup.rotation.y = b.rot;

      // Bench seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.7), woodBenchMat);
      seat.position.y = 0.55;
      benchGroup.add(seat);

      // Bench back
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 0.1), woodBenchMat);
      back.position.set(0, 0.85, -0.3);
      benchGroup.add(back);

      // Stone legs
      [-0.9, 0.9].forEach((legX) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.6), stoneMat);
        leg.position.set(legX, 0.275, 0);
        benchGroup.add(leg);
      });

      this.group.add(benchGroup);
    });
  }

  public update(_dt: number, _elapsed: number) {
    // Dynamic lighthouse beam rotation or maritime visuals
  }
}
