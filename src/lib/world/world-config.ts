// ==========================================================
// DRONE PILOT — GLOBAL WORLD CONFIGURATION
// Master parameters for world dimensions, coordinate system, and safety
// ==========================================================

export const WORLD_CONFIG = {
  // Global Simulation Expanse (Ocean bounds in meters)
  worldWidth: 4800,
  worldLength: 4800,
  
  // Approximate Physical Island Landmass bounds (meters)
  islandWidth: 2400,
  islandLength: 2200,

  // Elevation Datums (meters above sea level)
  seaLevel: 0.0,
  beachElevation: 0.45,
  coastalPlateauElevation: 1.2,
  mountainMaxElevation: 145.0,
  lakeWaterLevel: 8.5,
  bathymetryDepth: -16.0,

  // World Origin Location
  worldOrigin: { x: 0, y: 0, z: 0 },

  // Coordinate System Standard
  coordinateSystem: {
    origin: "Central Training Academy Helipad Alpha (0, 0, 0)",
    xAxis: "East (+X) / West (-X)",
    yAxis: "Altitude above sea level (+Y)",
    zAxis: "South (+Z) / North (-Z)",
    units: "Meters (SI standards)",
  },

  // Flight Safety & Warning Limits
  safetyBounds: {
    offshoreWarningRadius: 1350, // triggers advisory when flying far past coastline
    maxOperationalRadius: 2300,  // edge of simulation zone
    maxFlightCeilingMeters: 250, // recreational/commercial training ceiling
  },
} as const;
