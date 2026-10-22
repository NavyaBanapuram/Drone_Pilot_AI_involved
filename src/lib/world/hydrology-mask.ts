// ==========================================================
// DRONE PILOT — UNIFIED HYDROLOGY MASK & WATER CLASSIFIER
// Authoritative spatial water system preventing underwater assets,
// vegetation in lakes/rivers, and clipping road/bridge geometry
// ==========================================================

export type WaterBodyType = "LAND" | "OCEAN" | "LAKE" | "RIVER" | "WATERFALL_POOL";

export interface HydrologyQuery {
  isWater: boolean;
  type: WaterBodyType;
  waterElevation: number;
  distanceToWater: number; // 0 if inside water, >0 if on land
  depth: number; // >0 if submerged, 0 if above water
}

// Canonical waterway parameters matching freshwater-mesh.ts & terrain-math.ts
export const HYDROLOGY_CONSTANTS = {
  seaLevel: 0.0,
  lakeCenter: { x: -320, z: -260 },
  lakeRadius: 125.0, // Water radius
  lakeElevation: 8.5,
  lakeBankRadius: 142.0, // Bank / rocky rim

  riverZStart: -220,
  riverZEnd: 960,
  waterfallPool: { x: -258, z: -198, radius: 14.0, elevation: 2.05 },
};

/**
 * Calculates the exact river centerline X, half-width, and water surface Y at any Z coordinate.
 */
export function getRiverCrossSectionAtZ(z: number): {
  inRiverRange: boolean;
  centerX: number;
  halfWidth: number;
  waterY: number;
} {
  const { riverZStart, riverZEnd } = HYDROLOGY_CONSTANTS;
  if (z < riverZStart || z > riverZEnd) {
    return { inRiverRange: false, centerX: -270, halfWidth: 0, waterY: 0 };
  }

  const p = (z - riverZStart) / (riverZEnd - riverZStart);
  const centerX =
    -270 +
    p * 190 +
    Math.sin(p * Math.PI * 2.5) * 45 +
    Math.cos(p * Math.PI * 6.0) * 8;
  const halfWidth = 13 + p * 19;
  const waterY = Math.max(0.18, 8.5 * (1 - p) + 0.08);

  return { inRiverRange: true, centerX, halfWidth, waterY };
}

import { getDistanceToCoast, isInsideIsland } from "./coastline-math";
import { evaluateIslandElevation } from "./terrain-math";

/**
 * Checks if a given (x, z) coordinate falls within or near any water body.
 * @param x World X
 * @param z World Z
 * @param clearance Margin in meters to maintain around water edges (positive = stay further away)
 */
export function isWaterAt(x: number, z: number, clearance = 0): boolean {
  // 1. Lake check
  const dxLake = x - HYDROLOGY_CONSTANTS.lakeCenter.x;
  const dzLake = z - HYDROLOGY_CONSTANTS.lakeCenter.z;
  const distLake = Math.hypot(dxLake, dzLake);
  if (distLake < HYDROLOGY_CONSTANTS.lakeRadius + clearance) {
    return true;
  }

  // 2. Waterfall pool check
  const dxPool = x - HYDROLOGY_CONSTANTS.waterfallPool.x;
  const dzPool = z - HYDROLOGY_CONSTANTS.waterfallPool.z;
  const distPool = Math.hypot(dxPool, dzPool);
  if (distPool < HYDROLOGY_CONSTANTS.waterfallPool.radius + clearance) {
    return true;
  }

  // 3. River corridor check
  const river = getRiverCrossSectionAtZ(z);
  if (river.inRiverRange) {
    const distToRiverAxis = Math.abs(x - river.centerX);
    if (distToRiverAxis < river.halfWidth + clearance) {
      return true;
    }
  }

  // 4. Ocean check (outside canonical irregular coastline or right at waterline)
  const distToCoast = getDistanceToCoast(x, z);
  if (distToCoast <= clearance) {
    return true;
  }

  // 5. Elevation sanity check against sea level
  const elev = evaluateIslandElevation(x, z).elevation;
  if (elev <= HYDROLOGY_CONSTANTS.seaLevel + clearance * 0.05) {
    return true;
  }

  return false;
}

/**
 * Gets the authoritative water surface elevation at (x, z).
 * Returns -999 if the coordinate is purely on land and not above any water surface.
 */
export function getWaterElevation(x: number, z: number): number {
  // 1. Waterfall pool
  const dxPool = x - HYDROLOGY_CONSTANTS.waterfallPool.x;
  const dzPool = z - HYDROLOGY_CONSTANTS.waterfallPool.z;
  if (Math.hypot(dxPool, dzPool) <= HYDROLOGY_CONSTANTS.waterfallPool.radius) {
    return HYDROLOGY_CONSTANTS.waterfallPool.elevation;
  }

  // 2. Lake
  const dxLake = x - HYDROLOGY_CONSTANTS.lakeCenter.x;
  const dzLake = z - HYDROLOGY_CONSTANTS.lakeCenter.z;
  if (Math.hypot(dxLake, dzLake) <= HYDROLOGY_CONSTANTS.lakeRadius) {
    return HYDROLOGY_CONSTANTS.lakeElevation;
  }

  // 3. River
  const river = getRiverCrossSectionAtZ(z);
  if (river.inRiverRange && Math.abs(x - river.centerX) <= river.halfWidth) {
    return river.waterY;
  }

  // 4. Ocean
  const distToCoast = getDistanceToCoast(x, z);
  if (distToCoast <= 0) {
    return HYDROLOGY_CONSTANTS.seaLevel;
  }

  return -999;
}

/**
 * Returns detailed hydrology information for (x, z).
 */
export function queryHydrology(x: number, z: number, terrainElevation = 0): HydrologyQuery {
  // 1. Waterfall Pool
  const dxPool = x - HYDROLOGY_CONSTANTS.waterfallPool.x;
  const dzPool = z - HYDROLOGY_CONSTANTS.waterfallPool.z;
  const distPool = Math.hypot(dxPool, dzPool);
  if (distPool <= HYDROLOGY_CONSTANTS.waterfallPool.radius) {
    const waterY = HYDROLOGY_CONSTANTS.waterfallPool.elevation;
    return {
      isWater: true,
      type: "WATERFALL_POOL",
      waterElevation: waterY,
      distanceToWater: 0,
      depth: Math.max(0, waterY - terrainElevation),
    };
  }

  // 2. Lake
  const dxLake = x - HYDROLOGY_CONSTANTS.lakeCenter.x;
  const dzLake = z - HYDROLOGY_CONSTANTS.lakeCenter.z;
  const distLake = Math.hypot(dxLake, dzLake);
  if (distLake <= HYDROLOGY_CONSTANTS.lakeRadius) {
    const waterY = HYDROLOGY_CONSTANTS.lakeElevation;
    return {
      isWater: true,
      type: "LAKE",
      waterElevation: waterY,
      distanceToWater: 0,
      depth: Math.max(0, waterY - terrainElevation),
    };
  }

  // 3. River
  const river = getRiverCrossSectionAtZ(z);
  if (river.inRiverRange) {
    const distToRiverAxis = Math.abs(x - river.centerX);
    if (distToRiverAxis <= river.halfWidth) {
      return {
        isWater: true,
        type: "RIVER",
        waterElevation: river.waterY,
        distanceToWater: 0,
        depth: Math.max(0, river.waterY - terrainElevation),
      };
    }
  }

  // 4. Ocean
  const distToCoast = getDistanceToCoast(x, z);

  if (distToCoast <= 0 || terrainElevation <= 0.05) {
    return {
      isWater: true,
      type: "OCEAN",
      waterElevation: HYDROLOGY_CONSTANTS.seaLevel,
      distanceToWater: 0,
      depth: Math.max(0, -terrainElevation),
    };
  }

  // Land: calculate min distance to nearest water
  const distToLakeEdge = Math.max(0, distLake - HYDROLOGY_CONSTANTS.lakeRadius);
  const distToOceanEdge = Math.max(0, distToCoast);
  let minDistance = Math.min(distToLakeEdge, distToOceanEdge);

  if (river.inRiverRange) {
    const distToRiverEdge = Math.max(0, Math.abs(x - river.centerX) - river.halfWidth);
    minDistance = Math.min(minDistance, distToRiverEdge);
  }

  return {
    isWater: false,
    type: "LAND",
    waterElevation: -999,
    distanceToWater: minDistance,
    depth: 0,
  };
}
