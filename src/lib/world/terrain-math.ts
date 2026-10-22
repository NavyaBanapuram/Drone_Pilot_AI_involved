// ==========================================================
// DRONE PILOT — CANONICAL TERRAIN MATHEMATICAL MODEL (PHASE 1)
// Large-scale 2.4km irregular island with multi-peak mountain massif,
// high mountain lake, carved river canyon, and geographic biomes
// ==========================================================

import { getDistanceToCoast, getCoastlineRadius } from "./coastline-math";
import { RegionId } from "./world-types";
import { WORLD_DEFINITION } from "./world-definition";

export type SurfaceMaterialType =
  | "grass"
  | "sand"
  | "rock"
  | "scree"
  | "mud"
  | "asphalt"
  | "water";

export interface TerrainSample {
  elevation: number;        // Surface elevation in meters above sea level (MSL)
  slope: number;            // 0.0 (horizontal) to 1.0 (vertical cliff)
  surfaceType: SurfaceMaterialType;
  regionId: RegionId;
  color: [number, number, number]; // RGB 0..1 for vertex color splatting
}

/**
 * Evaluates the precise natural island ground elevation and biome at any (X, Z) world coordinate.
 * Canonical mathematical model shared by Three.js mesh generation, physics ground collision, and HUD telemetry.
 */
export function evaluateIslandElevation(x: number, z: number): TerrainSample {
  const distToCoast = getDistanceToCoast(x, z);
  const angle = Math.atan2(z, x);

  // -------------------------------------------------------------
  // 1. SUBMERGED OFFSHORE OCEAN BATHYMETRY
  // -------------------------------------------------------------
  if (distToCoast < -90) {
    // Deep ocean floor
    return {
      elevation: -16.0,
      slope: 0.0,
      surfaceType: "water",
      regionId: "water",
      color: [0.02, 0.10, 0.22],
    };
  }

  if (distToCoast < 0) {
    // Continental shallow shelf sloping up from -16.0m to 0.0m
    const t = (distToCoast + 90) / 90; // 0..1
    const elevation = -16.0 * (1 - t) * (1 - t);
    return {
      elevation,
      slope: 0.18,
      surfaceType: "sand",
      regionId: "water",
      color: [0.06 + t * 0.22, 0.32 + t * 0.22, 0.44 + t * 0.12], // Turquoise coastal shallows
    };
  }

  // -------------------------------------------------------------
  // 2. COASTLINE PROFILE (Rocky Sea Cliffs vs Sandy Beach vs Headlands)
  // -------------------------------------------------------------
  // Southwest Bluffs (Sentinel Cliffs, angle ~ 2.1 to 2.8 rad, excluding Pelican Cove sandy bay at -720, 580)
  const distPelicanCove = Math.hypot(x - (-720), z - 580);
  const isSouthwestCliff = angle > 2.0 && angle < 2.85 && distPelicanCove > 220;
  // Northwest Promontory (angle ~ -2.5 to -1.7 rad)
  const isNorthwestCape = angle < -1.7 && angle > -2.55;

  let baseCoastElevation = 0.25;
  let coastalRockWeight = 0.0;

  if (distToCoast < 80) {
    const tCoast = distToCoast / 80; // 0 at water line, 1 inland

    if (isSouthwestCliff) {
      // Sheer oceanic granite cliffs rising 18m to 24m above waves
      const cliffHeight = 20.0 + Math.sin(z * 0.03) * 4.0;
      baseCoastElevation = 1.5 + Math.pow(tCoast, 0.3) * (cliffHeight - 1.5);
      coastalRockWeight = 0.95;
    } else if (isNorthwestCape) {
      // Craggy rocky cape headland (14m to 18m)
      baseCoastElevation = 1.2 + Math.pow(tCoast, 0.38) * (16.0 - 1.2);
      coastalRockWeight = 0.8;
    } else {
      // Gentle sandy beaches (Pelican Cove crescent, East Metropolis shore, Harbor bay)
      // Waterline at +0.25m, rising smoothly to +2.0m inland
      baseCoastElevation = 0.25 + Math.sin((tCoast * Math.PI) / 2) * 1.75;
      coastalRockWeight = 0.05;
    }
  }

  // -------------------------------------------------------------
  // 3. NATURAL MULTI-TIER GEOGRAPHIC ELEVATION MODEL
  // Mountains -> Foothills -> Valleys -> Plains -> Coastal Lowlands
  // -------------------------------------------------------------

  // A. Broad Geographic Regional Swells
  // Northeast Emerald Hills (X: 300 to 950, Z: -800 to -150)
  const distEmeraldHills = Math.hypot(x - 550, z - (-480));
  const emeraldHillsWeight = Math.max(0, 1 - distEmeraldHills / 450);
  const emeraldHillsElev =
    Math.pow(emeraldHillsWeight, 1.8) * 32.0 +
    Math.sin(x * 0.015 + z * 0.012) * 6.0 * emeraldHillsWeight;

  // Western Forest Highlands (X: -950 to -350, Z: -200 to 350)
  const distForestHills = Math.hypot(x - (-650), z - 80);
  const forestHillsWeight = Math.max(0, 1 - distForestHills / 420);
  const forestHillsElev =
    Math.pow(forestHillsWeight, 1.5) * 22.0 +
    (Math.sin(x * 0.018) * Math.cos(z * 0.016) * 5.5 +
      Math.cos(x * 0.03 + z * 0.02) * 2.8) *
      forestHillsWeight;

  // Southeast Agricultural Terraces (X: 200 to 600, Z: 0 to 500)
  const distPlains = Math.hypot(x - 400, z - 250);
  const plainsWeight = Math.max(0, 1 - distPlains / 350);
  const rawPlains = Math.pow(plainsWeight, 1.4) * 35.0 + Math.sin(x * 0.02) * Math.cos(z * 0.02) * 12.0 * plainsWeight;
    const terraceHeight = 4.0;
    const terracedPlains = Math.floor(rawPlains / terraceHeight) * terraceHeight;
    const plainsElev = terracedPlains * plainsWeight;

  // Background Natural Undulation (Macro + Meso + Micro) - non-negative normalized harmonics
  const macroHills =
    ((Math.sin(x * 0.009 + 0.3) * Math.cos(z * 0.008 - 0.5) +
      Math.sin((x * 0.6 + z * 0.8) * 0.007) * 0.7) * 0.5 + 0.85) *
    4.5;

  const swells =
    ((Math.cos(x * 0.024) * Math.sin(z * 0.022) +
      Math.sin(x * 0.018 - z * 0.015)) * 0.5 + 1.0) *
    1.8;

  const microNoise =
    ((Math.sin(x * 0.065) * Math.cos(z * 0.060) +
      Math.cos(x * 0.045 + z * 0.042)) * 0.5 + 1.0) *
    0.6;

  // Base undulating inland terrain (guaranteed floor >= 2.2m MSL across all plains)
  let inlandElevation =
    2.2 +
    macroHills +
    swells +
    microNoise +
    emeraldHillsElev +
    forestHillsElev +
    plainsElev;

  inlandElevation = Math.max(2.2, inlandElevation);

  let activeRegion: RegionId = "training";
  let surface: SurfaceMaterialType = "grass";

  // B. NORTHWEST MOUNT APEX MASSIF (Connected alpine mountain system)
  // Peak 1: Apex Summit at (-620, -720), 145m MSL
  const distPeak1 = Math.hypot(x - (-620), z - (-720));
  // Peak 2: North Crest at (-450, -850), 118m MSL
  const distPeak2 = Math.hypot(x - (-450), z - (-850));
  // Peak 3: West Sentinel at (-780, -550), 102m MSL
  const distPeak3 = Math.hypot(x - (-780), z - (-550));

  const distMtnCenter = Math.hypot(x - (-620), z - (-700));

  if (distMtnCenter < 580) {
    activeRegion = "mountain";
    const mtnEnvelope = Math.max(0, 1 - distMtnCenter / 580);
    const mtnWeight = Math.pow(mtnEnvelope, 1.35);

    // Peak 1: Apex Summit (145m)
    const p1Weight = Math.max(0, 1 - distPeak1 / 400);
    const p1Elev = Math.pow(p1Weight, 2.1) * 142.0;

    // Peak 2: North Crest (118m)
    const p2Weight = Math.max(0, 1 - distPeak2 / 340);
    const p2Elev = Math.pow(p2Weight, 2.0) * 114.0;

    // Peak 3: West Sentinel (102m)
    const p3Weight = Math.max(0, 1 - distPeak3 / 320);
    const p3Elev = Math.pow(p3Weight, 2.0) * 98.0;

    // Connecting Knife-Edge Ridgelines between peaks
    // Ridge 1: Apex Summit to North Crest
    const ridge1Dist = distanceToSegment(x, z, -620, -720, -450, -850);
    const ridge1Weight = Math.max(0, 1 - ridge1Dist / 95);
    const ridge1Elev = Math.pow(ridge1Weight, 1.8) * 116.0;

    // Ridge 2: Apex Summit to West Sentinel
    const ridge2Dist = distanceToSegment(x, z, -620, -720, -780, -550);
    const ridge2Weight = Math.max(0, 1 - ridge2Dist / 90);
    const ridge2Elev = Math.pow(ridge2Weight, 1.8) * 104.0;

    // Ridge 3: South Spur towards Weather Station & Lake
    const ridge3Dist = distanceToSegment(x, z, -620, -720, -580, -560);
    const ridge3Weight = Math.max(0, 1 - ridge3Dist / 85);
    const ridge3Elev = Math.pow(ridge3Weight, 1.7) * 78.0;

    // Craggy alpine geological noise (scree chutes, couloirs, and rock ribs)
    const alpineDetail =
      Math.abs(Math.sin(x * 0.018 + z * 0.016)) * 18.0 +
      Math.abs(Math.cos(x * 0.028 - z * 0.024)) * 12.0 +
      Math.sin(x * 0.05 + z * 0.04) * 4.0;

    const massifElev =
      Math.max(p1Elev, p2Elev, p3Elev, ridge1Elev, ridge2Elev, ridge3Elev) +
      alpineDetail * mtnWeight;

    // Weather Station Helipad Terrace at (-580, -560) at 48.0m MSL
    const distToMtnPad = Math.hypot(x - (-580), z - (-560));
    if (distToMtnPad < 70) {
      const tPad = Math.max(0, (distToMtnPad - 24) / 46);
      const smoothPad = tPad * tPad * (3 - 2 * tPad);
      // North slopes up into summit spur, South slopes down into foothill valley
      const terraceHeight =
        z < -560
          ? 48.0 + (massifElev - 48.0) * smoothPad
          : 48.0 * (1 - smoothPad * 0.45);
      inlandElevation = terraceHeight;
    } else {
      inlandElevation = Math.max(inlandElevation, 4.5 + massifElev);
    }

    if (inlandElevation > 28.0) {
      surface = inlandElevation > 108.0 ? "scree" : "rock";
    }
  }

  // C. EXTENSIVE FOOTHILL SYSTEM (Transition from Mountain Massif to Plains)
  // Wrapping around southeastern flank of Mount Apex (X: -450 to -100, Z: -550 to -200)
  const distFoothills = Math.hypot(x - (-280), z - (-380));
  if (distFoothills < 320 && activeRegion !== "mountain") {
    const fWeight = Math.max(0, 1 - distFoothills / 320);
    const foothillHeight =
      Math.pow(fWeight, 1.4) * 36.0 +
      (Math.sin(x * 0.022) * Math.cos(z * 0.02) * 7.0 +
        Math.cos(x * 0.035 + z * 0.03) * 4.0) *
        fWeight;
    inlandElevation = Math.max(inlandElevation, 6.0 + foothillHeight);
  }

  // D. CRYSTAL MOUNTAIN LAKE BASIN (Natural mountain reservoir bowl at -320, -260)
  const distLake = Math.hypot(x - (-320), z - (-260));
  if (distLake < 145) {
    activeRegion = "river";
    const tLake = distLake / 145;
    // Bowl depression where lake water rests at Y = 8.5m MSL
    const basinDepth = (1 - tLake * tLake) * 6.5;
    inlandElevation = Math.min(inlandElevation, 8.5 - basinDepth);
    if (inlandElevation < 8.6) {
      surface = "mud";
    }
  }

  // E. VALLEY RIVER CANYON & TERRACES (Descending from lake waterfall to ocean estuary)
  if (z > -220 && z < 960 && x > -380 && x < 80) {
    const pZ = (z + 220) / (940 + 220); // 0 at lake, 1 at ocean
    // Exact river centerline matching freshwater-mesh.ts
    const riverX =
      -270 +
      pZ * 190 +
      Math.sin(pZ * Math.PI * 2.5) * 45 +
      Math.cos(pZ * Math.PI * 6.0) * 8;
    const distToRiver = Math.abs(x - riverX);
    const halfWidth = 12 + pZ * 18; // 12m at lake -> 30m at estuary

    // Generous river canyon corridor ensuring water is never covered by terrain
    if (distToRiver < halfWidth + 55) {
      activeRegion = "river";
      const waterSurfaceY = Math.max(0.18, 8.5 * (1 - pZ) + 0.08);
      const bedElevation = waterSurfaceY - 1.5;

      if (distToRiver < halfWidth + 6) {
        // Deep water channel completely beneath river surface
        inlandElevation = bedElevation;
        surface = "mud";
      } else {
        // Canyon walls rising smoothly to ambient terrain
        const tWall = (distToRiver - (halfWidth + 6)) / 49;
        const smoothWall = tWall * tWall * (3 - 2 * tWall);
        const canyonTop = waterSurfaceY + 3.8;
        inlandElevation = bedElevation * (1 - smoothWall) + Math.max(canyonTop, inlandElevation) * smoothWall;
        if (tWall < 0.35) {
          surface = "rock";
        }
      }
    }
  }

  // F. CENTRAL FLIGHT ACADEMY PLATEAU (Center at 0, 0)
  const distCenter = Math.hypot(x, z);
  if (distCenter < 240) {
    activeRegion = "training";
    // Leveled runway & apron plateau at 1.2m MSL blending into gentle meadow
    if (distCenter < 65) {
      inlandElevation = 1.2;
    } else {
      const t = (distCenter - 65) / 175;
      const smoothT = t * t * (3 - 2 * t);
      inlandElevation = 1.2 * (1 - smoothT) + inlandElevation * smoothT;
    }
    surface = "grass";
  }

  // G. WEST: WHISPERING PINES FOREST (Center ~ -640, 20)
  const distForest = Math.hypot(x - (-640), z - 20);
  const distToForestPad = Math.hypot(x - (-620), z - (-40));

  if (distToForestPad < 48) {
    activeRegion = "forest";
    // Ranger Station helipad clearing at (-620, -40) at 5.5m MSL
    if (distToForestPad <= 22) {
      inlandElevation = 5.5;
    } else {
      const tPad = (distToForestPad - 22) / 26;
      const smoothPad = tPad * tPad * (3 - 2 * tPad);
      inlandElevation = 5.5 * (1 - smoothPad) + inlandElevation * smoothPad;
    }
    surface = "grass";
  } else if (distForest < 480 && activeRegion !== "river" && activeRegion !== "mountain") {
    activeRegion = "forest";
    surface = "grass";
  }

  // H. EAST: DOWNTOWN METROPOLIS (Skyscraper plateau, center ~ 720, 320)
  const distCity = Math.hypot(x - 720, z - 320);
  if (distCity < 420 && activeRegion !== "river") {
    activeRegion = "city";
    // Foundation under vertiport terminal at 2.5m MSL
    const distToCityAlpha = Math.hypot(x - 640, z - 320);
    if (distToCityAlpha < 42) {
      inlandElevation = 2.5;
    } else {
      const cityPlane = 2.5 + Math.sin(x * 0.012) * 0.5;
      const tCity = Math.min(1, (distCity - 120) / 280);
      inlandElevation = cityPlane * (1 - tCity) + inlandElevation * tCity;
    }
    surface = "grass";
  }

  // I. SOUTH/SOUTHEAST: HARBOR INDUSTRIAL PARK (Center ~ 380, 780)
  const distInd = Math.hypot(x - 380, z - 780);
  if (distInd < 350 && activeRegion !== "river") {
    activeRegion = "industrial";
    const distToIndPad = Math.hypot(x - 380, z - 780);
    if (distToIndPad < 48) {
      if (distToIndPad <= 22) {
        inlandElevation = 1.8;
      } else {
        const tPad = (distToIndPad - 22) / 26;
        const smoothPad = tPad * tPad * (3 - 2 * tPad);
        inlandElevation = 1.8 * (1 - smoothPad) + inlandElevation * smoothPad;
      }
    } else {
      const tInd = Math.min(1, distInd / 320);
      inlandElevation = 1.8 * (1 - tInd) + inlandElevation * tInd;
    }
    surface = "grass";
  }

  // J. SOUTHWEST: PELICAN COVE (Center ~ -720, 580)
  const distCoast = Math.hypot(x - (-720), z - 580);
  if (distCoast < 380 && activeRegion !== "river") {
    activeRegion = "coast";
    const distToCoastPad = Math.hypot(x - (-720), z - 580);
    if (distToCoastPad < 48) {
      if (distToCoastPad <= 22) {
        inlandElevation = 2.0;
      } else {
        const tPad = (distToCoastPad - 22) / 26;
        const smoothPad = tPad * tPad * (3 - 2 * tPad);
        inlandElevation = 2.0 * (1 - smoothPad) + inlandElevation * smoothPad;
      }
    }
  }

  // -------------------------------------------------------------
  // 4. MERGE COASTLINE SHAPING WITH INLAND ELEVATION
  // -------------------------------------------------------------
  let finalElevation = inlandElevation;

  if (distToCoast < 85) {
    const t = distToCoast / 85;
    finalElevation = baseCoastElevation * (1 - t) + inlandElevation * t;
    if (coastalRockWeight > 0.4) {
      surface = "rock";
    } else if (distToCoast < 42 && !isSouthwestCliff && !isNorthwestCape) {
      surface = "sand";
    }
  }

  // Ensure pad foundations are leveled in final elevation
  const distToInd = Math.hypot(x - 380, z - 780);
  if (distToInd < 45) {
    const tPad = Math.max(0, (distToInd - 20) / 25);
    finalElevation = 1.8 * (1 - tPad * tPad * (3 - 2 * tPad)) + finalElevation * (tPad * tPad * (3 - 2 * tPad));
  }
  const distToCoastPadFinal = Math.hypot(x - (-720), z - 580);
  if (distToCoastPadFinal < 45) {
    const tPad = Math.max(0, (distToCoastPadFinal - 20) / 25);
    finalElevation = 2.0 * (1 - tPad * tPad * (3 - 2 * tPad)) + finalElevation * (tPad * tPad * (3 - 2 * tPad));
  }

  // Calculate terrain slope from local elevation gradients
  const eps = 2.5;
  const hx = (Math.sin((x + eps) * 0.014) - Math.sin((x - eps) * 0.014)) * 4.2;
  const hz = (Math.cos((z + eps) * 0.012) - Math.cos((z - eps) * 0.012)) * 4.2;
  let slope = Math.min(1.0, Math.hypot(hx, hz) / (2 * eps));

  // Increase slope sensitivity in mountain / cliff zones
  if (activeRegion === "mountain" || isSouthwestCliff || isNorthwestCape) {
    const mtnSlopeFactor = Math.min(1.0, finalElevation / 80.0);
    slope = Math.min(1.0, slope + mtnSlopeFactor * 0.35);
  }

  // Steep rock outcrops breaking through vegetation
  if (slope > 0.38 && finalElevation > 10.0 && surface !== "sand") {
    surface = "rock";
  }

  // -------------------------------------------------------------
  // 5. CONTINUOUS BIOME COLOR SPLATTING FOR VERTEX SHADING
  // -------------------------------------------------------------
  // Smoothly blended RGB palette based on elevation, slope, and surface type
  let r = 0.25;
  let g = 0.44;
  let b = 0.18;

  if (surface === "sand") {
    // Golden dune sand with subtle wetness near water
    const wetness = Math.max(0, 1 - Math.max(0, finalElevation) / 1.5);
    r = 0.85 * (1 - wetness * 0.25);
    g = 0.74 * (1 - wetness * 0.25);
    b = 0.50 * (1 - wetness * 0.30);
  } else if (surface === "mud") {
    // Dark river silt / lake sediment
    r = 0.28;
    g = 0.23;
    b = 0.16;
  } else if (surface === "scree" || finalElevation > 105.0) {
    // Alpine summit granite / snow / scree
    const snowWeight = Math.max(0, Math.min(1, (finalElevation - 110.0) / 28.0));
    r = 0.52 * (1 - snowWeight) + 0.90 * snowWeight;
    g = 0.54 * (1 - snowWeight) + 0.92 * snowWeight;
    b = 0.56 * (1 - snowWeight) + 0.96 * snowWeight;
  } else if (surface === "rock" || slope > 0.42) {
    // Stratified weathered granite rock
    const rockSlope = Math.min(1.0, slope);
    r = 0.42 * (1 - rockSlope * 0.15);
    g = 0.41 * (1 - rockSlope * 0.15);
    b = 0.40 * (1 - rockSlope * 0.10);
  } else {
    // Continuous Vegetation Gradient:
    // Lowland lush meadow (0m-20m) -> Highland alpine grass (20m-70m)
    const altFactor = Math.max(0, Math.min(1, finalElevation / 65.0));

    // Lowland lush grass: [0.26, 0.46, 0.18]
    // Highland olive alpine: [0.34, 0.40, 0.19]
    // Forest deep emerald: [0.20, 0.34, 0.16]
    if (activeRegion === "forest") {
      r = 0.20 * (1 - altFactor) + 0.28 * altFactor;
      g = 0.35 * (1 - altFactor) + 0.38 * altFactor;
      b = 0.16 * (1 - altFactor) + 0.19 * altFactor;
    } else {
      r = 0.26 * (1 - altFactor) + 0.36 * altFactor;
      g = 0.46 * (1 - altFactor) + 0.38 * altFactor;
      b = 0.18 * (1 - altFactor) + 0.20 * altFactor;
    }

    // Blend rock into grass on steeper slopes (0.28 - 0.42)
    if (slope > 0.28) {
      const rockBlend = (slope - 0.28) / (0.42 - 0.28);
      r = r * (1 - rockBlend) + 0.42 * rockBlend;
      g = g * (1 - rockBlend) + 0.41 * rockBlend;
      b = b * (1 - rockBlend) + 0.40 * rockBlend;
    }
  }

  return {
    elevation: Math.max(-16.0, finalElevation),
    slope,
    surfaceType: surface,
    regionId: activeRegion,
    color: [r, g, b],
  };
}

/**
 * Helper: distance from point (px, pz) to line segment (x1, z1) -> (x2, z2)
 */
function distanceToSegment(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
  if (l2 === 0) return Math.hypot(px - x1, pz - z1);
  let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), pz - (z1 + t * (z2 - z1)));
}

