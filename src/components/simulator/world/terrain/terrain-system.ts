// ==========================================================
// DRONE PILOT — REALISTIC TERRAIN SYSTEM (PHASE 1)
// Multi-textured PBR heightfield, PBR runway & golden shoreline
// ==========================================================

import * as THREE from "three";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";
import { getCoastlineRadius } from "@/lib/world/coastline-math";
import { TerrainTextures } from "./terrain-textures";

export class TerrainSystem {
  public group = new THREE.Group();
  private terrainMesh!: THREE.Mesh;
  private runwayMesh?: THREE.Mesh;

  constructor() {
    this.buildIslandHeightfield();
    // this.buildAirfieldRunway();
    this.buildShorelineDetails();
  }

  /**
   * Main island landmass heightfield with 58,081 PBR vertices, micro-relief normal map,
   * and multi-biome vertex color modulation across 3000m span
   */
  private buildIslandHeightfield() {
    const width = 3000; // Covers 2400m island + 300m coastal shelf on all sides
    const segments = 240; // 12.5m resolution per vertex (58,081 smooth vertices)
    const geo = new THREE.PlaneGeometry(width, width, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      const sample = evaluateIslandElevation(x, z);

      pos.setY(i, sample.elevation);

      // Vertex color splatting to modulate grass/rock/sand/mud tones
      colors[i * 3] = sample.color[0];
      colors[i * 3 + 1] = sample.color[1];
      colors[i * 3 + 2] = sample.color[2];
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const grassTex = TerrainTextures.getGrassTexture();
    const rockTex = TerrainTextures.getRockTexture();
    const forestTex = TerrainTextures.getForestFloorTexture();
    const sandTex = TerrainTextures.getSandTexture();
    const screeTex = TerrainTextures.getScreeTexture();
    const normalTex = TerrainTextures.getTerrainNormalMap();

    const mat = new THREE.MeshStandardMaterial({
      map: grassTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(0.85, 0.85),
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.04,
      flatShading: false,
    });

    mat.customProgramCacheKey = () => "island-terrain-pbr-splatting-v3";

    // Multi-material PBR splatting: blends meadow, forest floor, cliff rock, sand, and scree
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uGrassMap = { value: grassTex };
      shader.uniforms.uRockMap = { value: rockTex };
      shader.uniforms.uForestMap = { value: forestTex };
      shader.uniforms.uSandMap = { value: sandTex };
      shader.uniforms.uScreeMap = { value: screeTex };

      shader.vertexShader = `
        varying vec3 vTerrainWorldPos;
        varying vec3 vTerrainWorldNorm;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        "#include <worldpos_vertex>",
        `
        #include <worldpos_vertex>
        vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vTerrainWorldNorm = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        `
      );

      shader.fragmentShader = `
        uniform sampler2D uGrassMap;
        uniform sampler2D uRockMap;
        uniform sampler2D uForestMap;
        uniform sampler2D uSandMap;
        uniform sampler2D uScreeMap;
        varying vec3 vTerrainWorldPos;
        varying vec3 vTerrainWorldNorm;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
        // 1. Slope factor (0 = flat horizontal, 1 = vertical cliff)
        float slope = 1.0 - clamp(abs(vTerrainWorldNorm.y), 0.0, 1.0);
        float rockWeight = smoothstep(0.24, 0.48, slope);

        // 2. Shoreline sand: blends near water table (elevation < 2.5m)
        float sandWeight = smoothstep(3.0, 0.5, vTerrainWorldPos.y);

        // 3. Alpine mountain scree: transitions above 72m
        float screeWeight = smoothstep(68.0, 115.0, vTerrainWorldPos.y);

        // 4. Forest floor loam vs lush meadow turf from vertex color ratio
        #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
        float forestWeight = clamp((vColor.r - vColor.g + 0.12) * 3.2, 0.0, 1.0);
        #else
        float forestWeight = 0.0;
        #endif

        // Multi-frequency world coordinate UV mapping
        vec2 uvGrass = vTerrainWorldPos.xz * 0.045;
        vec2 uvRock = vTerrainWorldPos.xz * 0.022;
        vec2 uvForest = vTerrainWorldPos.xz * 0.035;
        vec2 uvSand = vTerrainWorldPos.xz * 0.030;
        vec2 uvScree = vTerrainWorldPos.xz * 0.028;

        vec4 colGrass = texture2D(uGrassMap, uvGrass);
        vec4 colRock = texture2D(uRockMap, uvRock);
        vec4 colForest = texture2D(uForestMap, uvForest);
        vec4 colSand = texture2D(uSandMap, uvSand);
        vec4 colScree = texture2D(uScreeMap, uvScree);

        // Blend lowland meadow grass with rich dark forest loam
        vec4 baseGround = mix(colGrass, colForest, forestWeight);

        // Blend in warm coastal and riverbed sand near sea level
        baseGround = mix(baseGround, colSand, sandWeight);

        // Blend in high-elevation alpine scree & talus
        baseGround = mix(baseGround, colScree, screeWeight * (1.0 - rockWeight));

        // Cliff rock dominates on steep slopes and escarpments
        vec4 finalAlbedo = mix(baseGround, colRock, rockWeight);

        diffuseColor.rgb = finalAlbedo.rgb;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
        #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
        diffuseColor.rgb *= (vColor.rgb * 1.25);
        #endif
        `
      );
    };

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = false;
    this.group.add(this.terrainMesh);
  }

  /**
   * Realistic asphalt runway at the central Training Academy with FAA striping & threshold lights
   * Positioned at x: 25, z: -50, length: 260m, width: 32m
   */
  private buildAirfieldRunway() {
    const runwayWidth = 32;
    const runwayLength = 260;
    const runwayGeo = new THREE.PlaneGeometry(runwayWidth, runwayLength);
    runwayGeo.rotateX(-Math.PI / 2);

    const tarmacTex = TerrainTextures.getTarmacTexture();
    const tarmacMat = new THREE.MeshStandardMaterial({
      map: tarmacTex,
      roughness: 0.88,
      metalness: 0.12,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    this.runwayMesh = new THREE.Mesh(runwayGeo, tarmacMat);
    this.runwayMesh.position.set(25, 1.22, -50);
    this.runwayMesh.receiveShadow = true;
    this.group.add(this.runwayMesh);

    // Runway edge lights (elevated LED fixtures)
    const lightCount = 22;
    const lightGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 8);
    const lightMatWhite = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    });

    const edgeInstanced = new THREE.InstancedMesh(lightGeo, lightMatWhite, lightCount * 2);
    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let side = -1; side <= 1; side += 2) {
      const lx = 25 + side * (runwayWidth / 2 + 1.2);
      for (let j = 0; j < lightCount; j++) {
        const lz = -50 - runwayLength / 2 + (j / (lightCount - 1)) * runwayLength;
        dummy.position.set(lx, 1.4, lz);
        dummy.updateMatrix();
        edgeInstanced.setMatrixAt(idx++, dummy.matrix);
      }
    }
    edgeInstanced.instanceMatrix.needsUpdate = true;
    this.group.add(edgeInstanced);

    // Threshold green end lights
    const threshCount = 10;
    const threshGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.45, 8);
    const threshMat = new THREE.MeshStandardMaterial({
      color: 0x00ff66,
      emissive: 0x00dd44,
      emissiveIntensity: 2.2,
    });
    const threshInstanced = new THREE.InstancedMesh(threshGeo, threshMat, threshCount * 2);
    let tidx = 0;
    for (let end = -1; end <= 1; end += 2) {
      const ez = -50 + end * (runwayLength / 2 - 2);
      for (let k = 0; k < threshCount; k++) {
        const ex = 25 - runwayWidth / 2 + (k / (threshCount - 1)) * runwayWidth;
        dummy.position.set(ex, 1.4, ez);
        dummy.updateMatrix();
        threshInstanced.setMatrixAt(tidx++, dummy.matrix);
      }
    }
    threshInstanced.instanceMatrix.needsUpdate = true;
    this.group.add(threshInstanced);
  }

  /**
   * Realistic shoreline beach dunes with golden sand PBR texture along gentle coast sectors
   */
  private buildShorelineDetails() {
    const sampleCount = 140;
    const step = (Math.PI * 2) / sampleCount;

    const beachPositions: number[] = [];
    const beachUVs: number[] = [];

    for (let i = 0; i < sampleCount; i++) {
      const a1 = i * step;
      const a2 = (i + 1) * step;

      // Filter: only generate sandy beach strips along non-cliff coastlines
      const isSouthwestCliff = a1 > 2.0 && a1 < 2.85;
      const isNorthwestCape = a1 < -1.7 && a1 > -2.55;

      if (isSouthwestCliff || isNorthwestCape) continue;

      const r1 = getCoastlineRadius(a1);
      const r2 = getCoastlineRadius(a2);

      const xOut1 = Math.cos(a1) * r1;
      const zOut1 = Math.sin(a1) * r1;
      const xOut2 = Math.cos(a2) * r2;
      const zOut2 = Math.sin(a2) * r2;

      const xIn1 = Math.cos(a1) * (r1 - 48);
      const zIn1 = Math.sin(a1) * (r1 - 48);
      const xIn2 = Math.cos(a2) * (r2 - 48);
      const zIn2 = Math.sin(a2) * (r2 - 48);

      const yIn1 = evaluateIslandElevation(xIn1, zIn1).elevation + 0.05;
      const yIn2 = evaluateIslandElevation(xIn2, zIn2).elevation + 0.05;
      const yOut1 = Math.max(0.08, evaluateIslandElevation(xOut1, zOut1).elevation + 0.04);
      const yOut2 = Math.max(0.08, evaluateIslandElevation(xOut2, zOut2).elevation + 0.04);

      // Triangle 1
      beachPositions.push(xIn1, yIn1, zIn1);
      beachPositions.push(xOut1, yOut1, zOut1);
      beachPositions.push(xIn2, yIn2, zIn2);

      // UVs
      beachUVs.push(0, 0);
      beachUVs.push(1, 0);
      beachUVs.push(0, 1);

      // Triangle 2
      beachPositions.push(xIn2, yIn2, zIn2);
      beachPositions.push(xOut1, yOut1, zOut1);
      beachPositions.push(xOut2, yOut2, zOut2);

      // UVs
      beachUVs.push(0, 1);
      beachUVs.push(1, 0);
      beachUVs.push(1, 1);
    }

    if (beachPositions.length > 0) {
      const beachGeo = new THREE.BufferGeometry();
      beachGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(beachPositions, 3)
      );
      beachGeo.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(beachUVs, 2)
      );
      beachGeo.computeVertexNormals();

      const sandTex = TerrainTextures.getSandTexture();
      const beachMat = new THREE.MeshStandardMaterial({
        map: sandTex,
        roughness: 0.94,
        metalness: 0.02,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });

      const beachMesh = new THREE.Mesh(beachGeo, beachMat);
      beachMesh.receiveShadow = true;
      this.group.add(beachMesh);
    }
  }

  /**
   * Canonical real-time ground elevation query for flight physics, contact detection & HUD
   */
  public getElevationAt(x: number, z: number): number {
    return evaluateIslandElevation(x, z).elevation;
  }
}

