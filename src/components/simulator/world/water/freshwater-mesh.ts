// ==========================================================
// DRONE PILOT — FRESHWATER MESH (LAKE & RIVER CORRIDOR)
// Alpine mountain lake and descending river canyon surface
// ==========================================================

import * as THREE from "three";
import { WORLD_DEFINITION } from "@/lib/world/world-definition";
import { WorldMaterials } from "../world-materials";

export class FreshwaterMesh {
  public group = new THREE.Group();

  private riverMat!: THREE.MeshStandardMaterial;
  private lakeMat!: THREE.MeshStandardMaterial;
  private riverFlowTex!: THREE.CanvasTexture;
  private riverNormalTex!: THREE.CanvasTexture;

  constructor() {
    this.buildMountainLake();
    this.buildRiverCorridor();
  }

  private waveNormalTex!: THREE.CanvasTexture;

  private createWaterNormal(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const imgData = ctx.createImageData(size, size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = (x / size) * Math.PI * 12;
          const v = (y / size) * Math.PI * 12;
          const dx = Math.sin(u) * 0.5 + Math.sin(u * 2.2 + v * 1.8) * 0.3;
          const dy = Math.cos(v) * 0.5 + Math.cos(v * 2.4 - u * 1.6) * 0.3;
          const r = Math.floor((dx * 0.45 + 0.5) * 255);
          const g = Math.floor((dy * 0.45 + 0.5) * 255);
          const idx = (y * size + x) * 4;
          imgData.data[idx] = r;
          imgData.data[idx + 1] = g;
          imgData.data[idx + 2] = 255;
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    return tex;
  }

  /**
   * Crystal Mountain Lake surface with natural organic shoreline and pebble gravel embankment
   */
  private buildMountainLake() {
    this.waveNormalTex = this.createWaterNormal();

    const segments = 64;
    const baseRadius = WORLD_DEFINITION.waterways.lakeRadiusMeters;
    const lakeCenter = WORLD_DEFINITION.waterways.lakeCenter;

    // Organic lake perimeter vertices
    const lakeShape = new THREE.Shape();
    const bankPositions: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Multi-frequency organic shoreline variation (radius 95m to 120m)
      const rVar =
        Math.sin(angle * 3.0) * 8.0 +
        Math.cos(angle * 5.0) * 4.5 +
        Math.sin(angle * 7.0) * 2.5;
      const r = baseRadius + rVar;

      const px = Math.cos(angle) * r;
      const pz = Math.sin(angle) * r;

      if (i === 0) {
        lakeShape.moveTo(px, pz);
      } else {
        lakeShape.lineTo(px, pz);
      }

      // Embankment border vertices (12m gravel bank sloping outward)
      const outerR = r + 12.0;
      const ox = Math.cos(angle) * outerR;
      const oz = Math.sin(angle) * outerR;

      if (i > 0) {
        const prevAngle = ((i - 1) / segments) * Math.PI * 2;
        const prevRVar =
          Math.sin(prevAngle * 3.0) * 8.0 +
          Math.cos(prevAngle * 5.0) * 4.5 +
          Math.sin(prevAngle * 7.0) * 2.5;
        const prevR = baseRadius + prevRVar;
        const prevOuterR = prevR + 12.0;

        const ppx = Math.cos(prevAngle) * prevR;
        const ppz = Math.sin(prevAngle) * prevR;
        const pox = Math.cos(prevAngle) * prevOuterR;
        const poz = Math.sin(prevAngle) * prevOuterR;

        // Quad for gravel bank
        bankPositions.push(
          ppx, 0.0, ppz,
          pox, 1.2, poz,
          px, 0.0, pz,

          px, 0.0, pz,
          pox, 1.2, poz,
          ox, 1.2, oz
        );
      }
    }

    const lakeGeo = new THREE.ShapeGeometry(lakeShape);
    lakeGeo.rotateX(-Math.PI / 2);

    this.lakeMat = WorldMaterials.waterFresh.clone();
    this.lakeMat.normalMap = this.waveNormalTex;
    this.lakeMat.normalScale = new THREE.Vector2(1.2, 1.2);
    this.applyWaterFresnel(this.lakeMat, new THREE.Color(0xbae6fd));

    const lakeMesh = new THREE.Mesh(lakeGeo, this.lakeMat);
    lakeMesh.position.set(lakeCenter.x, lakeCenter.y, lakeCenter.z);
    lakeMesh.receiveShadow = true;
    this.group.add(lakeMesh);

    // Natural stone & gravel embankment collar around lake
    const bankGeo = new THREE.BufferGeometry();
    bankGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(bankPositions, 3)
    );
    bankGeo.computeVertexNormals();

    const bankMat = WorldMaterials.rock;
    const bankMesh = new THREE.Mesh(bankGeo, bankMat);
    bankMesh.position.set(lakeCenter.x, lakeCenter.y - 0.05, lakeCenter.z);
    bankMesh.receiveShadow = true;
    this.group.add(bankMesh);
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
   * Procedural churning rapids & stream streaks texture for directional flow
   */
  private createRiverFlowTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0284c7"; // Luminous blue-cyan river base
      ctx.fillRect(0, 0, size, size);

      // Downstream flow streak lines
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 550; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const w = 1.2 + Math.random() * 3.5;
        const h = 25 + Math.random() * 80;
        ctx.globalAlpha = 0.18 + Math.random() * 0.42;
        ctx.fillRect(x, y, w, h);
      }
      ctx.globalAlpha = 1.0;
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 16);
    return tex;
  }

  /**
   * Continuous river water ribbon and stone embankments descending through canyon to ocean delta
   */
  private buildRiverCorridor() {
    const segments = 128;
    const riverPositions: number[] = [];
    const riverUvs: number[] = [];
    const bankPositions: number[] = [];

    const zStart = -220;
    const zEnd = 960;
    const zStep = (zEnd - zStart) / segments;

    for (let i = 0; i < segments; i++) {
      const z1 = zStart + i * zStep;
      const z2 = zStart + (i + 1) * zStep;

      const p1 = (z1 - zStart) / (zEnd - zStart);
      const p2 = (z2 - zStart) / (zEnd - zStart);

      // Organic meandering river centerline
      const x1 =
        -270 +
        p1 * 190 +
        Math.sin(p1 * Math.PI * 2.5) * 45 +
        Math.cos(p1 * Math.PI * 6.0) * 8;
      const x2 =
        -270 +
        p2 * 190 +
        Math.sin(p2 * Math.PI * 2.5) * 45 +
        Math.cos(p2 * Math.PI * 6.0) * 8;

      const y1 = Math.max(0.18, 8.5 * (1 - p1) + 0.08);
      const y2 = Math.max(0.18, 8.5 * (1 - p2) + 0.08);

      const halfWidth1 = 13 + p1 * 19; // Expands from 26m to 64m at estuary delta
      const halfWidth2 = 13 + p2 * 19;

      const bankWidth = 10.0;

      // Water surface quad vertices
      const left1 = [x1 - halfWidth1, y1, z1];
      const right1 = [x1 + halfWidth1, y1, z1];
      const left2 = [x2 - halfWidth2, y2, z2];
      const right2 = [x2 + halfWidth2, y2, z2];

      riverPositions.push(...left1, ...right1, ...left2);
      riverPositions.push(...left2, ...right1, ...right2);

      // UV coordinates: u=0..1 across river, v follows downstream length
      riverUvs.push(0, p1 * 28, 1, p1 * 28, 0, p2 * 28);
      riverUvs.push(0, p2 * 28, 1, p1 * 28, 1, p2 * 28);

      // Left Bank (sloping up from water to canyon wall)
      const bLeftOuter1 = [x1 - halfWidth1 - bankWidth, y1 + 1.2, z1];
      const bLeftOuter2 = [x2 - halfWidth2 - bankWidth, y2 + 1.2, z2];
      bankPositions.push(
        ...bLeftOuter1, ...left1, ...bLeftOuter2,
        ...bLeftOuter2, ...left1, ...left2
      );

      // Right Bank
      const bRightOuter1 = [x1 + halfWidth1 + bankWidth, y1 + 1.2, z1];
      const bRightOuter2 = [x2 + halfWidth2 + bankWidth, y2 + 1.2, z2];
      bankPositions.push(
        ...right1, ...bRightOuter1, ...right2,
        ...right2, ...bRightOuter1, ...bRightOuter2
      );
    }

    const riverGeo = new THREE.BufferGeometry();
    riverGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(riverPositions, 3)
    );
    riverGeo.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(riverUvs, 2)
    );
    riverGeo.computeVertexNormals();

    this.riverPosAttr = riverGeo.attributes.position as THREE.BufferAttribute;
    const count = this.riverPosAttr.count;
    this.initialRiverY = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.initialRiverY[i] = this.riverPosAttr.getY(i);
    }

    this.riverFlowTex = this.createRiverFlowTexture();
    this.riverNormalTex = this.createWaterNormal();

    this.riverMat = WorldMaterials.waterFresh.clone();
    this.riverMat.map = this.riverFlowTex;
    this.riverMat.normalMap = this.riverNormalTex;
    this.riverMat.normalScale = new THREE.Vector2(1.8, 1.8);
    this.riverMat.envMapIntensity = 2.2;
    this.applyWaterFresnel(this.riverMat, new THREE.Color(0xdff4fc));

    const riverMesh = new THREE.Mesh(riverGeo, this.riverMat);
    riverMesh.receiveShadow = true;
    this.group.add(riverMesh);

    // River embankment banks (river stone & silt)
    const bankGeo = new THREE.BufferGeometry();
    bankGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(bankPositions, 3)
    );
    bankGeo.computeVertexNormals();

    const bankMat = WorldMaterials.rock;
    const riverBankMesh = new THREE.Mesh(bankGeo, bankMat);
    riverBankMesh.receiveShadow = true;
    this.group.add(riverBankMesh);

    // Scattered natural river boulders in rapids and sandbars
    const boulderGeo = new THREE.DodecahedronGeometry(1.4, 1);
    const boulderMat = WorldMaterials.rock;

    for (let b = 0; b < 28; b++) {
      const p = (b + 1) / 30;
      const z = zStart + p * (zEnd - zStart);
      const centerX =
        -270 +
        p * 190 +
        Math.sin(p * Math.PI * 2.5) * 45 +
        Math.cos(p * Math.PI * 6.0) * 8;
      const halfW = 12 + p * 18;
      const waterY = Math.max(0.12, 8.5 * (1 - p));

      // Alternate left and right shallow waters
      const offset = (Math.sin(b * 3.7) * 0.6) * halfW;
      const boulder = new THREE.Mesh(boulderGeo, boulderMat);
      boulder.position.set(centerX + offset, waterY - 0.2, z);
      boulder.rotation.set(b * 0.4, b * 0.9, b * 0.2);
      const scale = 0.8 + Math.abs(Math.sin(b * 1.5)) * 0.7;
      boulder.scale.set(scale, scale * 0.8, scale);
      boulder.castShadow = true;
      boulder.receiveShadow = true;
      this.group.add(boulder);
    }
  }

  private riverPosAttr!: THREE.BufferAttribute;
  private initialRiverY: Float32Array = new Float32Array(0);

  public update(_dt: number, elapsed: number) {
    // 1. Dynamic river rapids wave motion
    if (this.riverPosAttr) {
      const count = this.riverPosAttr.count;
      for (let i = 0; i < count; i++) {
        const z = this.riverPosAttr.getZ(i);
        const baseY = this.initialRiverY[i];
        const ripple =
          Math.sin(elapsed * 4.8 - z * 0.08) * 0.12 +
          Math.cos(elapsed * 3.5 + z * 0.14) * 0.06;
        this.riverPosAttr.setY(i, baseY + ripple);
      }
      this.riverPosAttr.needsUpdate = true;
    }

    // 2. Stream rapids flow visibly downstream along river spline
    if (this.riverFlowTex) {
      this.riverFlowTex.offset.y = -(elapsed * 0.45) % 1;
    }
    if (this.riverNormalTex) {
      this.riverNormalTex.offset.y = -(elapsed * 0.35) % 1;
      this.riverNormalTex.offset.x = (elapsed * 0.05) % 1;
    }

    // 3. Calm mountain lake surface ripples
    if (this.waveNormalTex) {
      this.waveNormalTex.offset.x = (elapsed * 0.035) % 1;
      this.waveNormalTex.offset.y = (elapsed * 0.025) % 1;
    }
  }
}
