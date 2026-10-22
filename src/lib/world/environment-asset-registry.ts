// ==========================================================
// DRONE PILOT — ENVIRONMENT ASSET REGISTRY & METADATA SYSTEM
// Canonical registry defining all natural environmental assets,
// biomes, scale parameters, LOD profiles, and placement rules.
// ==========================================================

export type EnvironmentAssetCategory =
  | "TREE"
  | "SHRUB"
  | "GRASS"
  | "FLOWER"
  | "ROCK"
  | "BOULDER"
  | "LOG"
  | "STUMP"
  | "FERN"
  | "GROUND_PROP"
  | "COAST_PROP"
  | "RIVER_PROP";

export type EnvironmentBiome =
  | "FOREST_CORE"
  | "FOREST_EDGE"
  | "MOUNTAIN_LOWER"
  | "MOUNTAIN_MID"
  | "ALPINE_SUMMIT"
  | "RIVER_BANK"
  | "LAKE_SHORE"
  | "PELICAN_BEACH"
  | "ROCKY_COAST"
  | "LOWLAND_MEADOW"
  | "RURAL_PASTURE";

export type DensityClass = "ULTRA_DENSE" | "HIGH" | "MEDIUM" | "SPARSE" | "SOLITARY";

export interface EnvironmentAssetDefinition {
  id: string;
  name: string;
  category: EnvironmentAssetCategory;
  biomes: EnvironmentBiome[];
  sizeMeters: {
    height: number;
    radius: number;
    scaleRange: [number, number]; // [minScale, maxScale] multiplier
  };
  hasCollision: boolean;
  canInstance: boolean;
  densityClass: DensityClass;
  elevationRangeMsl: [number, number]; // [minMsl, maxMsl]
  slopeMaxDegrees: number;
  placementRestrictions: {
    minDistToRoadMeters: number;
    minDistToRunwayMeters: number;
    minDistToWaterMeters: number;
    requiresWaterNearMeters?: number;
    excludeFromCity: boolean;
  };
  clusteringAffinity?: string[]; // IDs of companion assets for authored storytelling compositions
}

export const ENVIRONMENT_ASSETS: Record<string, EnvironmentAssetDefinition> = {
  // ----------------------------------------------------
  // 1. CANOPY & MATURE TREES
  // ----------------------------------------------------
  "tree-scots-pine": {
    id: "tree-scots-pine",
    name: "Mature Scots Pine (Pinus Sylvestris)",
    category: "TREE",
    biomes: ["FOREST_CORE", "FOREST_EDGE", "MOUNTAIN_LOWER"],
    sizeMeters: { height: 26.0, radius: 7.5, scaleRange: [0.85, 1.25] },
    hasCollision: true,
    canInstance: true,
    densityClass: "HIGH",
    elevationRangeMsl: [2.0, 52.0],
    slopeMaxDegrees: 28,
    placementRestrictions: {
      minDistToRoadMeters: 6.0,
      minDistToRunwayMeters: 35.0,
      minDistToWaterMeters: 2.0,
      excludeFromCity: true,
    },
    clusteringAffinity: ["stump-weathered", "log-mossy-fallen", "fern-forest-cluster", "rock-granite-boulder"],
  },

  "tree-norway-spruce": {
    id: "tree-norway-spruce",
    name: "Tiered Norway Spruce / Fir",
    category: "TREE",
    biomes: ["FOREST_CORE", "MOUNTAIN_LOWER", "MOUNTAIN_MID"],
    sizeMeters: { height: 28.5, radius: 6.8, scaleRange: [0.80, 1.30] },
    hasCollision: true,
    canInstance: true,
    densityClass: "HIGH",
    elevationRangeMsl: [3.5, 78.0],
    slopeMaxDegrees: 34,
    placementRestrictions: {
      minDistToRoadMeters: 7.0,
      minDistToRunwayMeters: 38.0,
      minDistToWaterMeters: 3.0,
      excludeFromCity: true,
    },
    clusteringAffinity: ["shrub-mountain-juniper", "rock-scree-cluster", "log-mossy-fallen"],
  },

  "tree-deciduous-oak": {
    id: "tree-deciduous-oak",
    name: "Mature Broadleaf English Oak",
    category: "TREE",
    biomes: ["FOREST_EDGE", "LOWLAND_MEADOW", "RURAL_PASTURE"],
    sizeMeters: { height: 22.0, radius: 10.5, scaleRange: [0.85, 1.20] },
    hasCollision: true,
    canInstance: true,
    densityClass: "MEDIUM",
    elevationRangeMsl: [1.2, 28.0],
    slopeMaxDegrees: 20,
    placementRestrictions: {
      minDistToRoadMeters: 8.0,
      minDistToRunwayMeters: 40.0,
      minDistToWaterMeters: 4.0,
      excludeFromCity: true,
    },
    clusteringAffinity: ["shrub-dogwood-flowering", "fern-forest-cluster", "rock-granite-boulder"],
  },

  "tree-mountain-birch": {
    id: "tree-mountain-birch",
    name: "Slender Mountain Birch / Aspen",
    category: "TREE",
    biomes: ["FOREST_EDGE", "MOUNTAIN_LOWER", "RIVER_BANK"],
    sizeMeters: { height: 16.5, radius: 4.5, scaleRange: [0.75, 1.15] },
    hasCollision: true,
    canInstance: true,
    densityClass: "MEDIUM",
    elevationRangeMsl: [1.8, 62.0],
    slopeMaxDegrees: 26,
    placementRestrictions: {
      minDistToRoadMeters: 5.0,
      minDistToRunwayMeters: 32.0,
      minDistToWaterMeters: 1.5,
      excludeFromCity: true,
    },
    clusteringAffinity: ["fern-forest-cluster", "rock-granite-boulder"],
  },

  "tree-river-willow": {
    id: "tree-river-willow",
    name: "Riparian Weeping Willow",
    category: "TREE",
    biomes: ["RIVER_BANK", "LAKE_SHORE"],
    sizeMeters: { height: 18.0, radius: 8.5, scaleRange: [0.85, 1.25] },
    hasCollision: true,
    canInstance: true,
    densityClass: "MEDIUM",
    elevationRangeMsl: [0.4, 14.0],
    slopeMaxDegrees: 18,
    placementRestrictions: {
      minDistToRoadMeters: 6.0,
      minDistToRunwayMeters: 35.0,
      minDistToWaterMeters: 0.5,
      requiresWaterNearMeters: 25.0,
      excludeFromCity: true,
    },
    clusteringAffinity: ["river-reeds-bundle", "rock-river-pebble-bed", "log-mossy-fallen"],
  },

  "tree-coastal-palm": {
    id: "tree-coastal-palm",
    name: "Curved Coastal Palm",
    category: "TREE",
    biomes: ["PELICAN_BEACH", "ROCKY_COAST"],
    sizeMeters: { height: 14.0, radius: 4.2, scaleRange: [0.80, 1.20] },
    hasCollision: true,
    canInstance: true,
    densityClass: "SPARSE",
    elevationRangeMsl: [0.8, 8.0],
    slopeMaxDegrees: 22,
    placementRestrictions: {
      minDistToRoadMeters: 4.5,
      minDistToRunwayMeters: 30.0,
      minDistToWaterMeters: 1.0,
      excludeFromCity: true,
    },
    clusteringAffinity: ["coast-driftwood-log", "rock-sea-stack-boulder"],
  },

  "tree-snag-deadwood": {
    id: "tree-snag-deadwood",
    name: "Weathered Forest Snag / Lightning Tree",
    category: "TREE",
    biomes: ["FOREST_CORE", "MOUNTAIN_MID", "ALPINE_SUMMIT"],
    sizeMeters: { height: 15.0, radius: 3.5, scaleRange: [0.80, 1.15] },
    hasCollision: true,
    canInstance: true,
    densityClass: "SPARSE",
    elevationRangeMsl: [4.0, 115.0],
    slopeMaxDegrees: 40,
    placementRestrictions: {
      minDistToRoadMeters: 6.0,
      minDistToRunwayMeters: 35.0,
      minDistToWaterMeters: 2.0,
      excludeFromCity: true,
    },
    clusteringAffinity: ["rock-scree-cluster", "stump-weathered"],
  },

  // ----------------------------------------------------
  // 2. UNDERSTORY SHRUBS & FERNS
  // ----------------------------------------------------
  "shrub-forest-dogwood": {
    id: "shrub-forest-dogwood",
    name: "Broadleaf Forest Understory Shrub",
    category: "SHRUB",
    biomes: ["FOREST_CORE", "FOREST_EDGE", "LOWLAND_MEADOW"],
    sizeMeters: { height: 2.8, radius: 2.2, scaleRange: [0.70, 1.40] },
    hasCollision: false,
    canInstance: true,
    densityClass: "HIGH",
    elevationRangeMsl: [1.2, 45.0],
    slopeMaxDegrees: 28,
    placementRestrictions: {
      minDistToRoadMeters: 3.0,
      minDistToRunwayMeters: 25.0,
      minDistToWaterMeters: 1.0,
      excludeFromCity: true,
    },
  },

  "shrub-mountain-juniper": {
    id: "shrub-mountain-juniper",
    name: "Alpine Krummholz Prostrate Juniper",
    category: "SHRUB",
    biomes: ["MOUNTAIN_LOWER", "MOUNTAIN_MID", "ALPINE_SUMMIT"],
    sizeMeters: { height: 1.4, radius: 2.5, scaleRange: [0.70, 1.50] },
    hasCollision: false,
    canInstance: true,
    densityClass: "HIGH",
    elevationRangeMsl: [30.0, 130.0],
    slopeMaxDegrees: 45,
    placementRestrictions: {
      minDistToRoadMeters: 2.5,
      minDistToRunwayMeters: 25.0,
      minDistToWaterMeters: 2.0,
      excludeFromCity: true,
    },
  },

  "fern-forest-cluster": {
    id: "fern-forest-cluster",
    name: "Woodland Sword Fern Cluster",
    category: "FERN",
    biomes: ["FOREST_CORE", "RIVER_BANK", "LAKE_SHORE"],
    sizeMeters: { height: 1.2, radius: 1.4, scaleRange: [0.75, 1.35] },
    hasCollision: false,
    canInstance: true,
    densityClass: "ULTRA_DENSE",
    elevationRangeMsl: [0.6, 35.0],
    slopeMaxDegrees: 30,
    placementRestrictions: {
      minDistToRoadMeters: 2.5,
      minDistToRunwayMeters: 20.0,
      minDistToWaterMeters: 0.5,
      excludeFromCity: true,
    },
  },

  "river-reeds-bundle": {
    id: "river-reeds-bundle",
    name: "Freshwater Emergent Reeds & Bulrushes",
    category: "RIVER_PROP",
    biomes: ["RIVER_BANK", "LAKE_SHORE"],
    sizeMeters: { height: 2.2, radius: 1.1, scaleRange: [0.80, 1.40] },
    hasCollision: false,
    canInstance: true,
    densityClass: "HIGH",
    elevationRangeMsl: [0.2, 10.0],
    slopeMaxDegrees: 15,
    placementRestrictions: {
      minDistToRoadMeters: 3.0,
      minDistToRunwayMeters: 20.0,
      minDistToWaterMeters: 0.0,
      requiresWaterNearMeters: 12.0,
      excludeFromCity: true,
    },
  },

  // ----------------------------------------------------
  // 3. ROCKS, BOULDERS & SCREE
  // ----------------------------------------------------
  "rock-granite-boulder": {
    id: "rock-granite-boulder",
    name: "Glacial Granite Giant Boulder",
    category: "BOULDER",
    biomes: ["FOREST_CORE", "MOUNTAIN_LOWER", "MOUNTAIN_MID", "ROCKY_COAST"],
    sizeMeters: { height: 4.8, radius: 4.0, scaleRange: [0.70, 1.60] },
    hasCollision: true,
    canInstance: true,
    densityClass: "MEDIUM",
    elevationRangeMsl: [1.0, 110.0],
    slopeMaxDegrees: 48,
    placementRestrictions: {
      minDistToRoadMeters: 4.0,
      minDistToRunwayMeters: 28.0,
      minDistToWaterMeters: 1.0,
      excludeFromCity: true,
    },
  },

  "rock-scree-cluster": {
    id: "rock-scree-cluster",
    name: "Angular Alpine Talus Scree Fragment",
    category: "ROCK",
    biomes: ["MOUNTAIN_MID", "ALPINE_SUMMIT"],
    sizeMeters: { height: 1.8, radius: 1.6, scaleRange: [0.60, 1.80] },
    hasCollision: false,
    canInstance: true,
    densityClass: "HIGH",
    elevationRangeMsl: [45.0, 145.0],
    slopeMaxDegrees: 55,
    placementRestrictions: {
      minDistToRoadMeters: 3.0,
      minDistToRunwayMeters: 25.0,
      minDistToWaterMeters: 5.0,
      excludeFromCity: true,
    },
  },

  "rock-river-pebble-bed": {
    id: "rock-river-pebble-bed",
    name: "Water-Smoothed Riverbed Cobblestones",
    category: "RIVER_PROP",
    biomes: ["RIVER_BANK", "LAKE_SHORE"],
    sizeMeters: { height: 0.6, radius: 1.2, scaleRange: [0.60, 1.60] },
    hasCollision: false,
    canInstance: true,
    densityClass: "HIGH",
    elevationRangeMsl: [0.2, 10.0],
    slopeMaxDegrees: 22,
    placementRestrictions: {
      minDistToRoadMeters: 2.0,
      minDistToRunwayMeters: 20.0,
      minDistToWaterMeters: 0.0,
      requiresWaterNearMeters: 18.0,
      excludeFromCity: true,
    },
  },

  "rock-sea-stack-boulder": {
    id: "rock-sea-stack-boulder",
    name: "Coastal Sea Stack / Tidepool Crag",
    category: "COAST_PROP",
    biomes: ["ROCKY_COAST", "PELICAN_BEACH"],
    sizeMeters: { height: 6.5, radius: 4.5, scaleRange: [0.75, 1.80] },
    hasCollision: true,
    canInstance: true,
    densityClass: "MEDIUM",
    elevationRangeMsl: [0.0, 16.0],
    slopeMaxDegrees: 40,
    placementRestrictions: {
      minDistToRoadMeters: 5.0,
      minDistToRunwayMeters: 30.0,
      minDistToWaterMeters: 0.0,
      excludeFromCity: true,
    },
  },

  // ----------------------------------------------------
  // 4. DEBRIS & FOREST STORYTELLING ELEMENTS
  // ----------------------------------------------------
  "log-mossy-fallen": {
    id: "log-mossy-fallen",
    name: "Fallen Moss-Covered Timber Log",
    category: "LOG",
    biomes: ["FOREST_CORE", "FOREST_EDGE", "RIVER_BANK"],
    sizeMeters: { height: 1.2, radius: 6.0, scaleRange: [0.75, 1.40] },
    hasCollision: true,
    canInstance: true,
    densityClass: "MEDIUM",
    elevationRangeMsl: [1.2, 35.0],
    slopeMaxDegrees: 25,
    placementRestrictions: {
      minDistToRoadMeters: 4.0,
      minDistToRunwayMeters: 30.0,
      minDistToWaterMeters: 1.0,
      excludeFromCity: true,
    },
  },

  "stump-weathered": {
    id: "stump-weathered",
    name: "Weathered Cut / Jagged Tree Stump",
    category: "STUMP",
    biomes: ["FOREST_CORE", "FOREST_EDGE", "RURAL_PASTURE"],
    sizeMeters: { height: 1.4, radius: 1.1, scaleRange: [0.80, 1.30] },
    hasCollision: false,
    canInstance: true,
    densityClass: "MEDIUM",
    elevationRangeMsl: [1.0, 40.0],
    slopeMaxDegrees: 26,
    placementRestrictions: {
      minDistToRoadMeters: 3.5,
      minDistToRunwayMeters: 25.0,
      minDistToWaterMeters: 1.5,
      excludeFromCity: true,
    },
  },

  "coast-driftwood-log": {
    id: "coast-driftwood-log",
    name: "Sun-Bleached Shoreline Driftwood",
    category: "COAST_PROP",
    biomes: ["PELICAN_BEACH", "ROCKY_COAST"],
    sizeMeters: { height: 0.9, radius: 4.5, scaleRange: [0.75, 1.30] },
    hasCollision: false,
    canInstance: true,
    densityClass: "SPARSE",
    elevationRangeMsl: [0.2, 4.0],
    slopeMaxDegrees: 18,
    placementRestrictions: {
      minDistToRoadMeters: 4.0,
      minDistToRunwayMeters: 25.0,
      minDistToWaterMeters: 0.5,
      requiresWaterNearMeters: 25.0,
      excludeFromCity: true,
    },
  },

  // ----------------------------------------------------
  // 5. COASTAL & TRAIL SCENERY PROPS
  // ----------------------------------------------------
  "prop-coastal-mooring-post": {
    id: "prop-coastal-mooring-post",
    name: "Weathered Timber Harbor Mooring Pilings",
    category: "COAST_PROP",
    biomes: ["PELICAN_BEACH", "ROCKY_COAST"],
    sizeMeters: { height: 2.8, radius: 0.6, scaleRange: [0.85, 1.15] },
    hasCollision: false,
    canInstance: true,
    densityClass: "SPARSE",
    elevationRangeMsl: [0.3, 4.5],
    slopeMaxDegrees: 15,
    placementRestrictions: {
      minDistToRoadMeters: 3.0,
      minDistToRunwayMeters: 25.0,
      minDistToWaterMeters: 0.2,
      excludeFromCity: true,
    },
  },

  "prop-trail-split-fence": {
    id: "prop-trail-split-fence",
    name: "Rustic Split-Rail Trail Fence Segment",
    category: "GROUND_PROP",
    biomes: ["FOREST_EDGE", "RURAL_PASTURE", "LOWLAND_MEADOW"],
    sizeMeters: { height: 1.2, radius: 3.2, scaleRange: [0.90, 1.10] },
    hasCollision: false,
    canInstance: true,
    densityClass: "SPARSE",
    elevationRangeMsl: [1.2, 35.0],
    slopeMaxDegrees: 20,
    placementRestrictions: {
      minDistToRoadMeters: 2.5,
      minDistToRunwayMeters: 25.0,
      minDistToWaterMeters: 3.0,
      excludeFromCity: true,
    },
  },
};

/**
 * Returns all asset definitions belonging to a specific biome
 */
export function getAssetsForBiome(biome: EnvironmentBiome): EnvironmentAssetDefinition[] {
  return Object.values(ENVIRONMENT_ASSETS).filter((def) => def.biomes.includes(biome));
}
