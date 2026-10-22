// ==========================================================
// DRONE PILOT — TERRAIN ROOT (NATURAL IRREGULAR ISLAND)
// Procedural heightfield mesh following multi-harmonic coastline math
// ==========================================================

import * as THREE from "three";
import { getDistanceToCoast, getCoastlineRadius } from "@/lib/world/coastline-math";

export class TerrainRoot {
  public group = new THREE.Group();

  constructor() {
    this.buildIrregularIslandTerrain();
    this.buildSandyCoastline();
  }

  /**
   * Builds the natural irregular island landmass heightfield
   */
  private buildIrregularIslandTerrain() {
    // 2400m x 2400m subdivided terrain grid covering the 2000m island
    const width = 2400;
    const segments = 100;
    const geo = new THREE.PlaneGeometry(width, width, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      const distToCoast = getDistanceToCoast(x, z);

      if (distToCoast < -30) {
        // Deep offshore ocean bed
        pos.setY(i, -2.0);
      } else if (distToCoast < 0) {
        // Intertidal shoreline slope
        const t = (distToCoast + 30) / 30;
        pos.setY(i, -2.0 + t * 2.4); // slopes from -2.0m to 0.4m
      } else {
        // Inland terrain: Base elevation 1.2m
        let elev = 1.2;

        // Mountain massif elevation (North-West quadrant)
        if (x < -180 && z < -180) {
          const mDist = Math.hypot(x - (-480), z - (-450));
          if (mDist < 420) {
            const mWeight = Math.cos((mDist / 420) * (Math.PI / 2));
            elev += mWeight * mWeight * 55.0; // rises up to ~56m
          }
        }

        // Rolling forest hills (North-East quadrant)
        if (x > 180 && z < -150) {
          elev += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 2.5 + 2.0;
        }

        // Central Training plateau: smooth flat ground at Y = 1.2m
        const centerDist = Math.hypot(x, z);
        if (centerDist < 160) {
          elev = 1.2;
        }

        pos.setY(i, elev);
      }
    }

    geo.computeVertexNormals();

    const turfMat = new THREE.MeshStandardMaterial({
      color: 0x476b3f,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    });

    const terrainMesh = new THREE.Mesh(geo, turfMat);
    terrainMesh.receiveShadow = true;
    this.group.add(terrainMesh);
  }

  /**
   * Sandy shoreline perimeter accentuating the natural irregular beach contour
   */
  private buildSandyCoastline() {
    const sampleCount = 140;
    const step = (Math.PI * 2) / sampleCount;

    const beachGeo = new THREE.BufferGeometry();
    const positions: number[] = [];

    for (let i = 0; i < sampleCount; i++) {
      const angle1 = i * step;
      const angle2 = (i + 1) * step;

      const rCoast1 = getCoastlineRadius(angle1);
      const rCoast2 = getCoastlineRadius(angle2);

      const rInner1 = rCoast1 - 45;
      const rInner2 = rCoast2 - 45;

      const xOut1 = Math.cos(angle1) * rCoast1;
      const zOut1 = Math.sin(angle1) * rCoast1;

      const xOut2 = Math.cos(angle2) * rCoast2;
      const zOut2 = Math.sin(angle2) * rCoast2;

      const xIn1 = Math.cos(angle1) * rInner1;
      const zIn1 = Math.sin(angle1) * rInner1;

      const xIn2 = Math.cos(angle2) * rInner2;
      const zIn2 = Math.sin(angle2) * rInner2;

      // Triangle 1
      positions.push(xIn1, 0.95, zIn1);
      positions.push(xOut1, 0.45, zOut1);
      positions.push(xIn2, 0.95, zIn2);

      // Triangle 2
      positions.push(xIn2, 0.95, zIn2);
      positions.push(xOut1, 0.45, zOut1);
      positions.push(xOut2, 0.45, zOut2);
    }

    beachGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    beachGeo.computeVertexNormals();

    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xdeb887, // Burlywood sand color
      roughness: 0.92,
      metalness: 0.02,
    });

    const beachMesh = new THREE.Mesh(beachGeo, sandMat);
    beachMesh.receiveShadow = true;
    this.group.add(beachMesh);
  }

  /**
   * Elevation query for physics collision and landing detection
   */
  public getElevationAt(x: number, z: number): number {
    const distToCoast = getDistanceToCoast(x, z);

    // Offshore ocean
    if (distToCoast <= 0) {
      return 0.0;
    }

    // Mountain massif (North-West)
    if (x < -180 && z < -180) {
      const mDist = Math.hypot(x - (-480), z - (-450));
      if (mDist < 420) {
        const mWeight = Math.cos((mDist / 420) * (Math.PI / 2));
        return 1.2 + mWeight * mWeight * 55.0;
      }
    }

    // Beach rim
    if (distToCoast < 45) {
      return 0.45 + (distToCoast / 45) * 0.75;
    }

    // Default island plateau
    return 1.2;
  }
}
