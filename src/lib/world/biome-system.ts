// ==========================================================
// DRONE PILOT â€” DETERMINISTIC BIOME ENGINE & PLACEMENT SYSTEM
// Seeded PRNG, multi-factor ecological biome classifier,
// terrain slope gradient calculations, and soft road clearance
// ==========================================================

import { evaluateIslandElevation } from "./terrain-math";
import { HELIPADS } from "./helipad-definitions";
import { EnvironmentBiome } from "./environment-asset-registry";
import { getDistanceToCoast } from "./coastline-math";

export const WORLD_SEED = 421337;

/**
 * Fast, robust 32-bit Mulberry32 seeded pseudo-random number generator
 */
export class SeededPRNG {
  private state: number;

  constructor(seed: number = WORLD_SEED) {
    this.state = seed >>> 0;
  }

  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max + 1));
  }
}

/**
 * Deterministic spatial hash function returning [0.0, 1.0) for any world coordinate
 */
export function spatialHash2D(x: number, z: number, offsetSeed = 0): number {
  const ix = Math.floor(x * 100);
  const iz = Math.floor(z * 100);
  let h = (ix * 374761393 + iz * 668265263 + (WORLD_SEED + offsetSeed) * 314159265) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface BiomeSample {
  primaryBiome: EnvironmentBiome;
  elevation: number;
  slopeDegrees: number;
  distToCoast: number;
  distToRiver: number;
  distToLake: number;
  canSupportTrees: boolean;
  canSupportFoliage: boolean;
}

/**
 * Computes terrain slope in degrees using central differences on the canonical elevation field
 */
export function computeTerrainSlope(x: number, z: number, step = 1.5): number {
  const hL = evaluateIslandElevation(x - step, z).elevation;
  const hR = evaluateIslandElevation(x + step, z).elevation;
  const hD = evaluateIslandElevation(x, z - step).elevation;
  const hU = evaluateIslandElevation(x, z + step).elevation;

  const dx = (hR - hL) / (2 * step);
  const dz = (hU - hD) / (2 * step);
  const gradient = Math.sqrt(dx * dx + dz * dz);
  return (Math.atan(gradient) * 180) / Math.PI;
}

/**
 * Canonical road centerline polylines used for clearance checking
 */
const ROAD_CORRIDORS: Array<Array<{ x: number; z: number }>> = [
  // Highway 1: Metropolis to Harbor Parkway (14m width)
  [
    { x: 640, z: 240 },
    { x: 640, z: 380 },
    { x: 580, z: 540 },
    { x: 460, z: 680 },
    { x: 380, z: 780 },
    { x: 260, z: 860 },
    { x: 60, z: 880 },
  ],
  // Highway 2: Academy to Metropolis Expressway (11m width)
  [
    { x: 50, z: 0 },
    { x: 180, z: 60 },
    { x: 360, z: 160 },
    { x: 540, z: 240 },
    { x: 640, z: 320 },
  ],
  // Forest Road: West bridge abutment to Forest Ranger Station
  [
    { x: -180, z: 140 },
    { x: -300, z: 70 },
    { x: -440, z: 10 },
    { x: -620, z: -40 },
  ],
  // Academy to East Bridge Abutment Approach
  [
    { x: -50, z: 0 },
    { x: -50, z: 60 },
    { x: -75, z: 120 },
    { x: -100, z: 180 },
  ],
  // Grand Valley Suspension Bridge
  [
    { x: -100, z: 180 },
    { x: -180, z: 140 },
  ],
  // West Pelican Coastal Highway (West bridge abutment to Pelican Cove)
  [
    { x: -180, z: 140 },
    { x: -320, z: 340 },
    { x: -540, z: 480 },
    { x: -720, z: 560 },
  ],
  // Southern Coastal Highway West (Pelican Cove to Estuary Bridge)
  [
    { x: -720, z: 560 },
    { x: -580, z: 660 },
    { x: -400, z: 740 },
    { x: -260, z: 800 },
    { x: -140, z: 840 },
  ],
  // Southern Estuary Bridge Viaduct
  [
    { x: -140, z: 840 },
    { x: -40, z: 860 },
  ],
  // Southern Coastal Highway East (Estuary Bridge to Harbor Highway)
  [
    { x: -40, z: 860 },
    { x: 60, z: 880 },
  ],
  // Mountain Pass Switchbacks: Mount Apex Weather Station
  [
    { x: -80, z: -80 },
    { x: -160, z: -140 },
    { x: -180, z: -210 },
    { x: -200, z: -310 },
    { x: -260, z: -390 },
    { x: -400, z: -460 },
    { x: -500, z: -510 },
    { x: -580, z: -560 },
  ],
  // Downtown Metropolis Grid: Avenue 1 (West)
  [
    { x: 640, z: 190 },
    { x: 640, z: 450 },
  ],
  // Downtown Metropolis Grid: Avenue 2 (East)
  [
    { x: 780, z: 190 },
    { x: 780, z: 450 },
  ],
  // Downtown Metropolis Grid: Cross Street 1 (North)
  [
    { x: 600, z: 240 },
    { x: 820, z: 240 },
  ],
  // Downtown Metropolis Grid: Cross Street 2 (South)
  [
    { x: 600, z: 400 },
    { x: 820, z: 400 },
  ],
];

const TURNAROUND_APRONS = [
  { x: -620, z: -40, radius: 18 },
  { x: -720, z: 560, radius: 22 },
  { x: -580, z: -560, radius: 16 },
  { x: -50, z: 0, radius: 16 },
];

/**
 * Computes minimum distance from (x, z) to any paved road centerline or turnaround edge
 */
export function getDistanceToRoad(x: number, z: number): number {
  let minDist = 9999;
  
  // 1. Check primary defined polylines
  for (const corridor of ROAD_CORRIDORS) {
    for (let i = 0; i < corridor.length - 1; i++) {
      const p1 = corridor[i];
      const p2 = corridor[i + 1];
      const dist = distToSegment(x, z, p1.x, p1.z, p2.x, p2.z);
      if (dist < minDist) minDist = dist;
    }
  }
  
  // 2. Check turnarounds
  for (const t of TURNAROUND_APRONS) {
    const distCenter = Math.hypot(x - t.x, z - t.z);
    const distEdge = Math.max(0, distCenter - t.radius);
    if (distEdge < minDist) minDist = distEdge;
  }
  
  // 3. Check City Downtown Grid (Avenues & Cross Streets)
  // These are procedurally generated in city-district-system.ts but mathematically fixed
  const avenuesX = [540, 640, 740, 840, 940];
  const streetsZ = [120, 200, 280, 360, 440, 520, 600, 680];
  
  // If within the city bounds roughly
  if (x > 450 && x < 1000 && z > 50 && z < 600) {
     for (const ax of avenuesX) {
       const dist = Math.abs(x - ax);
       if (dist < minDist) minDist = dist;
     }
     for (const sz of streetsZ) {
       const dist = Math.abs(z - sz);
       if (dist < minDist) minDist = dist;
     }
  }
  
  return minDist;
}

function distToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
  if (l2 === 0) return Math.hypot(px - x1, pz - z1);
  let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), pz - (z1 + t * (z2 - z1)));
}

/**
 * Strict hydrology query: returns true if (x, z) lies within or directly adjacent to any body of water
 * (Ocean, Crystal Lake, Mountain Waterfall plunge pool, or Winding River corridor)
 */
export function isWaterLocation(x: number, z: number, margin = 2.0): boolean {
  // 1. Ocean Water (distance to coast or low elevation near coast)
  const distCoast = getDistanceToCoast(x, z);
  if (distCoast <= margin) {
    return true;
  }
  const elev = evaluateIslandElevation(x, z).elevation;
  if (elev <= 0.25) {
    return true;
  }

  // 2. Crystal Mountain Lake (basin center at -320, -260 with 110m radius + margin)
  const distLake = Math.hypot(x - (-320), z - (-260));
  if (distLake < 122 + margin) {
    return true;
  }

  // 3. Mountain Waterfall Cliff Face & Plunge Pool (-260, -205)
  const distWaterfall = Math.hypot(x - (-260), z - (-205));
  if (distWaterfall < 22 + margin) {
    return true;
  }

  // 4. Winding River Corridor (-210 to 950)
  const riverZStart = -210;
  const riverZEnd = 950;
  if (z >= riverZStart - 15 && z <= riverZEnd + 15) {
    const p = Math.max(0, Math.min(1, (z - riverZStart) / (riverZEnd - riverZStart)));
    const riverCenterX = -270 + p * 190 + Math.sin(p * Math.PI * 2.5) * 45 + Math.cos(p * Math.PI * 6.0) * 8;
    const halfWidth = 12 + p * 18;
    const distFromRiverCenter = Math.abs(x - riverCenterX);
    if (distFromRiverCenter < halfWidth + 4.0 + margin) {
      return true;
    }
  }

  return false;
}

/**
 * Returns true if (x, z) lies within an exclusion zone (runway, helipad, city core, industrial park, or water bodies)
 */
export function isProtectedZone(x: number, z: number, extraBuffer = 0): boolean {
  // 1. Central Flight Academy Runway 09/27 & Taxiways
  if (x >= -40 - extraBuffer && x <= 90 + extraBuffer && z >= -220 - extraBuffer && z <= 120 + extraBuffer) {
    return true;
  }

  // 2. All Registered Helipads
  for (const pad of Object.values(HELIPADS)) {
    const radius = (pad.dimensions?.radius || 7) + (pad.id === "mountain-alpha" ? 65 : 40) + extraBuffer;
    if (Math.hypot(x - pad.position.x, z - pad.position.z) < radius) {
      return true;
    }
  }

  // 3. Downtown Metropolis Core
  if (x >= 570 - extraBuffer && x <= 920 + extraBuffer && z >= 190 - extraBuffer && z <= 480 + extraBuffer) {
    return true;
  }

  // 4. Harbor Industrial Park
  if (x >= 270 - extraBuffer && x <= 510 + extraBuffer && z >= 660 - extraBuffer && z <= 940 + extraBuffer) {
    return true;
  }

  // 5. Hydrologic Water Exclusion (Strictly guarantees trees, shrubs & rocks never spawn in water)
  if (isWaterLocation(x, z, extraBuffer)) {
    return true;
  }

  return false;
}

/**
 * Evaluates the full ecological biome classification for any island coordinate (x, z)
 */
export function getBiomeAt(x: number, z: number): BiomeSample {
  const terrainSample = evaluateIslandElevation(x, z);
  const elevation = terrainSample.elevation;
  const slopeDegrees = computeTerrainSlope(x, z);

  // Distances to major hydrologic and landmark features
  const distCoast = Math.max(0, getDistanceToCoast(x, z));
  const distLake = Math.hypot(x - (-320), z - (-260));
  
  // River corridor: runs roughly from (-300, -220) down through (-150, 150) to (-80, 840)
  const distRiver = distToSegment(x, z, -280, -200, -120, 450);

  // Distances to regional centers
  const distForest = Math.hypot(x - (-640), z - 20);
  const distMountain = Math.hypot(x - (-650), z - (-650));
  const distPelican = Math.hypot(x - (-720), z - 560);
  const distRural = Math.hypot(x - 220, z - 80);

  let primaryBiome: EnvironmentBiome = "LOWLAND_MEADOW";

  // 1. High Alpine Summit & Cliffs
  if (elevation > 85.0 || (distMountain < 320 && elevation > 60.0 && slopeDegrees > 32)) {
    primaryBiome = "ALPINE_SUMMIT";
  }
  // 2. Mid Mountain (Krummholz, scree, stunted conifers)
  else if (elevation > 45.0 || (distMountain < 450 && elevation > 30.0)) {
    primaryBiome = "MOUNTAIN_MID";
  }
  // 3. Lower Mountain Foothills
  else if (elevation > 22.0 && distMountain < 650) {
    primaryBiome = "MOUNTAIN_LOWER";
  }
  // 4. Lake Shore (Crystal Mountain Lake basin)
  else if (distLake < 145 && elevation >= 8.2 && elevation <= 12.5) {
    primaryBiome = "LAKE_SHORE";
  }
  // 5. Riverbank corridor
  else if (distRiver < 38 && elevation >= 0.4 && elevation <= 12.0) {
    primaryBiome = "RIVER_BANK";
  }
  // 6. Pelican Cove sandy beach
  else if (distPelican < 240 && elevation >= 0.3 && elevation <= 4.5) {
    primaryBiome = "PELICAN_BEACH";
  }
  // 7. Rocky Coastline / Sea Cliffs
  else if (elevation >= 0.3 && elevation <= 12.0 && slopeDegrees > 25 && distPelican >= 240) {
    primaryBiome = "ROCKY_COAST";
  }
  // 8. Whispering Pines Forest Core
  else if (distForest < 280 && elevation >= 2.0 && elevation <= 28.0) {
    primaryBiome = "FOREST_CORE";
  }
  // 9. Forest Edge / Transition zone
  else if (distForest < 420 && elevation >= 1.8 && elevation <= 32.0) {
    primaryBiome = "FOREST_EDGE";
  }
  // 10. Rural Grasslands / Pasture
  else if (distRural < 320 && elevation >= 1.5 && elevation <= 18.0) {
    primaryBiome = "RURAL_PASTURE";
  }
  // 11. Lowland Meadow (default)
  else {
    primaryBiome = "LOWLAND_MEADOW";
  }

  const canSupportTrees = slopeDegrees < 38 && elevation > 0.6 && elevation < 95.0;
  const canSupportFoliage = slopeDegrees < 55 && elevation > 0.3;

  return {
    primaryBiome,
    elevation,
    slopeDegrees,
    distToCoast: distCoast,
    distToRiver: distRiver,
    distToLake: distLake,
    canSupportTrees,
    canSupportFoliage,
  };
}

