// ==========================================================
// DRONE PILOT — DENSE INSTANCED 3D GRASS SYSTEM (PUBG-GRADE)
// 12,000+ cross-quad instances with wind-wave vertex shader animation
// ==========================================================

import * as THREE from "three";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";
import { isWaterAt } from "@/lib/world/hydrology-mask";
import { getDistanceToRoad, getBiomeAt } from "@/lib/world/biome-system";
import { HELIPAD_LIST } from "@/lib/world/helipad-definitions";
import { EnvironmentManager } from "../environment-manager";

export class InstancedGrass {
  public group = new THREE.Group();
  private instancedMesh!: THREE.InstancedMesh;
  private customMaterial!: THREE.MeshStandardMaterial;
  private timeUniform = { value: 0 };
  private dronePosUniform = { value: new THREE.Vector3(0, 100, 0) };
  private windStrengthUniform = { value: 1.0 };
  private windDirUniform = { value: new THREE.Vector2(0.85, 0.52) };

  constructor(instanceCount = 18000) {
    this.buildGrassMesh(instanceCount);
  }

  /**
   * Generates a 3-blade cross-quad geometry for full 360-degree volumetric thickness
   */
  private createCrossQuadGeometry(): THREE.BufferGeometry {
    const w = 0.8; // Width of tuft
    const h = 0.6; // Height of tuft

    // 3 intersecting vertical planes at 0, 60, and 120 degrees
    const positions: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    const angles = [0, Math.PI / 3, (Math.PI * 2) / 3];

    angles.forEach((angle, planeIdx) => {
      const cos = Math.cos(angle) * (w / 2);
      const sin = Math.sin(angle) * (w / 2);

      const baseVertex = planeIdx * 4;

      // 4 vertices per quad: bottom-left, bottom-right, top-right, top-left
      positions.push(-cos, 0, -sin); // BL
      positions.push(cos, 0, sin); // BR
      positions.push(cos, h, sin); // TR
      positions.push(-cos, h, -sin); // TL

      uvs.push(0, 0);
      uvs.push(1, 0);
      uvs.push(1, 1);
      uvs.push(0, 1);

      // Normal pointing outward perpendicular
      const nx = -Math.sin(angle);
      const nz = Math.cos(angle);
      for (let k = 0; k < 4; k++) {
        normals.push(nx, 0.4, nz);
      }

      // Two triangles
      indices.push(baseVertex, baseVertex + 1, baseVertex + 2);
      indices.push(baseVertex, baseVertex + 2, baseVertex + 3);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    return geo;
  }

  /**
   * Generates or loads a high-definition grass tuft texture with alpha silhouette
   */
  private createGrassTexture(): { diffuse: THREE.Texture; alpha: THREE.Texture } {
    const size = 256;

    // Procedural diffuse canvas
    const canvasDiff = document.createElement("canvas");
    canvasDiff.width = size;
    canvasDiff.height = size;
    const ctxD = canvasDiff.getContext("2d");

    // Procedural alpha canvas
    const canvasAlpha = document.createElement("canvas");
    canvasAlpha.width = size;
    canvasAlpha.height = size;
    const ctxA = canvasAlpha.getContext("2d");

    if (ctxD && ctxA) {
      ctxD.fillStyle = "#2d4a1d";
      ctxD.fillRect(0, 0, size, size);

      ctxA.fillStyle = "#000000";
      ctxA.fillRect(0, 0, size, size);

      // Draw dense multi-tone lush stylized grass blades
      const bladeColors = ["#264215", "#3f6212", "#558b1a", "#1f3b0e"];
      const bladeCount = 450;

      for (let b = 0; b < bladeCount; b++) {
        const rootX = (size * 0.1) + Math.random() * (size * 0.8);
        const height = (size * 0.55) + Math.random() * (size * 0.42);
        const curve = (Math.random() - 0.5) * (size * 0.35);
        const tipX = rootX + curve;
        const tipY = size - height;
        const baseWidth = 1.5 + Math.random() * 3;

        const color = bladeColors[Math.floor(Math.random() * bladeColors.length)];

        // Draw blade on diffuse
        ctxD.beginPath();
        ctxD.moveTo(rootX - baseWidth / 2, size);
        ctxD.quadraticCurveTo(rootX + curve * 0.4, size - height * 0.6, tipX, tipY);
        ctxD.quadraticCurveTo(rootX + curve * 0.6 + baseWidth / 2, size - height * 0.4, rootX + baseWidth / 2, size);
        ctxD.closePath();
        ctxD.fillStyle = color;
        ctxD.fill();

        // Draw blade on alpha mask (white = opaque)
        ctxA.beginPath();
        ctxA.moveTo(rootX - baseWidth / 2, size);
        ctxA.quadraticCurveTo(rootX + curve * 0.4, size - height * 0.6, tipX, tipY);
        ctxA.quadraticCurveTo(rootX + curve * 0.6 + baseWidth / 2, size - height * 0.4, rootX + baseWidth / 2, size);
        ctxA.closePath();
        ctxA.fillStyle = "#ffffff";
        ctxA.fill();
      }
    }

    const diffuse = new THREE.CanvasTexture(canvasDiff);
    diffuse.colorSpace = THREE.SRGBColorSpace;
    diffuse.generateMipmaps = true;
    diffuse.minFilter = THREE.LinearMipmapLinearFilter;
    diffuse.magFilter = THREE.LinearFilter;

    const alpha = new THREE.CanvasTexture(canvasAlpha);
    alpha.generateMipmaps = true;
    alpha.minFilter = THREE.LinearMipmapLinearFilter;
    alpha.magFilter = THREE.LinearFilter;

    // Also attempt to load the Poly Haven 4K texture asynchronously if present
    const loader = new THREE.TextureLoader();
    loader.load("/textures/nature/grass_medium_01_diff_4k.jpg", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      this.customMaterial.map = tex;
      this.customMaterial.needsUpdate = true;
    });
    loader.load("/textures/nature/grass_medium_01_alpha_4k.png", (alphaTex) => {
      this.customMaterial.alphaMap = alphaTex;
      this.customMaterial.needsUpdate = true;
    });

    return { diffuse, alpha };
  }

  /**
   * Builds the InstancedMesh with custom wind-sway vertex shader
   */
  private buildGrassMesh(count: number) {
    const geo = this.createCrossQuadGeometry();
    const textures = this.createGrassTexture();

    this.customMaterial = new THREE.MeshStandardMaterial({
      map: textures.diffuse,
      alphaMap: textures.alpha,
      transparent: true,
      alphaTest: 0.50, // Crisp threshold avoids noisy fuzzy screen-door dither
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
      depthWrite: true,
    });

    // Inject wind animation vertex shader
    this.customMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.timeUniform;
      shader.uniforms.uDronePos = this.dronePosUniform;
      shader.uniforms.uWindStrength = this.windStrengthUniform;
      shader.uniforms.uWindDir = this.windDirUniform;

      shader.vertexShader = `
        uniform float uTime;
        uniform vec3 uDronePos;
        uniform float uWindStrength;
        uniform vec2 uWindDir;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>

        // Apply wind sway only to the top vertices (y > 0.05)
        float heightFactor = clamp(position.y / 0.95, 0.0, 1.0);

        // Instance world position
        vec4 instanceWorldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

        // Visibly rolling wind wave ripples across meadows (Stylized and subtle)
        float wave1 = sin(uTime * 1.2 + instanceWorldPos.x * 0.02 + instanceWorldPos.z * 0.02);
        float wave2 = sin(uTime * 0.8 + instanceWorldPos.x * 0.01 - instanceWorldPos.z * 0.01) * 0.5;
        float totalWind = (wave1 + wave2) * 0.15 * heightFactor * uWindStrength;

        transformed.x += totalWind * uWindDir.x;
        transformed.z += totalWind * uWindDir.y;

        // Drone downwash deflection when drone is low overhead
        float distToDrone = distance(instanceWorldPos.xyz, uDronePos);
        if (distToDrone < 14.0) {
          float washStrength = (1.0 - distToDrone / 14.0) * heightFactor;
          vec3 pushDir = normalize(instanceWorldPos.xyz - uDronePos);
          transformed.x += pushDir.x * washStrength * 0.85;
          transformed.z += pushDir.z * washStrength * 0.85;
          transformed.y -= washStrength * 0.35;
        }
        `
      );
    };

    this.instancedMesh = new THREE.InstancedMesh(geo, this.customMaterial, count);
    this.instancedMesh.receiveShadow = true;
    this.instancedMesh.castShadow = true;

    // Initialize instance color attribute for multi-biome palette tinting
    const colorInit = new THREE.Color(0x65a30d);
    for (let i = 0; i < count; i++) {
      this.instancedMesh.setColorAt(i, colorInit);
    }
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    this.repositionGrassGrid(0, 0);
    this.group.add(this.instancedMesh);
  }

  private lastGridCenter = new THREE.Vector2(9999, 9999);

  /**
   * Repositions dense grass tufts within an 85m radius around the drone with
   * biome-specific styling (Lowland, Meadow, Forest Floor, Mountain, Riverbank, Coastal)
   */
  private repositionGrassGrid(centerX: number, centerZ: number) {
    const dummy = new THREE.Object3D();
    const colorObj = new THREE.Color();
    const count = this.instancedMesh.count;
    const gridSide = Math.floor(Math.sqrt(count));
    const spacing = 2.1; // 2.1m spacing covers 350m diameter
    const halfSpan = (gridSide * spacing) / 2;

    let index = 0;
    for (let gx = 0; gx < gridSide && index < count; gx++) {
      for (let gz = 0; gz < gridSide && index < count; gz++) {
        // Jittered grid placement
        const jitterX = (Math.sin(gx * 12.3 + gz * 4.7) * 0.5) * spacing;
        const jitterZ = (Math.cos(gx * 5.1 - gz * 8.9) * 0.5) * spacing;

        const x = centerX - halfSpan + gx * spacing + jitterX;
        const z = centerZ - halfSpan + gz * spacing + jitterZ;

        const distFromCenter = Math.hypot(x - centerX, z - centerZ);
        if (distFromCenter > halfSpan) {
          // Outside circle - hide
          dummy.position.set(0, -999, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(index++, dummy.matrix);
          continue;
        }

        // Avoid runway and all helipads
        const distToRunway = Math.hypot(x - 20, z - (-40));
        let nearHelipad = false;
        for (const hp of HELIPAD_LIST) {
          if (Math.hypot(x - hp.position.x, z - hp.position.z) < 14) {
            nearHelipad = true;
            break;
          }
        }
        if (distToRunway < 26 || nearHelipad) {
          dummy.position.set(0, -999, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(index++, dummy.matrix);
          continue;
        }

        // Avoid Downtown Metropolis city core (streets, plazas, sidewalks)
        if (x >= 580 && x <= 850 && z >= 190 && z <= 460) {
          dummy.position.set(0, -999, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(index++, dummy.matrix);
          continue;
        }

        // Avoid Harbor Industrial Park container docks and shipping platforms
        if (x >= 270 && x <= 520 && z >= 670 && z <= 930) {
          dummy.position.set(0, -999, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(index++, dummy.matrix);
          continue;
        }

        // Exclude all lakes, rivers, plunge pools, and water bodies
        if (isWaterAt(x, z, 3.0)) {
          dummy.position.set(0, -999, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(index++, dummy.matrix);
          continue;
        }

        // Avoid asphalt roads, highways, connectors, mountain switchbacks, and street corridors
        // 8.5m clearance ensures zero grass blades ever penetrate 14m/11m/8m road ribbons
        if (getDistanceToRoad(x, z) < 8.5) {
          dummy.position.set(0, -999, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(index++, dummy.matrix);
          continue;
        }

        const sample = evaluateIslandElevation(x, z);

        // Don't spawn on steep cliff rocks or submerged beaches
        if (sample.elevation < 0.6 || sample.slope > 0.5) {
          dummy.position.set(0, -999, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(index++, dummy.matrix);
          continue;
        }

        // Natural organic clustering: occasional bare earth patches
        const patchNoise = Math.sin(x * 0.05 + z * 0.04) * Math.cos(x * 0.03 - z * 0.06);
        if (patchNoise > 0.68) {
          dummy.position.set(0, -999, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(index++, dummy.matrix);
          continue;
        }

        // Biome Query & Palette Selection
        const biome = getBiomeAt(x, z);
        let heightMultiplier = 1.0;
        const colorVariation = ((Math.sin(gx * 17.1 + gz * 23.9) + 1.0) * 0.5);

        if (biome.primaryBiome === "RIVER_BANK" || biome.distToRiver < 22 || (sample.elevation < 3.0 && isWaterAt(x, z, 14))) {
          // 1. RIVERBANK GRASS: lush vibrant jade riparian greens
          const palette = [0x16a34a, 0x15803d, 0x22c55e, 0x166534];
          colorObj.setHex(palette[Math.floor(colorVariation * palette.length) % palette.length]);
          heightMultiplier = 1.35 + colorVariation * 0.25;
        } else if (biome.primaryBiome === "PELICAN_BEACH" || biome.primaryBiome === "ROCKY_COAST" || biome.distToCoast < 45) {
          // 2. COASTAL GRASS: sun-bleached dune marram grass with golden ochre tints
          const palette = [0xd97706, 0xca8a04, 0x84cc16, 0xb45309];
          colorObj.setHex(palette[Math.floor(colorVariation * palette.length) % palette.length]);
          heightMultiplier = 0.9 + colorVariation * 0.3;
        } else if (sample.elevation > 28 || biome.primaryBiome === "MOUNTAIN_MID" || biome.primaryBiome === "ALPINE_SUMMIT" || biome.primaryBiome === "MOUNTAIN_LOWER") {
          // 3. MOUNTAIN GRASS: hardy alpine tussocks & slate-tinted tundra moss
          const palette = [0x64748b, 0x78716c, 0xa8a29e, 0x57534e];
          colorObj.setHex(palette[Math.floor(colorVariation * palette.length) % palette.length]);
          heightMultiplier = 0.55 + colorVariation * 0.2;
        } else if (biome.primaryBiome === "FOREST_CORE" || biome.primaryBiome === "FOREST_EDGE") {
          // 4. FOREST FLOOR: deep shaded conifer moss & understory woodland greens
          const palette = [0x2d4a1d, 0x365314, 0x3f6212, 0x1a3311];
          colorObj.setHex(palette[Math.floor(colorVariation * palette.length) % palette.length]);
          heightMultiplier = 0.75 + colorVariation * 0.2;
        } else if (biome.primaryBiome === "LOWLAND_MEADOW" || biome.primaryBiome === "RURAL_PASTURE") {
          // 5. MEADOW GRASS: lush flowering pasture emeralds
          const palette = [0x65a30d, 0x84cc16, 0xa3e635, 0x4d7c0f];
          colorObj.setHex(palette[Math.floor(colorVariation * palette.length) % palette.length]);
          heightMultiplier = 1.15 + colorVariation * 0.3;
        } else {
          // 6. LOWLAND GRASS: balanced natural turf
          const palette = [0x4d7c0f, 0x65a30d, 0x558b1a, 0x3f6212];
          colorObj.setHex(palette[Math.floor(colorVariation * palette.length) % palette.length]);
          heightMultiplier = 1.0 + colorVariation * 0.2;
        }

        // Distance fade at outer perimeter
        const fade = Math.max(0.3, 1.0 - (distFromCenter / halfSpan) * 0.5);
        const scale = (0.95 + Math.abs(Math.sin(gx * 3.3 + gz)) * 0.45) * fade;

        dummy.position.set(x, sample.elevation, z);
        dummy.rotation.set(
          (Math.sin(gx) * 0.08),
          (gx * 17 + gz * 23) % Math.PI,
          (Math.cos(gz) * 0.08)
        );
        dummy.scale.set(scale, scale * heightMultiplier, scale);
        dummy.updateMatrix();

        this.instancedMesh.setMatrixAt(index, dummy.matrix);
        this.instancedMesh.setColorAt(index, colorObj);
        index++;
      }
    }

    // Hide any remaining instances
    while (index < count) {
      dummy.position.set(0, -999, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(index++, dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
    this.lastGridCenter.set(centerX, centerZ);
  }

  /**
   * Update wind swaying and drone downwash displacement every frame,
   * synchronized with global wind state, and dynamically shift the grass clipmap
   */
  public update(_dt: number, elapsed: number, dronePos?: THREE.Vector3) {
    this.timeUniform.value = elapsed;

    // Sync with global wind state
    const env = EnvironmentManager.getInstance();
    const windSpeed = env.state.windSpeed;
    // Map wind speed: calm (<1.5m/s) -> 0.4, normal (3.5m/s) -> 1.0, storm (12m/s) -> 2.4
    this.windStrengthUniform.value = Math.max(0.3, Math.min(2.5, windSpeed / 3.4));

    const rad = THREE.MathUtils.degToRad(env.state.windDirectionDeg);
    this.windDirUniform.value.set(Math.sin(rad), Math.cos(rad));

    if (dronePos) {
      this.dronePosUniform.value.copy(dronePos);

      // Reposition grass clipmap around the drone when moving > 4.5m
      const distMoved = this.lastGridCenter.distanceTo(new THREE.Vector2(dronePos.x, dronePos.z));
      if (distMoved > 4.5) {
        this.repositionGrassGrid(dronePos.x, dronePos.z);
      }
    }
  }
}
