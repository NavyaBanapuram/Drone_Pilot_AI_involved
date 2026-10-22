// ==========================================================
// DRONE PILOT — CITY PARK (PHASE 3)
// Landscaped green space with lawns, paths, benches,
// playground, ornamental trees, and decorative pond
// ==========================================================

import * as THREE from "three";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";

export class CityPark {
  public group = new THREE.Group();

  private grassMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80, roughness: 0.9, metalness: 0.02,
  });
  private pathMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3d1, roughness: 0.8, metalness: 0.05,
  });
  private woodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f, roughness: 0.8, metalness: 0.1,
  });
  private metalMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, roughness: 0.4, metalness: 0.6,
  });

  public build(cx: number, cz: number, halfW: number, halfD: number) {
    const yBase = evaluateIslandElevation(cx, cz).elevation;

    // Main lawn
    const lawnGeo = new THREE.PlaneGeometry(halfW * 2, halfD * 2, 1, 1);
    lawnGeo.rotateX(-Math.PI / 2);
    const lawn = new THREE.Mesh(lawnGeo, this.grassMat);
    lawn.position.set(cx, yBase, cz);
    lawn.receiveShadow = true;
    this.group.add(lawn);

    // Walking paths (cross pattern)
    this.buildPath(cx - halfW, cz, cx + halfW, cz, yBase); // E-W path
    this.buildPath(cx, cz - halfD, cx, cz + halfD, yBase); // N-S path
    // Diagonal paths
    this.buildPath(cx - halfW * 0.7, cz - halfD * 0.7, cx + halfW * 0.7, cz + halfD * 0.7, yBase);
    this.buildPath(cx - halfW * 0.7, cz + halfD * 0.7, cx + halfW * 0.7, cz - halfD * 0.7, yBase);

    // Ornamental trees (cherry blossom style — different from forest trees)
    this.buildOrnamentalTrees(cx, cz, halfW, halfD, yBase);

    // Park benches along paths
    this.buildParkBenches(cx, cz, halfW, halfD, yBase);

    // Small decorative pond / fountain
    this.buildFountain(cx, cz, yBase);

    // Playground area
    this.buildPlayground(cx + halfW * 0.5, cz - halfD * 0.4, yBase);

    // Flower beds
    this.buildFlowerBeds(cx, cz, halfW, halfD, yBase);
  }

  private buildPath(x1: number, z1: number, x2: number, z2: number, y: number) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    const pathGeo = new THREE.PlaneGeometry(3.0, len);
    pathGeo.rotateX(-Math.PI / 2);
    const path = new THREE.Mesh(pathGeo, this.pathMat);
    path.position.set((x1 + x2) / 2, y + 0.02, (z1 + z2) / 2);
    path.rotation.y = angle;
    path.receiveShadow = true;
    this.group.add(path);
  }

  private buildOrnamentalTrees(cx: number, cz: number, halfW: number, halfD: number, y: number) {
    const treePositions = [
      { x: cx - halfW * 0.6, z: cz - halfD * 0.5 },
      { x: cx + halfW * 0.6, z: cz - halfD * 0.5 },
      { x: cx - halfW * 0.6, z: cz + halfD * 0.5 },
      { x: cx + halfW * 0.6, z: cz + halfD * 0.5 },
      { x: cx - halfW * 0.3, z: cz - halfD * 0.2 },
      { x: cx + halfW * 0.3, z: cz + halfD * 0.2 },
      { x: cx, z: cz - halfD * 0.6 },
      { x: cx, z: cz + halfD * 0.6 },
      { x: cx - halfW * 0.8, z: cz },
      { x: cx + halfW * 0.8, z: cz },
    ];

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033, roughness: 0.9, metalness: 0.05,
    });
    const foliageColors = [0x22c55e, 0x16a34a, 0x15803d, 0xfbbf24, 0xf97316, 0xef4444];

    treePositions.forEach((pos, i) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.35, 4.5, 6),
        trunkMat
      );
      trunk.position.set(pos.x, y + 2.25, pos.z);
      trunk.castShadow = true;
      this.group.add(trunk);

      // Round canopy (ornamental shape)
      const foliageMat = new THREE.MeshStandardMaterial({
        color: foliageColors[i % foliageColors.length],
        roughness: 0.85,
        metalness: 0.02,
      });
      const canopy = new THREE.Mesh(
        new THREE.DodecahedronGeometry(3.2, 1),
        foliageMat
      );
      canopy.position.set(pos.x, y + 5.8, pos.z);
      canopy.scale.set(1, 0.75, 1);
      canopy.castShadow = true;
      this.group.add(canopy);
    });
  }

  private buildParkBenches(cx: number, cz: number, halfW: number, halfD: number, y: number) {
    const benchPositions = [
      { x: cx + 4, z: cz - 2, rot: 0 },
      { x: cx - 4, z: cz + 2, rot: Math.PI },
      { x: cx + halfW * 0.4, z: cz, rot: Math.PI / 2 },
      { x: cx - halfW * 0.4, z: cz, rot: -Math.PI / 2 },
      { x: cx, z: cz + halfD * 0.6, rot: 0 },
      { x: cx, z: cz - halfD * 0.6, rot: Math.PI },
    ];

    benchPositions.forEach(bp => {
      const benchGroup = new THREE.Group();
      benchGroup.position.set(bp.x, y, bp.z);
      benchGroup.rotation.y = bp.rot;

      // Seat
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.1, 0.5),
        this.woodMat
      );
      seat.position.y = 0.45;
      benchGroup.add(seat);

      // Backrest
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.5, 0.06),
        this.woodMat
      );
      back.position.set(0, 0.7, -0.22);
      benchGroup.add(back);

      // Legs
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 4);
      [-0.7, 0.7].forEach(lx => {
        const leg = new THREE.Mesh(legGeo, this.metalMat);
        leg.position.set(lx, 0.225, 0);
        benchGroup.add(leg);
      });

      this.group.add(benchGroup);
    });
  }

  private buildFountain(cx: number, cz: number, y: number) {
    // Circular water pool
    const poolMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.05,
      metalness: 0.85,
      transparent: true,
      opacity: 0.7,
    });
    const poolGeo = new THREE.CylinderGeometry(4, 4.5, 0.5, 24);
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(cx, y + 0.25, cz);
    pool.receiveShadow = true;
    this.group.add(pool);

    // Stone rim
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xa8a29e, roughness: 0.7, metalness: 0.2,
    });
    const rimGeo = new THREE.TorusGeometry(4.2, 0.35, 8, 24);
    rimGeo.rotateX(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(cx, y + 0.5, cz);
    this.group.add(rim);

    // Central pedestal + jet
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.6, 1.5, 8),
      rimMat
    );
    pedestal.position.set(cx, y + 0.75, cz);
    this.group.add(pedestal);

    // Water spout (emissive blue cone simulating spray)
    const spoutMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.5,
    });
    const spout = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 3, 8, 1, true),
      spoutMat
    );
    spout.position.set(cx, y + 3, cz);
    this.group.add(spout);
  }

  private buildPlayground(px: number, pz: number, y: number) {
    // Rubber safety surface
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, roughness: 0.95, metalness: 0.0,
    });
    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 10),
      rubberMat
    );
    surface.rotation.x = -Math.PI / 2;
    surface.position.set(px, y + 0.03, pz);
    this.group.add(surface);

    // Swing set
    const swingGroup = new THREE.Group();
    swingGroup.position.set(px - 3, y, pz);

    // Frame (A-frame poles)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5, metalness: 0.4 });
    const barGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.5, 6);

    // Horizontal top bar
    const topBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 5, 6),
      frameMat
    );
    topBar.rotation.z = Math.PI / 2;
    topBar.position.y = 3.5;
    swingGroup.add(topBar);

    // Vertical legs
    [-2.2, 2.2].forEach(sx => {
      const leg = new THREE.Mesh(barGeo, frameMat);
      leg.position.set(sx, 1.75, 0);
      swingGroup.add(leg);
    });

    // Swing seats (2)
    [-0.8, 0.8].forEach(sx => {
      // Chains
      const chainGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.5, 4);
      const chainMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
      [-0.2, 0.2].forEach(cz => {
        const chain = new THREE.Mesh(chainGeo, chainMat);
        chain.position.set(sx, 2.25, cz);
        swingGroup.add(chain);
      });
      // Seat
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.06, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      );
      seat.position.set(sx, 1.0, 0);
      swingGroup.add(seat);
    });
    this.group.add(swingGroup);

    // Slide
    const slideGroup = new THREE.Group();
    slideGroup.position.set(px + 3, y, pz);
    // Ladder
    const ladderMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5, metalness: 0.4 });
    const ladder = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.08, 3.5),
      ladderMat
    );
    ladder.rotation.x = -0.6;
    ladder.position.set(0, 1.4, -1.2);
    slideGroup.add(ladder);

    // Slide surface
    const slideMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, roughness: 0.2, metalness: 0.6,
    });
    const slideChute = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.06, 4.0),
      slideMat
    );
    slideChute.rotation.x = 0.4;
    slideChute.position.set(0, 1.6, 1.5);
    slideGroup.add(slideChute);

    // Platform
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.15, 2.0),
      ladderMat
    );
    platform.position.y = 2.5;
    slideGroup.add(platform);
    this.group.add(slideGroup);
  }

  private buildFlowerBeds(cx: number, cz: number, halfW: number, halfD: number, y: number) {
    const flowerColors = [0xef4444, 0xf97316, 0xfbbf24, 0xa855f7, 0xec4899, 0x3b82f6];
    const bedPositions = [
      { x: cx - halfW * 0.3, z: cz - halfD * 0.3 },
      { x: cx + halfW * 0.3, z: cz - halfD * 0.3 },
      { x: cx - halfW * 0.3, z: cz + halfD * 0.3 },
      { x: cx + halfW * 0.3, z: cz + halfD * 0.3 },
    ];

    bedPositions.forEach((bp, bi) => {
      // Soil bed
      const bedGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.15, 12);
      const bedMat = new THREE.MeshStandardMaterial({
        color: 0x3f2b1c, roughness: 0.95,
      });
      const bed = new THREE.Mesh(bedGeo, bedMat);
      bed.position.set(bp.x, y + 0.08, bp.z);
      this.group.add(bed);

      // Small flower clusters
      for (let f = 0; f < 8; f++) {
        const angle = (f / 8) * Math.PI * 2 + bi;
        const r = 0.8 + Math.sin(f * 2.3) * 0.8;
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 4, 4),
          new THREE.MeshStandardMaterial({
            color: flowerColors[(f + bi) % flowerColors.length],
            roughness: 0.8,
          })
        );
        flower.position.set(
          bp.x + Math.cos(angle) * r,
          y + 0.35,
          bp.z + Math.sin(angle) * r
        );
        this.group.add(flower);
      }
    });
  }
}
