// ==========================================================
// DRONE PILOT — IRREGULAR COASTLINE MATHEMATICAL MODEL
// Multi-harmonic parametric boundary for naturally formed island
// ==========================================================

import { CoastlinePoint } from "./world-types";

/**
 * Evaluates the natural irregular coastline radius at any compass angle.
 * Replaces circular/oval geometry with organic bays, coves, and peninsulas.
 * 
 * Coordinate orientation:
 * Angle 0 = East (+X)
 * Angle -PI/2 = North (-Z)
 * Angle PI/2 = South (+Z)
 * Angle PI or -PI = West (-X)
 */
export function getCoastlineRadius(angleRad: number): number {
  const baseR = 1120; // Base nominal radius in meters (~2240m - 2480m island span)

  // 1. Primary macro geographic features:
  // - North Cape Promontory (NW high crags extending out toward -Z/-X)
  const northCape = 0.16 * Math.cos(angleRad + 1.85);

  // - South Harbor Shipping Peninsula & Inlet (SE logistics promontory)
  const southHarbor = 0.14 * Math.sin(2 * angleRad - 0.45);

  // - Pelican Cove & Emerald Bay coastal indentations (SW crescent bay & NE inlet)
  const baysIndent = -0.11 * Math.cos(3 * angleRad + 0.65);

  // - Western Granite Bluffs headland (+X/-X asymmetry)
  const westBluffs = 0.08 * Math.sin(angleRad * 2 + 2.1);

  // 2. Secondary meso-scale geographic features:
  // - Coves, rocky points, and river delta estuary cut
  const meso1 = 0.055 * Math.cos(4 * angleRad - 1.25);
  const meso2 = 0.038 * Math.sin(5 * angleRad + 0.95);
  const meso3 = -0.025 * Math.cos(7 * angleRad - 0.35);

  // 3. Fine organic coastal jaggedness
  const micro1 = 0.016 * Math.sin(11 * angleRad + 1.4);
  const micro2 = -0.012 * Math.cos(13 * angleRad - 0.8);

  const factor = 1.0 + northCape + southHarbor + baysIndent + westBluffs + meso1 + meso2 + meso3 + micro1 + micro2;
  return baseR * factor;
}

/**
 * Returns true if coordinates (x, z) are on the physical island landmass.
 */
export function isInsideIsland(x: number, z: number): boolean {
  const dist = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  const coastR = getCoastlineRadius(angle);
  return dist <= coastR;
}

/**
 * Signed distance to coastline:
 * Positive = inland (meters from shore)
 * Negative = offshore in the ocean
 */
export function getDistanceToCoast(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  const coastR = getCoastlineRadius(angle);
  return coastR - dist;
}

/**
 * Generates an array of 2D points along the irregular perimeter.
 * Useful for 3D terrain extrusion and 2D vector minimap rendering.
 */
export function generateCoastlinePolygon(sampleCount = 128): CoastlinePoint[] {
  const points: CoastlinePoint[] = [];
  const step = (Math.PI * 2) / sampleCount;

  for (let i = 0; i < sampleCount; i++) {
    const angle = i * step;
    const r = getCoastlineRadius(angle);
    points.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      angleRad: angle,
      distance: r,
    });
  }

  return points;
}
