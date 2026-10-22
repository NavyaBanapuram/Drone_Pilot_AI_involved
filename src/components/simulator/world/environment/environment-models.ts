// ==========================================================
// DRONE PILOT — ENVIRONMENT MODEL ARCHITECTURE & GEOMETRY GENERATORS
// High-detail organic silhouettes: Scots Pine, Norway Spruce,
// Deciduous Oak, Mountain Birch, Coastal Palm, River Willow,
// Snag Deadwood, Boulders, Scree, River Cobblestones, Logs & Props
// ==========================================================

import * as THREE from "three";
import { WorldMaterials } from "../world-materials";

/**
 * Cleanly merges an array of BufferGeometries into a single BufferGeometry
 */
export function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) return new THREE.BufferGeometry();
  if (geometries.length === 1) return geometries[0].clone();

  let totalPositions = 0;
  let totalNormals = 0;
  let totalUvs = 0;
  let totalIndices = 0;

  for (const g of geometries) {
    const pos = g.getAttribute("position");
    if (pos) totalPositions += pos.count * 3;

    const norm = g.getAttribute("normal");
    if (norm) totalNormals += norm.count * 3;

    const uv = g.getAttribute("uv");
    if (uv) totalUvs += uv.count * 2;

    if (g.index) {
      totalIndices += g.index.count;
    } else if (pos) {
      totalIndices += pos.count;
    }
  }

  const mergedPos = new Float32Array(totalPositions);
  const mergedNorm = new Float32Array(totalNormals);
  const mergedUv = totalUvs > 0 ? new Float32Array(totalUvs) : null;
  const mergedIndices: number[] = [];

  let posOffset = 0;
  let normOffset = 0;
  let uvOffset = 0;
  let vertexOffset = 0;

  for (const g of geometries) {
    const pos = g.getAttribute("position");
    const norm = g.getAttribute("normal");
    const uv = g.getAttribute("uv");

    if (pos) {
      mergedPos.set(pos.array, posOffset);
      posOffset += pos.count * 3;
    }

    if (norm) {
      mergedNorm.set(norm.array, normOffset);
      normOffset += norm.count * 3;
    }

    if (uv && mergedUv) {
      mergedUv.set(uv.array, uvOffset);
      uvOffset += uv.count * 2;
    }

    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        mergedIndices.push(g.index.getX(i) + vertexOffset);
      }
    } else if (pos) {
      for (let i = 0; i < pos.count; i++) {
        mergedIndices.push(i + vertexOffset);
      }
    }

    if (pos) vertexOffset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(mergedPos, 3));
  if (totalNormals > 0) {
    merged.setAttribute("normal", new THREE.BufferAttribute(mergedNorm, 3));
  } else {
    merged.computeVertexNormals();
  }
  if (mergedUv) {
    merged.setAttribute("uv", new THREE.BufferAttribute(mergedUv, 2));
  }
  merged.setIndex(mergedIndices);
  return merged;
}

// ==========================================================
// 1. PBR MATERIALS
// ==========================================================
export const ENV_MATERIALS = {
  // Conifer Bark: Rich weathered reddish-brown pine bark
  barkPine: new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    roughness: 0.94,
    metalness: 0.05,
    flatShading: true,
  }),

  // Deciduous Bark: Neutral grayish-brown oak bark
  barkOak: new THREE.MeshStandardMaterial({
    color: 0x423d38,
    roughness: 0.90,
    metalness: 0.05,
    flatShading: true,
  }),

  // Birch Bark: Pale silvery chalk-white with dark markings
  barkBirch: new THREE.MeshStandardMaterial({
    color: 0xd6d1ca,
    roughness: 0.82,
    metalness: 0.08,
    flatShading: true,
  }),

  // Palm Bark: Ringed fibrous brown
  barkPalm: new THREE.MeshStandardMaterial({
    color: 0x5a4635,
    roughness: 0.88,
    metalness: 0.04,
  }),

  // Deadwood Snag: Sun-bleached slate gray
  barkDeadwood: new THREE.MeshStandardMaterial({
    color: 0x565c63,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  }),

  // Pine Needles: Deep emerald conifer needle foliage
  foliagePine: new THREE.MeshStandardMaterial({
    color: 0x1a3a22,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  }),

  // Spruce Needles: Slightly blue-tinted dark forest spruce foliage
  foliageSpruce: new THREE.MeshStandardMaterial({
    color: 0x18342a,
    roughness: 0.88,
    metalness: 0.05,
    flatShading: true,
  }),

  // Oak Leaves: Vibrant natural olive-green summer oak foliage
  foliageOak: new THREE.MeshStandardMaterial({
    color: 0x2b4a1f,
    roughness: 0.78,
    metalness: 0.05,
    flatShading: true,
  }),

  // Birch Leaves: Delicate airy golden-tinged spring green
  foliageBirch: new THREE.MeshStandardMaterial({
    color: 0x486b2b,
    roughness: 0.75,
    metalness: 0.05,
    flatShading: true,
  }),

  // River Willow: Soft drooping sage green
  foliageWillow: new THREE.MeshStandardMaterial({
    color: 0x3d5c31,
    roughness: 0.82,
    metalness: 0.05,
    flatShading: true,
  }),

  // Palm Fronds: Rich tropical glossy green
  foliagePalm: new THREE.MeshStandardMaterial({
    color: 0x245422,
    roughness: 0.65,
    metalness: 0.10,
    side: THREE.DoubleSide,
  }),

  // Understory Shrub: Dense green undergrowth
  foliageShrub: new THREE.MeshStandardMaterial({
    color: 0x22421b,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  }),

  // Fern Leaf: Bright forest floor green
  fernLeaf: new THREE.MeshStandardMaterial({
    color: 0x2f6622,
    roughness: 0.70,
    metalness: 0.05,
    side: THREE.DoubleSide,
  }),

  // Reeds & Bulrushes: Golden-green marsh reeds with brown cattail tops
  reedMarsh: new THREE.MeshStandardMaterial({
    color: 0x556b2f,
    roughness: 0.80,
    metalness: 0.05,
    side: THREE.DoubleSide,
  }),

  // Granite Boulder: Glacial speckled natural granite
  rockGranite: WorldMaterials.rock,

  // Mountain Scree: Weathered alpine gray talus
  rockScree: WorldMaterials.rock,

  // River Cobblestone: Smooth weathered river stone
  rockRiver: WorldMaterials.rock,

  // Coastal Sea Stack: Algae/salt-weathered sandstone
  rockCoastal: WorldMaterials.rock,

  // Fallen Log & Stumps: Moss-tinged wet bark
  woodLog: new THREE.MeshStandardMaterial({
    color: 0x3a3028,
    roughness: 0.90,
    metalness: 0.05,
    flatShading: true,
  }),

  // Driftwood: Salt-bleached weathered white-gray
  woodDrift: new THREE.MeshStandardMaterial({
    color: 0x8c8983,
    roughness: 0.92,
    metalness: 0.05,
    flatShading: true,
  }),

  // Timber Mooring Post & Fences: Rustic creosote-treated wood
  woodFence: new THREE.MeshStandardMaterial({
    color: 0x483a2d,
    roughness: 0.88,
    metalness: 0.05,
  }),
};

// Global wind sway uniform for foliage
export const FOLIAGE_WIND_UNIFORM = { value: 0 };

function applyFoliageWind(mat: THREE.MeshStandardMaterial, swayIntensity: number = 0.22) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFoliageWind = FOLIAGE_WIND_UNIFORM;
    shader.vertexShader = `
      uniform float uFoliageWind;
      ${shader.vertexShader}
    `;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      // Apply wind sway to tree canopies and foliage
      float h = max(0.0, position.y);
      float sway = sin(uFoliageWind * 1.8 + position.x * 0.35 + position.z * 0.25) * ${swayIntensity.toFixed(2)} * (0.2 + h * 0.08);
      float swayZ = cos(uFoliageWind * 1.3 + position.x * 0.2 - position.z * 0.3) * ${(swayIntensity * 0.7).toFixed(2)} * (0.2 + h * 0.08);
      transformed.x += sway;
      transformed.z += swayZ;
      `
    );
  };
}

// Hook wind shader into foliage AND bark materials so the trunk doesn't detach from leaves
applyFoliageWind(ENV_MATERIALS.foliagePine, 0.18);
applyFoliageWind(ENV_MATERIALS.barkPine, 0.18);

applyFoliageWind(ENV_MATERIALS.foliageSpruce, 0.16);
// Spruce shares barkPine, so it's already hooked.

applyFoliageWind(ENV_MATERIALS.foliageOak, 0.24);
applyFoliageWind(ENV_MATERIALS.barkOak, 0.24);

applyFoliageWind(ENV_MATERIALS.foliageBirch, 0.28);
applyFoliageWind(ENV_MATERIALS.barkBirch, 0.28);

applyFoliageWind(ENV_MATERIALS.foliageWillow, 0.32);
applyFoliageWind(ENV_MATERIALS.foliagePalm, 0.25);
applyFoliageWind(ENV_MATERIALS.barkPalm, 0.25);

applyFoliageWind(ENV_MATERIALS.foliageShrub, 0.15);
applyFoliageWind(ENV_MATERIALS.fernLeaf, 0.20);
applyFoliageWind(ENV_MATERIALS.reedMarsh, 0.30);


// ==========================================================
// 2. GEOMETRY GENERATORS
// ==========================================================

export const ENV_GEOMETRIES = {
  // Scots Pine: 26m conifer with tall trunk, high umbrella boughs
  buildScotsPine: (): { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } => {
    const trunk = new THREE.CylinderGeometry(0.55, 1.25, 26, 8);
    trunk.translate(0, 13, 0);

    const foliagePieces: THREE.BufferGeometry[] = [];
    const boughs = [
      { y: 13.0, r: 6.8, h: 5.5, offX: 0.8, offZ: -0.5 },
      { y: 16.5, r: 6.2, h: 5.0, offX: -0.6, offZ: 0.7 },
      { y: 19.8, r: 5.4, h: 4.8, offX: 0.4, offZ: 0.4 },
      { y: 22.8, r: 4.2, h: 4.2, offX: -0.2, offZ: -0.3 },
      { y: 25.0, r: 2.6, h: 3.5, offX: 0.0, offZ: 0.0 },
    ];

    for (const b of boughs) {
      const cone = new THREE.ConeGeometry(b.r, b.h, 7);
      cone.translate(b.offX, b.y + b.h / 2, b.offZ);
      foliagePieces.push(cone);
    }

    return { trunk, foliage: mergeGeometries(foliagePieces) };
  },

  // Norway Spruce: 28.5m tiered spire conifer with 7 jagged downward boughs
  buildNorwaySpruce: (): { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } => {
    const trunk = new THREE.CylinderGeometry(0.48, 1.18, 28.5, 8);
    trunk.translate(0, 14.25, 0);

    const foliagePieces: THREE.BufferGeometry[] = [];
    const tiers = [
      { y: 5.5, r: 7.8, h: 6.2 },
      { y: 9.5, r: 6.8, h: 5.8 },
      { y: 13.5, r: 5.8, h: 5.2 },
      { y: 17.5, r: 4.8, h: 4.6 },
      { y: 21.0, r: 3.6, h: 4.0 },
      { y: 24.2, r: 2.4, h: 3.4 },
      { y: 26.8, r: 1.3, h: 2.8 },
    ];

    for (const t of tiers) {
      const cone = new THREE.ConeGeometry(t.r, t.h, 8);
      cone.translate(0, t.y + t.h / 2, 0);
      foliagePieces.push(cone);
    }

    return { trunk, foliage: mergeGeometries(foliagePieces) };
  },

  // Mature Broadleaf Oak: 22m spreading limbs, 4 branch forks, organic foliage clusters
  buildBroadleafOak: (): { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } => {
    const trunkPieces: THREE.BufferGeometry[] = [];
    const baseTrunk = new THREE.CylinderGeometry(0.85, 1.65, 12, 8);
    baseTrunk.translate(0, 6, 0);
    trunkPieces.push(baseTrunk);

    // 4 major limbs
    const limbs = [
      { len: 8, r: 0.55, pitch: 0.65, yaw: 0.2, y: 9 },
      { len: 8, r: 0.52, pitch: 0.60, yaw: 1.8, y: 10 },
      { len: 8, r: 0.50, pitch: 0.62, yaw: 3.3, y: 10.5 },
      { len: 7, r: 0.48, pitch: 0.58, yaw: 4.9, y: 11 },
    ];

    for (const l of limbs) {
      const limbGeo = new THREE.CylinderGeometry(l.r * 0.65, l.r, l.len, 6);
      limbGeo.translate(0, l.len / 2, 0);
      limbGeo.rotateZ(l.pitch);
      limbGeo.rotateY(l.yaw);
      limbGeo.translate(0, l.y, 0);
      trunkPieces.push(limbGeo);
    }

    // Foliage masses: 5 faceted clusters surrounding limbs
    const foliagePieces: THREE.BufferGeometry[] = [];
    const clumps = [
      { x: 3.8, y: 16.5, z: 1.2, r: 6.2 },
      { x: -3.5, y: 17.0, z: 2.8, r: 5.8 },
      { x: -2.2, y: 17.5, z: -3.8, r: 5.5 },
      { x: 2.8, y: 17.8, z: -2.9, r: 5.6 },
      { x: 0.0, y: 20.0, z: 0.0, r: 6.8 },
    ];

    for (const c of clumps) {
      const clumpGeo = new THREE.DodecahedronGeometry(c.r, 1);
      clumpGeo.scale(1.2, 0.85, 1.1);
      clumpGeo.translate(c.x, c.y, c.z);
      foliagePieces.push(clumpGeo);
    }

    return { trunk: mergeGeometries(trunkPieces), foliage: mergeGeometries(foliagePieces) };
  },

  // Mountain Birch: 16.5m slender white trunk with airy crown
  buildMountainBirch: (): { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } => {
    const trunk = new THREE.CylinderGeometry(0.32, 0.65, 16.5, 7);
    trunk.translate(0, 8.25, 0);

    const foliagePieces: THREE.BufferGeometry[] = [];
    const masses = [
      { y: 10.5, r: 3.4, offX: 0.6, offZ: -0.4 },
      { y: 13.0, r: 3.6, offX: -0.5, offZ: 0.5 },
      { y: 15.2, r: 2.8, offX: 0.2, offZ: 0.2 },
    ];

    for (const m of masses) {
      const geo = new THREE.DodecahedronGeometry(m.r, 1);
      geo.scale(1.1, 1.35, 1.1);
      geo.translate(m.offX, m.y, m.offZ);
      foliagePieces.push(geo);
    }

    return { trunk, foliage: mergeGeometries(foliagePieces) };
  },

  // Coastal Palm: 14m curved trunk with 12 radiating fan fronds
  buildCoastalPalm: (): { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } => {
    const trunkPieces: THREE.BufferGeometry[] = [];
    const segments = 6;
    let currY = 0;
    let currX = 0;

    for (let i = 0; i < segments; i++) {
      const segH = 2.3;
      const r = 0.45 - (i / segments) * 0.18;
      const seg = new THREE.CylinderGeometry(r * 0.9, r, segH, 8);
      seg.translate(0, segH / 2, 0);
      seg.rotateZ(0.08);
      seg.translate(currX, currY, 0);
      trunkPieces.push(seg);
      currY += segH * 0.96;
      currX += 0.24;
    }

    // 12 radiating fronds
    const frondPieces: THREE.BufferGeometry[] = [];
    const frondCount = 12;
    for (let i = 0; i < frondCount; i++) {
      const ang = (i / frondCount) * Math.PI * 2;
      const frond = new THREE.PlaneGeometry(0.85, 4.2, 2, 4);
      frond.translate(0, 2.1, 0);
      frond.rotateX(0.75); // droop outward
      frond.rotateY(ang);
      frond.translate(currX, currY, 0);
      frondPieces.push(frond);
    }

    return { trunk: mergeGeometries(trunkPieces), foliage: mergeGeometries(frondPieces) };
  },

  // River Willow: 18m riparian trunk with cascading weeping branches
  buildRiverWillow: (): { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } => {
    const trunk = new THREE.CylinderGeometry(0.65, 1.40, 14, 8);
    trunk.translate(0, 7, 0);

    const foliagePieces: THREE.BufferGeometry[] = [];
    const crown = new THREE.DodecahedronGeometry(7.5, 1);
    crown.scale(1.2, 0.75, 1.2);
    crown.translate(0, 15, 0);
    foliagePieces.push(crown);

    // Weeping drops
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const drop = new THREE.CylinderGeometry(1.2, 1.8, 6.0, 6);
      drop.translate(Math.cos(ang) * 5.2, 11, Math.sin(ang) * 5.2);
      foliagePieces.push(drop);
    }

    return { trunk, foliage: mergeGeometries(foliagePieces) };
  },

  // Deadwood Snag: 15m weathered lightning-struck tree with broken jagged limbs
  buildDeadwoodSnag: (): THREE.BufferGeometry => {
    const pieces: THREE.BufferGeometry[] = [];
    const main = new THREE.CylinderGeometry(0.42, 0.95, 15, 7);
    main.translate(0, 7.5, 0);
    pieces.push(main);

    // Snapped jagged branches
    const branches = [
      { len: 4.5, r: 0.28, pitch: 0.75, yaw: 0.8, y: 8.5 },
      { len: 3.8, r: 0.25, pitch: 0.65, yaw: 2.9, y: 11.0 },
      { len: 2.5, r: 0.20, pitch: 0.85, yaw: 4.5, y: 13.0 },
    ];

    for (const b of branches) {
      const br = new THREE.CylinderGeometry(b.r * 0.5, b.r, b.len, 5);
      br.translate(0, b.len / 2, 0);
      br.rotateZ(b.pitch);
      br.rotateY(b.yaw);
      br.translate(0, b.y, 0);
      pieces.push(br);
    }

    return mergeGeometries(pieces);
  },

  // Understory Shrub: 2.8m broadleaf forest bush
  buildDogwoodShrub: (): THREE.BufferGeometry => {
    const pieces: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.DodecahedronGeometry(1.3, 1);
      s.scale(1.1, 0.85, 1.0);
      s.translate((i - 1) * 0.65, 1.2 + (i % 2) * 0.35, ((i * 2) % 3 - 1) * 0.45);
      pieces.push(s);
    }
    return mergeGeometries(pieces);
  },

  // Alpine Krummholz Juniper: 1.4m spreading prostrate shrub
  buildAlpineJuniper: (): THREE.BufferGeometry => {
    const pieces: THREE.BufferGeometry[] = [];
    const base = new THREE.DodecahedronGeometry(1.8, 1);
    base.scale(1.5, 0.45, 1.4);
    base.translate(0, 0.65, 0);
    pieces.push(base);
    return mergeGeometries(pieces);
  },

  // Forest Sword Fern: 1.2m arching 8-frond cluster
  buildForestFern: (): THREE.BufferGeometry => {
    const pieces: THREE.BufferGeometry[] = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const frond = new THREE.PlaneGeometry(0.35, 1.4, 1, 3);
      frond.translate(0, 0.7, 0);
      frond.rotateX(0.55); // arch outward
      frond.rotateY(ang);
      pieces.push(frond);
    }
    return mergeGeometries(pieces);
  },

  // Freshwater Reeds / Bulrushes: 2.2m vertical reed bundle
  buildRiverReeds: (): THREE.BufferGeometry => {
    const pieces: THREE.BufferGeometry[] = [];
    const stems = 7;
    for (let i = 0; i < stems; i++) {
      const ang = (i / stems) * Math.PI * 2;
      const dist = 0.15 + (i % 3) * 0.1;
      const reed = new THREE.CylinderGeometry(0.02, 0.035, 2.2, 4);
      reed.translate(Math.cos(ang) * dist, 1.1, Math.sin(ang) * dist);
      pieces.push(reed);
    }
    return mergeGeometries(pieces);
  },

  // Granite Giant Boulder: 4.8m weathered multi-faceted rock
  buildGraniteBoulder: (): THREE.BufferGeometry => {
    const geo = new THREE.DodecahedronGeometry(3.5, 1);
    geo.scale(1.35, 0.95, 1.15);
    // Deform vertices slightly to avoid spherical looks
    const pos = geo.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < 0) {
        pos.setY(i, y * 0.55); // flatten base for solid grounding
      }
    }
    geo.computeVertexNormals();
    return geo;
  },

  // Mountain Scree Fragment: 1.8m angular talus rock
  buildMountainScree: (): THREE.BufferGeometry => {
    const geo = new THREE.TetrahedronGeometry(1.6, 1);
    geo.scale(1.2, 0.75, 1.1);
    geo.computeVertexNormals();
    return geo;
  },

  // River Pebble Bed: 0.6m rounded smooth stones
  buildRiverPebbleBed: (): THREE.BufferGeometry => {
    const pieces: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const pebble = new THREE.SphereGeometry(0.35 + (i % 2) * 0.15, 6, 5);
      pebble.scale(1.2, 0.55, 0.9);
      pebble.translate(Math.cos(ang) * 0.65, 0.2, Math.sin(ang) * 0.65);
      pieces.push(pebble);
    }
    return mergeGeometries(pieces);
  },

  // Coastal Sea Stack: 6.5m marine crag
  buildSeaStackBoulder: (): THREE.BufferGeometry => {
    const geo = new THREE.CylinderGeometry(1.8, 3.2, 6.5, 7);
    geo.translate(0, 3.25, 0);
    geo.computeVertexNormals();
    return geo;
  },

  // Fallen Mossy Log: 6m long timber log with broken roots
  buildFallenLog: (): THREE.BufferGeometry => {
    const pieces: THREE.BufferGeometry[] = [];
    const log = new THREE.CylinderGeometry(0.45, 0.65, 6.0, 7);
    log.rotateZ(Math.PI / 2);
    log.translate(0, 0.55, 0);
    pieces.push(log);

    // Root flare at butt end
    const flare = new THREE.ConeGeometry(1.1, 1.2, 6);
    flare.rotateZ(-Math.PI / 2);
    flare.translate(-3.2, 0.55, 0);
    pieces.push(flare);

    return mergeGeometries(pieces);
  },

  // Weathered Tree Stump: 1.4m cut/jagged stump
  buildTreeStump: (): THREE.BufferGeometry => {
    const stump = new THREE.CylinderGeometry(0.65, 0.95, 1.4, 8);
    stump.translate(0, 0.7, 0);
    return stump;
  },

  // Beach Driftwood: 4.5m bleached crooked timber
  buildDriftwood: (): THREE.BufferGeometry => {
    const drift = new THREE.CylinderGeometry(0.25, 0.45, 4.5, 6);
    drift.rotateZ(Math.PI / 2 + 0.12);
    drift.translate(0, 0.35, 0);
    return drift;
  },

  // Coastal Mooring Posts: 2.8m harbor timber pilings (cluster of 3)
  buildCoastalMooringPost: (): THREE.BufferGeometry => {
    const pieces: THREE.BufferGeometry[] = [];
    const heights = [2.8, 2.4, 2.0];
    const offsets = [
      { x: 0, z: 0 },
      { x: 0.45, z: 0.25 },
      { x: -0.35, z: 0.35 },
    ];
    for (let i = 0; i < 3; i++) {
      const post = new THREE.CylinderGeometry(0.22, 0.24, heights[i], 8);
      post.translate(offsets[i].x, heights[i] / 2, offsets[i].z);
      pieces.push(post);
    }
    return mergeGeometries(pieces);
  },

  // Split-Rail Fence: 3.2m rustic cedar fence segment
  buildSplitRailFence: (): THREE.BufferGeometry => {
    const pieces: THREE.BufferGeometry[] = [];
    // 2 vertical posts
    [-1.5, 1.5].forEach((x) => {
      const post = new THREE.CylinderGeometry(0.09, 0.11, 1.2, 6);
      post.translate(x, 0.6, 0);
      pieces.push(post);
    });
    // 2 horizontal rails
    [0.45, 0.85].forEach((y) => {
      const rail = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 5);
      rail.rotateZ(Math.PI / 2);
      rail.translate(0, y, 0);
      pieces.push(rail);
    });
    return mergeGeometries(pieces);
  },
};
