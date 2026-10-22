// ==========================================================
// DRONE PILOT — WORLD TYPES & DATA SCHEMAS
// Foundational types for regions, helipads, bounds, and spawns
// ==========================================================

export type RegionId =
  | "training"
  | "forest"
  | "mountain"
  | "river"
  | "city"
  | "industrial"
  | "coast"
  | "water";

export interface Vector2D {
  x: number;
  z: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface EulerRotation {
  pitch: number;
  roll: number;
  yaw: number;
}

export interface BoundingBox2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Helipad {
  id: string;
  regionId: RegionId;
  name: string;
  position: Vector3D;
  headingDeg: number;
  elevation: number; // surface altitude in meters above sea level
  dimensions: {
    width: number;
    length: number;
    radius?: number;
  };
  surfaceType: "concrete" | "steel" | "turf" | "wood" | "rooftop";
  spawnAllowed: boolean;
  description: string;
}

export interface EnvironmentalPreset {
  baseWindSpeedMs: number;
  windDirectionDeg: number;
  gustFactor: number;
  airTemperatureC: number;
  airDensity: number;
  visibilityKm: number;
}

export interface RegionDefinition {
  id: RegionId;
  name: string;
  shortName: string;
  category: "academy" | "nature" | "highlands" | "freshwater" | "urban" | "logistics" | "maritime" | "ocean";
  description: string;
  center: Vector3D;
  bounds: BoundingBox2D;
  elevationRange: {
    min: number;
    max: number;
  };
  mapColor: string;
  primaryHelipadId: string;
  helipadIds: string[];
  environment: EnvironmentalPreset;
}

export interface SpawnConfiguration {
  spawnId: string;
  regionId: RegionId;
  helipadId: string;
  position: Vector3D; // exact center where drone landing skids touch down
  rotation: EulerRotation;
  groundElevation: number;
}

export interface CoastlinePoint {
  x: number;
  z: number;
  angleRad: number;
  distance: number;
}

export type LandmarkCategory =
  | "summit"
  | "lake"
  | "waterfall"
  | "tower"
  | "bridge"
  | "facility"
  | "cliff"
  | "airfield"
  | "monument";

export interface LandmarkDefinition {
  id: string;
  name: string;
  category: LandmarkCategory;
  regionId: RegionId;
  position: Vector3D;
  elevationMsl: number;
  callsign: string;
  description: string;
  icon?: string;
}

export interface RoadPolyline {
  id: string;
  name: string;
  type: "highway" | "arterial" | "switchback" | "rural" | "bridge";
  widthMeters: number;
  points: Vector3D[]; // Sequenced world waypoints
  hasBridge?: boolean;
}

export interface RoadNetworkDefinition {
  primaryHighways: RoadPolyline[];
  connectors: RoadPolyline[];
  mountainPasses: RoadPolyline[];
  bridges: RoadPolyline[];
}

export interface WaterwayDefinition {
  riverCenterline: Vector3D[];
  lakeCenter: Vector3D;
  lakeRadiusMeters: number;
  waterfallLocation: Vector3D;
  estuaryExit: Vector3D;
}

export interface TerrainConfiguration {
  worldWidthMeters: number;
  worldLengthMeters: number;
  islandWidthMeters: number;
  islandLengthMeters: number;
  seaLevelMsl: number;
  maxElevationMsl: number;
  lakeElevationMsl: number;
  bathymetryDepthMsl: number;
}

export interface WorldDefinition {
  id: string;
  name: string;
  version: string;
  terrain: TerrainConfiguration;
  regions: Record<RegionId, RegionDefinition>;
  helipads: Record<string, Helipad>;
  landmarks: Record<string, LandmarkDefinition>;
  roads: RoadNetworkDefinition;
  waterways: WaterwayDefinition;
}
