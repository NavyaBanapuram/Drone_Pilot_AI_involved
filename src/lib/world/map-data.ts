// ==========================================================
// DRONE PILOT — TACTICAL MAP & MINIMAP DATA MODEL (PHASE 1)
// Unified SVG projections driven directly by canonical WORLD_DEFINITION
// ==========================================================

import { generateCoastlinePolygon } from "./coastline-math";
import { WORLD_DEFINITION } from "./world-definition";
import { RegionId } from "./world-types";

export const MAP_HALF_RANGE_METERS = 1400; // Covers entire 2.4km island + coastal shelf

/**
 * Projects a 3D world position (meters) into a normalized SVG canvas.
 * Viewport covers from -1400m to +1400m with configurable canvas size.
 */
export function worldToRadarCoords(
  worldX: number,
  worldZ: number,
  canvasSize = 200,
  halfRange = MAP_HALF_RANGE_METERS
) {
  const center = canvasSize / 2;
  const scale = (canvasSize * 0.46) / halfRange;

  const rx = center + worldX * scale;
  const rz = center + worldZ * scale;

  return {
    x: Math.max(4, Math.min(canvasSize - 4, rx)),
    y: Math.max(4, Math.min(canvasSize - 4, rz)),
  };
}

/**
 * Generates an SVG path string `d="..."` tracing the natural irregular coastline.
 */
export function getCoastlineSvgPath(
  sampleCount = 120,
  canvasSize = 200,
  halfRange = MAP_HALF_RANGE_METERS
): string {
  const polygon = generateCoastlinePolygon(sampleCount);
  if (polygon.length === 0) return "";

  const first = worldToRadarCoords(polygon[0].x, polygon[0].z, canvasSize, halfRange);
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;

  for (let i = 1; i < polygon.length; i++) {
    const pt = worldToRadarCoords(polygon[i].x, polygon[i].z, canvasSize, halfRange);
    d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }

  d += " Z";
  return d;
}

/**
 * Generates SVG path string for a sequence of 3D road/waterway points.
 */
export function pointsToSvgPath(
  points: Array<{ x: number; z: number }>,
  canvasSize = 200,
  halfRange = MAP_HALF_RANGE_METERS
): string {
  if (!points || points.length === 0) return "";
  const first = worldToRadarCoords(points[0].x, points[0].z, canvasSize, halfRange);
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const pt = worldToRadarCoords(points[i].x, points[i].z, canvasSize, halfRange);
    d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Comprehensive Tactical Map Data Bundle for UI consumption (driven by WORLD_DEFINITION)
 */
export function getTacticalMapData(canvasSize = 800, halfRange = MAP_HALF_RANGE_METERS) {
  const coastlinePath = getCoastlineSvgPath(128, canvasSize, halfRange);

  // 1. Waterways
  const riverPath = pointsToSvgPath(
    WORLD_DEFINITION.waterways.riverCenterline,
    canvasSize,
    halfRange
  );
  const lakeCenter = worldToRadarCoords(
    WORLD_DEFINITION.waterways.lakeCenter.x,
    WORLD_DEFINITION.waterways.lakeCenter.z,
    canvasSize,
    halfRange
  );
  const lakeRadiusSvg = (WORLD_DEFINITION.waterways.lakeRadiusMeters * (canvasSize * 0.46)) / halfRange;

  // 2. Roads
  const highways = WORLD_DEFINITION.roads.primaryHighways.map((h) => ({
    id: h.id,
    name: h.name,
    path: pointsToSvgPath(h.points, canvasSize, halfRange),
    width: Math.max(3, (h.widthMeters * canvasSize) / (halfRange * 2)),
  }));

  const connectors = WORLD_DEFINITION.roads.connectors.map((c) => ({
    id: c.id,
    name: c.name,
    path: pointsToSvgPath(c.points, canvasSize, halfRange),
    width: Math.max(2, (c.widthMeters * canvasSize) / (halfRange * 2)),
  }));

  const mountainPasses = WORLD_DEFINITION.roads.mountainPasses.map((m) => ({
    id: m.id,
    name: m.name,
    path: pointsToSvgPath(m.points, canvasSize, halfRange),
    width: Math.max(2, (m.widthMeters * canvasSize) / (halfRange * 2)),
  }));

  const bridges = WORLD_DEFINITION.roads.bridges.map((b) => ({
    id: b.id,
    name: b.name,
    path: pointsToSvgPath(b.points, canvasSize, halfRange),
    width: Math.max(3, (b.widthMeters * canvasSize) / (halfRange * 2)),
  }));

  // 3. Regions
  const regionMarkers = Object.values(WORLD_DEFINITION.regions)
    .filter((r) => r.id !== "water")
    .map((r) => {
      const center = worldToRadarCoords(r.center.x, r.center.z, canvasSize, halfRange);
      const minPt = worldToRadarCoords(r.bounds.minX, r.bounds.minZ, canvasSize, halfRange);
      const maxPt = worldToRadarCoords(r.bounds.maxX, r.bounds.maxZ, canvasSize, halfRange);
      return {
        id: r.id,
        name: r.shortName,
        fullName: r.name,
        category: r.category,
        x: center.x,
        y: center.y,
        color: r.mapColor,
        bounds: {
          x: Math.min(minPt.x, maxPt.x),
          y: Math.min(minPt.y, maxPt.y),
          width: Math.abs(maxPt.x - minPt.x),
          height: Math.abs(maxPt.y - minPt.y),
        },
      };
    });

  // 4. Helipads
  const helipadMarkers = Object.values(WORLD_DEFINITION.helipads).map((h) => {
    const coords = worldToRadarCoords(h.position.x, h.position.z, canvasSize, halfRange);
    return {
      id: h.id,
      name: h.name,
      x: coords.x,
      y: coords.y,
      regionId: h.regionId,
      elevation: h.elevation,
      surfaceType: h.surfaceType,
    };
  });

  // 5. Landmarks
  const landmarkMarkers = Object.values(WORLD_DEFINITION.landmarks).map((l) => {
    const coords = worldToRadarCoords(l.position.x, l.position.z, canvasSize, halfRange);
    return {
      id: l.id,
      name: l.name,
      category: l.category,
      regionId: l.regionId,
      x: coords.x,
      y: coords.y,
      elevationMsl: l.elevationMsl,
      callsign: l.callsign,
      description: l.description,
    };
  });

  return {
    coastlinePath,
    waterways: {
      riverPath,
      lake: {
        cx: lakeCenter.x,
        cy: lakeCenter.y,
        r: lakeRadiusSvg,
      },
    },
    roads: {
      highways,
      connectors,
      mountainPasses,
      bridges,
    },
    regionMarkers,
    helipadMarkers,
    landmarkMarkers,
  };
}
