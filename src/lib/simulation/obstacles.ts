// ==========================================================
// DRONE PILOT — 3D WORLD OBSTACLE REGISTRY & COLLISION SYSTEM
// Accurate 3D collision bounding boxes for skyscrapers, commercial
// buildings, warehouses, bridges, windmills, and communication masts
// ==========================================================

export interface ObstacleBox {
  name: string;
  type: "building" | "skyscraper" | "warehouse" | "bridge" | "windmill" | "mast" | "tree";
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export const WORLD_OBSTACLES: ObstacleBox[] = [
  // 1. Downtown Metropolis Skyscrapers & Towers
  {
    name: "Apex Center Skyscraper",
    type: "skyscraper",
    minX: 742,
    maxX: 778,
    minY: 2.5,
    maxY: 68.0,
    minZ: 342,
    maxZ: 378,
  },
  {
    name: "Financial Plaza Tower 1",
    type: "skyscraper",
    minX: 658,
    maxX: 682,
    minY: 2.5,
    maxY: 75.0,
    minZ: 258,
    maxZ: 282,
  },
  {
    name: "Financial Plaza Tower 2",
    type: "skyscraper",
    minX: 656,
    maxX: 684,
    minY: 2.5,
    maxY: 80.0,
    minZ: 366,
    maxZ: 394,
  },
  {
    name: "Metropolis Commercial Spire",
    type: "skyscraper",
    minX: 698,
    maxX: 722,
    minY: 2.5,
    maxY: 88.0,
    minZ: 408,
    maxZ: 432,
  },
  {
    name: "North Avenue Tower",
    type: "skyscraper",
    minX: 698,
    maxX: 722,
    minY: 2.5,
    maxY: 72.0,
    minZ: 208,
    maxZ: 232,
  },
  {
    name: "Apex East Tower",
    type: "skyscraper",
    minX: 798,
    maxX: 822,
    minY: 2.5,
    maxY: 76.0,
    minZ: 258,
    maxZ: 282,
  },
  {
    name: "East Boulevard Tower",
    type: "skyscraper",
    minX: 798,
    maxX: 822,
    minY: 2.5,
    maxY: 70.0,
    minZ: 368,
    maxZ: 392,
  },
  {
    name: "Summit Avenue Skyscraper",
    type: "skyscraper",
    minX: 826,
    maxX: 854,
    minY: 2.5,
    maxY: 82.0,
    minZ: 306,
    maxZ: 334,
  },
  {
    name: "City Vertiport Terminal",
    type: "building",
    minX: 598,
    maxX: 622,
    minY: 2.5,
    maxY: 12.0,
    minZ: 304,
    maxZ: 336,
  },

  // 2. Industrial Harbor Facilities
  {
    name: "Port Cargo Terminal Warehouse 1",
    type: "warehouse",
    minX: 355,
    maxX: 405,
    minY: 1.5,
    maxY: 18.0,
    minZ: 755,
    maxZ: 805,
  },
  {
    name: "Port Cargo Terminal Warehouse 2",
    type: "warehouse",
    minX: 445,
    maxX: 495,
    minY: 1.5,
    maxY: 17.0,
    minZ: 795,
    maxZ: 845,
  },
  {
    name: "Industrial Fuel Storage Depot",
    type: "warehouse",
    minX: 305,
    maxX: 335,
    minY: 1.5,
    maxY: 16.0,
    minZ: 705,
    maxZ: 735,
  },
  {
    name: "Deepwater Gantry Crane",
    type: "building",
    minX: 405,
    maxX: 435,
    minY: 1.5,
    maxY: 32.0,
    minZ: 845,
    maxZ: 875,
  },

  // 3. Bridges
  {
    name: "Grand Valley Canyon Bridge",
    type: "bridge",
    minX: -185,
    maxX: -95,
    minY: 3.2,
    maxY: 6.8,
    minZ: 135,
    maxZ: 185,
  },
  {
    name: "Southern Estuary Maritime Bridge",
    type: "bridge",
    minX: -145,
    maxX: -35,
    minY: 1.8,
    maxY: 5.5,
    minZ: 835,
    maxZ: 865,
  },

  // 4. Rural Homesteads & Windmills
  {
    name: "Emerald Grassland Farmhouse",
    type: "building",
    minX: 212,
    maxX: 228,
    minY: 3.5,
    maxY: 11.0,
    minZ: 72,
    maxZ: 88,
  },
  {
    name: "Emerald Grassland Red Barn",
    type: "building",
    minX: 232,
    maxX: 252,
    minY: 3.5,
    maxY: 13.0,
    minZ: 62,
    maxZ: 82,
  },
  {
    name: "Emerald Pasture Windmill",
    type: "windmill",
    minX: 186,
    maxX: 194,
    minY: 3.5,
    maxY: 24.0,
    minZ: 116,
    maxZ: 124,
  },
  {
    name: "Valley River Ranch Barn",
    type: "building",
    minX: -100,
    maxX: -80,
    minY: 2.0,
    maxY: 11.0,
    minZ: 370,
    maxZ: 390,
  },
  {
    name: "Southern Coastal Windmill",
    type: "windmill",
    minX: -544,
    maxX: -536,
    minY: 2.5,
    maxY: 23.0,
    minZ: 416,
    maxZ: 424,
  },

  // 5. High-Altitude Towers & Masts
  {
    name: "Mount Apex Summit Radio Mast",
    type: "mast",
    minX: -638,
    maxX: -630,
    minY: 145.0,
    maxY: 172.0,
    minZ: -738,
    maxZ: -730,
  },
  {
    name: "Whispering Pines Watchtower",
    type: "mast",
    minX: -601,
    maxX: -589,
    minY: 5.5,
    maxY: 24.0,
    minZ: -66,
    maxZ: -54,
  },
];

export interface ObstacleHitResult {
  hit: boolean;
  name: string;
  type: string;
  box: ObstacleBox;
}

import { HELIPAD_LIST } from "@/lib/world/helipad-definitions";

/**
 * Checks whether an aircraft sphere intersects any registered island building, bridge, or tower
 */
export function checkObstacleCollision(
  x: number,
  y: number,
  z: number,
  droneRadius = 0.55
): ObstacleHitResult | null {
  // Designated Helipad Landing Clearances:
  // If the drone is inside the perimeter of any official island helipad and at or above
  // its platform surface, it is safely in an operational landing zone, never colliding with obstacles.
  for (const h of HELIPAD_LIST) {
    const rad = (h.dimensions.radius || h.dimensions.width / 2) + 0.5;
    const distSq = (x - h.position.x) * (x - h.position.x) + (z - h.position.z) * (z - h.position.z);
    if (distSq <= rad * rad && y >= h.elevation - 0.35) {
      return null;
    }
  }

  for (const obs of WORLD_OBSTACLES) {
    // If the drone is at or above the rooftop surface (e.g. landing on rooftop helipad/skyport),
    // it is resting/hovering safely on the roof, not colliding with building walls.
    if (y >= obs.maxY - 0.15) {
      continue;
    }

    if (
      x >= obs.minX - droneRadius &&
      x <= obs.maxX + droneRadius &&
      z >= obs.minZ - droneRadius &&
      z <= obs.maxZ + droneRadius &&
      y >= obs.minY &&
      y <= obs.maxY
    ) {
      return {
        hit: true,
        name: obs.name,
        type: obs.type,
        box: obs,
      };
    }
  }
  return null;
}
