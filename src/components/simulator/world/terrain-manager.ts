// ==========================================================
// DRONE PILOT — TERRAIN MANAGER
// Island landmass, sandy shoreline, turf plateau, and ocean
// ==========================================================

import * as THREE from "three";

export class TerrainManager {
  public group = new THREE.Group();
  private animatedElements: Array<(elapsed: number) => void> = [];

  constructor() {
    this.buildOcean();
    this.buildIslandLandmass();
  }

  // --------------------------------------------------------
  // 1. SURROUNDING OCEAN EXPANSE (1600m x 1600m)
  // --------------------------------------------------------
  private buildOcean() {
    const oceanGeo = new THREE.PlaneGeometry(1600, 1600, 32, 32);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.12,
      metalness: 0.85,
      transparent: true,
      opacity: 0.94,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.05;
    ocean.receiveShadow = true;
    this.group.add(ocean);

    // Dynamic undulating wave vertex animation
    const posAttr = oceanGeo.attributes.position;
    const initialY: number[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      initialY.push(posAttr.getY(i));
    }

    this.animatedElements.push((elapsed) => {
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = initialY[i];
        posAttr.setZ(i, Math.sin(elapsed * 1.2 + x * 0.04) * 0.18 + Math.cos(elapsed * 0.9 + y * 0.04) * 0.12);
      }
      posAttr.needsUpdate = true;
    });
  }

  // --------------------------------------------------------
  // 2. ISLAND LANDMASS & COASTLINE (Sandy Beach & Turf Plateau)
  // --------------------------------------------------------
  private buildIslandLandmass() {
    // A. Sandy Shoreline Bed (Diameter: 720m)
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xe0c598,
      roughness: 0.90,
      metalness: 0.02,
    });
    const sandGeo = new THREE.CylinderGeometry(360, 390, 0.30, 48);
    const sandMesh = new THREE.Mesh(sandGeo, sandMat);
    sandMesh.position.y = 0.10; // Top at 0.25m
    sandMesh.receiveShadow = true;
    this.group.add(sandMesh);

    // B. Procedural Turf Plateau (Diameter: 680m, surface at Y = 0.30m)
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#476b3f";
      ctx.fillRect(0, 0, 512, 512);

      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const radius = Math.random() * 2.8 + 1;
        ctx.fillStyle = Math.random() > 0.5 ? "#537c49" : "#3d5c36";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const turfTexture = new THREE.CanvasTexture(canvas);
    turfTexture.wrapS = THREE.RepeatWrapping;
    turfTexture.wrapT = THREE.RepeatWrapping;
    turfTexture.repeat.set(60, 60);

    const turfMat = new THREE.MeshStandardMaterial({
      map: turfTexture,
      roughness: 0.85,
      metalness: 0.05,
    });

    const turfGeo = new THREE.CylinderGeometry(340, 360, 0.30, 48);
    const turfMesh = new THREE.Mesh(turfGeo, turfMat);
    turfMesh.position.y = 0.15; // Top surface at exact Y = 0.30m
    turfMesh.receiveShadow = true;
    this.group.add(turfMesh);

    // C. Coastal Headland Bluffs & Raised Hills (South & West Coasts)
    const bluffMat = new THREE.MeshStandardMaterial({
      color: 0x5c7255,
      roughness: 0.92,
      flatShading: true,
    });
    const bluffs = [
      { x: -220, z: 160, r: 55, h: 6.5 },
      { x: -160, z: 240, r: 65, h: 8.0 },
      { x: 180, z: -210, r: 70, h: 9.5 },
      { x: 250, z: -140, r: 60, h: 7.2 },
      { x: -260, z: -120, r: 75, h: 11.0 },
    ];
    bluffs.forEach((b) => {
      const bGeo = new THREE.CylinderGeometry(b.r * 0.75, b.r, b.h, 16);
      const bMesh = new THREE.Mesh(bGeo, bluffMat);
      bMesh.position.set(b.x, b.h / 2 + 0.2, b.z);
      bMesh.receiveShadow = true;
      this.group.add(bMesh);
    });
  }

  public getGroundElevation(x: number, z: number): number {
    const distFromCenter = Math.sqrt(x * x + z * z);
    if (distFromCenter < 13.5) {
      return 0.62; // Elevated Helipad
    } else if (distFromCenter < 340) {
      return 0.30; // Grassland Turf
    } else if (distFromCenter < 375) {
      return 0.20; // Sandy Beach
    }
    return 0.0; // Ocean Water Level
  }

  public update(_dt: number, elapsed: number) {
    for (let i = 0; i < this.animatedElements.length; i++) {
      this.animatedElements[i](elapsed);
    }
  }
}
