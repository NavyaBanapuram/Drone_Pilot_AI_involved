// ==========================================================
// DRONE PILOT — OCEAN MESH
// 4000m x 4000m continuous ocean expanse with coastal shallow shelf
// ==========================================================

import * as THREE from "three";
import { WORLD_CONFIG } from "@/lib/world/world-config";
import { getCoastlineRadius, getDistanceToCoast } from "@/lib/world/coastline-math";
import { WorldMaterials } from "../world-materials";

export class OceanMesh {
  public group = new THREE.Group();
  private posAttr!: THREE.BufferAttribute;
  private initialY: Float32Array = new Float32Array(0);
  private initialX: Float32Array = new Float32Array(0);
  private initialZ: Float32Array = new Float32Array(0);

  constructor() {
    this.buildDeepOceanPlane();
    this.buildCoastalShallowShelf();
    this.buildShorelineFoamRibbon();
  }

  private oceanMat!: THREE.MeshStandardMaterial;
  private shelfMat!: THREE.MeshStandardMaterial;
  private foamMat!: THREE.MeshStandardMaterial;
  private waveNormalTex!: THREE.CanvasTexture;
  private foamTex!: THREE.CanvasTexture;

  /**
   * 4000m x 4000m continuous deep ocean expanse with sparkling wave normals
   */
  private buildDeepOceanPlane() {
    // 96x96 subdivision grid for rich visible 3D wave swells
    const geo = new THREE.PlaneGeometry(
      WORLD_CONFIG.worldWidth,
      WORLD_CONFIG.worldLength,
      96,
      96
    );
    geo.rotateX(-Math.PI / 2);

    this.posAttr = geo.attributes.position as THREE.BufferAttribute;
    const count = this.posAttr.count;
    this.initialX = new Float32Array(count);
    this.initialY = new Float32Array(count);
    this.initialZ = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const x = this.posAttr.getX(i);
      const z = this.posAttr.getZ(i);
      this.initialX[i] = x;
      this.initialZ[i] = z;

      const distCoast = getDistanceToCoast(x, z);
      // Depress ocean mesh inside island landmass so it never clips or overlaps terrestrial ground
      if (distCoast > 12) {
        this.initialY[i] = -40.0;
      } else if (distCoast > 0) {
        this.initialY[i] = -(distCoast / 12.0) * 40.0;
      } else {
        this.initialY[i] = 0.0;
      }
      this.posAttr.setY(i, this.initialY[i]);
    }

    // High-frequency ripple normal canvas for realistic sun glints & specular waves
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const imgData = ctx.createImageData(size, size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = (x / size) * Math.PI * 16;
          const v = (y / size) * Math.PI * 16;
          // Multi-harmonic Gerstner-like wave gradients for sharp sun sparkle
          const dx =
            Math.sin(u * 1.0) * 0.40 +
            Math.sin(u * 2.3 + v * 1.5) * 0.32 +
            Math.cos(u * 4.7 - v * 2.1) * 0.18 +
            Math.sin(u * 8.2 + v * 6.4) * 0.10;
          const dy =
            Math.cos(v * 1.0) * 0.40 +
            Math.cos(v * 2.1 - u * 1.7) * 0.32 +
            Math.sin(v * 4.3 + u * 2.9) * 0.18 +
            Math.cos(v * 7.8 - u * 5.6) * 0.10;
          const r = Math.floor((dx * 0.45 + 0.5) * 255);
          const g = Math.floor((dy * 0.45 + 0.5) * 255);
          const idx = (y * size + x) * 4;
          imgData.data[idx] = Math.max(0, Math.min(255, r));
          imgData.data[idx + 1] = Math.max(0, Math.min(255, g));
          imgData.data[idx + 2] = 255;
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
    this.waveNormalTex = new THREE.CanvasTexture(canvas);
    this.waveNormalTex.wrapS = THREE.RepeatWrapping;
    this.waveNormalTex.wrapT = THREE.RepeatWrapping;
    this.waveNormalTex.repeat.set(48, 48);

    // Vibrant tropical ocean: Azure `#0284c7` with broad angle visibility & Fresnel sky reflection
    this.oceanMat = WorldMaterials.waterOcean.clone();
    this.oceanMat.normalMap = this.waveNormalTex;
    this.oceanMat.normalScale = new THREE.Vector2(2.0, 2.0);
    this.oceanMat.envMapIntensity = 2.5;
    this.applyWaterFresnel(this.oceanMat, new THREE.Color(0xa5f3fc));

    const ocean = new THREE.Mesh(geo, this.oceanMat);
    ocean.position.y = WORLD_CONFIG.seaLevel;
    ocean.receiveShadow = true;
    this.group.add(ocean);
  }

  private applyWaterFresnel(mat: THREE.MeshStandardMaterial, tint: THREE.Color) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uFresnelTint = { value: tint };
      shader.fragmentShader = `
        uniform vec3 uFresnelTint;
        ${shader.fragmentShader}
      `;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `
        #include <dithering_fragment>
        float fDot = clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
        float fresnelTerm = pow(1.0 - fDot, 3.2);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uFresnelTint, fresnelTerm * 0.55);
        `
      );
    };
  }

  /**
   * Submerged turquoise shallow water shelf along beach contours
   */
  private buildCoastalShallowShelf() {
    const sampleCount = 128;
    const step = (Math.PI * 2) / sampleCount;

    const shelfPositions: number[] = [];

    for (let i = 0; i < sampleCount; i++) {
      const a1 = i * step;
      const a2 = (i + 1) * step;

      const r1 = getCoastlineRadius(a1);
      const r2 = getCoastlineRadius(a2);

      // Inner edge at waterline (r), outer shelf 55m out to sea
      const xIn1 = Math.cos(a1) * (r1 + 2);
      const zIn1 = Math.sin(a1) * (r1 + 2);
      const xIn2 = Math.cos(a2) * (r2 + 2);
      const zIn2 = Math.sin(a2) * (r2 + 2);

      const xOut1 = Math.cos(a1) * (r1 + 55);
      const zOut1 = Math.sin(a1) * (r1 + 55);
      const xOut2 = Math.cos(a2) * (r2 + 55);
      const zOut2 = Math.sin(a2) * (r2 + 55);

      // Triangle 1
      shelfPositions.push(xIn1, 0.08, zIn1);
      shelfPositions.push(xOut1, -0.04, zOut1);
      shelfPositions.push(xIn2, 0.08, zIn2);

      // Triangle 2
      shelfPositions.push(xIn2, 0.08, zIn2);
      shelfPositions.push(xOut1, -0.04, zOut1);
      shelfPositions.push(xOut2, -0.04, zOut2);
    }

    const shelfGeo = new THREE.BufferGeometry();
    shelfGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(shelfPositions, 3)
    );
    shelfGeo.computeVertexNormals();

    this.shelfMat = WorldMaterials.waterFresh.clone();
    this.shelfMat.normalMap = this.waveNormalTex;
    this.shelfMat.normalScale = new THREE.Vector2(1.5, 1.5);
    this.shelfMat.envMapIntensity = 2.2;
    this.applyWaterFresnel(this.shelfMat, new THREE.Color(0xcffafe));

    const shelfMesh = new THREE.Mesh(shelfGeo, this.shelfMat);
    this.group.add(shelfMesh);
  }

  /**
   * Procedural seafoam texture for animated surf breakers
   */
  private createFoamTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = "#e0f2fe";
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 1.5 + Math.random() * 5.0;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 600; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 0.8 + Math.random() * 2.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(32, 2);
    return tex;
  }

  /**
   * Animated shoreline surf foam ribbon lapping against beaches and coastal rocks
   */
  private buildShorelineFoamRibbon() {
    const sampleCount = 128;
    const step = (Math.PI * 2) / sampleCount;

    const foamPositions: number[] = [];

    for (let i = 0; i < sampleCount; i++) {
      const a1 = i * step;
      const a2 = (i + 1) * step;

      const r1 = getCoastlineRadius(a1);
      const r2 = getCoastlineRadius(a2);

      // Surf foam ribbon from 3m inland (wet sand) to 9m offshore
      const xIn1 = Math.cos(a1) * (r1 - 3);
      const zIn1 = Math.sin(a1) * (r1 - 3);
      const xIn2 = Math.cos(a2) * (r2 - 3);
      const zIn2 = Math.sin(a2) * (r2 - 3);

      const xOut1 = Math.cos(a1) * (r1 + 9);
      const zOut1 = Math.sin(a1) * (r1 + 9);
      const xOut2 = Math.cos(a2) * (r2 + 9);
      const zOut2 = Math.sin(a2) * (r2 + 9);

      // Triangle 1
      foamPositions.push(xIn1, 0.16, zIn1);
      foamPositions.push(xOut1, 0.12, zOut1);
      foamPositions.push(xIn2, 0.16, zIn2);

      // Triangle 2
      foamPositions.push(xIn2, 0.16, zIn2);
      foamPositions.push(xOut1, 0.12, zOut1);
      foamPositions.push(xOut2, 0.12, zOut2);
    }

    const foamGeo = new THREE.BufferGeometry();
    foamGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(foamPositions, 3)
    );
    foamGeo.computeVertexNormals();

    this.foamTex = this.createFoamTexture();
    this.foamMat = WorldMaterials.foam.clone();
    this.foamMat.map = this.foamTex;

    const foamMesh = new THREE.Mesh(foamGeo, this.foamMat);
    this.group.add(foamMesh);
  }

  /**
   * Multi-harmonic 3D Gerstner-like rolling ocean swells with coastal dampening
   */
  public update(_dt: number, elapsed: number) {
    if (!this.posAttr) return;

    const count = this.posAttr.count;
    for (let i = 0; i < count; i++) {
      const x = this.initialX[i];
      const z = this.initialZ[i];

      // Calculate distance to coast to smoothly dampen waves near shoreline
      const distCoast = getDistanceToCoast(x, z);
      // Offshore distCoast < 0; inland > 0
      // Damping factor: 0 when inside island, 1 when > 55m offshore
      const dampFactor =
        distCoast >= 0 ? 0.0 : Math.min(1.0, -distCoast / 55.0);

      if (dampFactor <= 0.01) {
        this.posAttr.setY(i, this.initialY[i]);
        continue;
      }

      // 1. Primary Ocean Swell (rolling in from South-West at 225 deg, wavelength ~110m)
      const k1 = 0.057; // 2 * PI / 110
      const phase1 = elapsed * 1.6 + (x * 0.707 + z * 0.707) * k1;
      const swell1 = Math.sin(phase1) * 1.6;

      // 2. Secondary Cross-Swell (choppier wave train, wavelength ~46m)
      const k2 = 0.136; // 2 * PI / 46
      const phase2 = elapsed * 2.4 + (x * -0.5 + z * 0.866) * k2;
      const swell2 = Math.sin(phase2) * 0.85;

      // 3. High-frequency surface chop (wavelength ~20m)
      const k3 = 0.31;
      const phase3 = elapsed * 3.4 + (x * 0.9 + z * -0.4) * k3;
      const swell3 = Math.cos(phase3) * 0.42;

      const totalDisplacement = (swell1 + swell2 + swell3) * dampFactor;
      this.posAttr.setY(i, this.initialY[i] + totalDisplacement);
    }
    this.posAttr.needsUpdate = true;

    // Animate wave normal offset for moving sea ripples
    if (this.waveNormalTex) {
      this.waveNormalTex.offset.x = (elapsed * 0.048) % 1;
      this.waveNormalTex.offset.y = (elapsed * 0.038) % 1;
    }

    // Animate surf foam pulsing and washing up the beach
    if (this.foamMat && this.foamTex) {
      this.foamTex.offset.x = (elapsed * 0.08) % 1;
      this.foamMat.opacity = 0.52 + Math.sin(elapsed * 1.8) * 0.22;
    }
  }
}
