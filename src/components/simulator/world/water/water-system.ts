// ==========================================================
// DRONE PILOT — WATER SYSTEM (PUBG-GRADE DYNAMIC WATER)
// Ocean, shallow shelf, alpine lake, river & cascading mountain waterfall
// ==========================================================

import * as THREE from "three";
import { OceanMesh } from "./ocean-mesh";
import { FreshwaterMesh } from "./freshwater-mesh";
import { WorldMaterials } from "../world-materials";

export class WaterSystem {
  public group = new THREE.Group();
  public ocean: OceanMesh;
  public freshwater: FreshwaterMesh;

  // Mountain Waterfall
  private waterfallMesh!: THREE.Mesh;
  private waterfallMat!: THREE.MeshStandardMaterial;
  private mistParticles!: THREE.Points;
  private mistGeo!: THREE.BufferGeometry;
  private mistPositions!: Float32Array;
  private mistCount = 200;

  constructor() {
    this.ocean = new OceanMesh();
    this.group.add(this.ocean.group);

    this.freshwater = new FreshwaterMesh();
    this.group.add(this.freshwater.group);

    this.buildMountainWaterfall();
  }

  /**
   * Cascading waterfall where Mountain Lake plunges over the rock cliff into the river
   */
  private buildMountainWaterfall() {
    this.mistCount = 350;

    // 1. Cascading Water Curtain: 24m wide x 11m drop over natural rock escarpment
    const fallGeo = new THREE.PlaneGeometry(24, 11.0, 16, 16);
    fallGeo.rotateY(Math.PI / 4);

    // Procedural churning white-water texture
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(0, 0, 256, 512);

      // Churning foam streaks
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 700; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 512;
        ctx.fillRect(x, y, 3 + Math.random() * 8, 25 + Math.random() * 50);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 2);

    this.waterfallMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.08,
      metalness: 0.75,
      transparent: true,
      opacity: 0.90,
      side: THREE.DoubleSide,
    });

    this.waterfallMesh = new THREE.Mesh(fallGeo, this.waterfallMat);
    this.waterfallMesh.position.set(-268, 5.5, -210);
    this.waterfallMesh.rotation.x = 0.32; // Natural chute cascade angle
    this.group.add(this.waterfallMesh);

    // Secondary lower white-water churn plane
    const lowerFallGeo = new THREE.PlaneGeometry(20, 5.5, 8, 8);
    lowerFallGeo.rotateY(Math.PI / 4);
    const lowerFallMesh = new THREE.Mesh(lowerFallGeo, this.waterfallMat);
    lowerFallMesh.position.set(-262, 3.2, -204);
    lowerFallMesh.rotation.x = 0.45;
    this.group.add(lowerFallMesh);

    // Rocky escarpment behind waterfall (sunken into canyon wall, fully outside lake boundary)
    const cliffGeo = new THREE.BoxGeometry(20, 10, 2.5);
    const cliffMat = WorldMaterials.rock;
    const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
    cliffMesh.position.set(-272, 4.8, -214);
    cliffMesh.rotation.y = Math.PI / 4;
    this.group.add(cliffMesh);

    // Plunge pool at the base (14m radius)
    const poolGeo = new THREE.CircleGeometry(14, 32);
    const poolMat = WorldMaterials.waterFresh.clone();
    const poolMesh = new THREE.Mesh(poolGeo, poolMat);
    poolMesh.rotation.x = -Math.PI / 2;
    poolMesh.position.set(-258, 2.05, -198);
    this.group.add(poolMesh);

    // Natural weathered boulders surrounding pool base and splash zone
    const boulderGeo = new THREE.DodecahedronGeometry(1.8, 1);
    const boulderMat = WorldMaterials.rock;
    const boulderPositions = [
      { x: -248, y: 1.6, z: -200 },
      { x: -252, y: 1.7, z: -188 },
      { x: -264, y: 1.8, z: -188 },
      { x: -270, y: 1.8, z: -202 },
      { x: -274, y: 2.2, z: -214 },
      { x: -244, y: 1.5, z: -206 },
      { x: -256, y: 1.6, z: -212 },
      { x: -262, y: 1.5, z: -184 },
    ];
    boulderPositions.forEach((pos) => {
      const boulder = new THREE.Mesh(boulderGeo, boulderMat);
      boulder.position.set(pos.x, pos.y, pos.z);
      boulder.rotation.set(Math.random(), Math.random(), Math.random());
      boulder.scale.set(1 + Math.random() * 0.6, 0.9 + Math.random() * 0.5, 1 + Math.random() * 0.6);
      boulder.castShadow = true;
      boulder.receiveShadow = true;
      this.group.add(boulder);
    });

    // Connecting river outflow channel leading from pool to canyon
    const streamGeo = new THREE.PlaneGeometry(12, 28);
    const streamMat = WorldMaterials.waterFresh.clone();
    const streamMesh = new THREE.Mesh(streamGeo, streamMat);
    streamMesh.rotation.x = -Math.PI / 2;
    streamMesh.rotation.z = Math.PI / 4;
    streamMesh.position.set(-248, 1.95, -182);
    this.group.add(streamMesh);

    // 3. Dense Spray Mist Emitter with soft circular radial particles
    this.mistPositions = new Float32Array(this.mistCount * 3);
    this.mistGeo = new THREE.BufferGeometry();

    for (let i = 0; i < this.mistCount; i++) {
      this.mistPositions[i * 3] = -262 + (Math.random() - 0.5) * 22;
      this.mistPositions[i * 3 + 1] = 2.2 + Math.random() * 4.5;
      this.mistPositions[i * 3 + 2] = -202 + (Math.random() - 0.5) * 16;
    }
    this.mistGeo.setAttribute("position", new THREE.BufferAttribute(this.mistPositions, 3));

    // Soft radial gradient for natural fluffy mist particles
    const mistCanvas = document.createElement("canvas");
    mistCanvas.width = 64;
    mistCanvas.height = 64;
    const mCtx = mistCanvas.getContext("2d");
    if (mCtx) {
      const grad = mCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(240, 249, 255, 0.85)");
      grad.addColorStop(0.4, "rgba(240, 249, 255, 0.40)");
      grad.addColorStop(1, "rgba(240, 249, 255, 0.0)");
      mCtx.fillStyle = grad;
      mCtx.fillRect(0, 0, 64, 64);
    }
    const mistTex = new THREE.CanvasTexture(mistCanvas);

    const mistMat = new THREE.PointsMaterial({
      color: 0xf0f9ff,
      size: 2.8,
      map: mistTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    this.mistParticles = new THREE.Points(this.mistGeo, mistMat);
    this.group.add(this.mistParticles);
  }

  public update(dt: number, elapsed: number) {
    this.ocean.update(dt, elapsed);
    this.freshwater.update(dt, elapsed);

    // Scroll waterfall foam downwards
    if (this.waterfallMat.map) {
      this.waterfallMat.map.offset.y = -(elapsed * 2.4) % 1;
    }

    // Animate mist turbulence
    if (this.mistGeo) {
      const pos = this.mistGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.mistCount; i++) {
        let py = this.mistPositions[i * 3 + 1] + dt * 1.2;
        if (py > 5.2) {
          py = 2.2;
        }
        this.mistPositions[i * 3 + 1] = py;
        this.mistPositions[i * 3] += Math.sin(elapsed * 3 + i) * dt * 0.4;
      }
      pos.needsUpdate = true;
    }
  }
}
