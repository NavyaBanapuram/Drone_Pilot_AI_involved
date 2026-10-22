// ==========================================================
// DRONE PILOT — DYNAMIC SPAWN SYSTEM
// Resolves starting coordinates, elevations, and orientations across all helipads
// ==========================================================

import { SpawnConfiguration, RegionId } from "./world-types";
import { HELIPADS } from "./helipad-definitions";
import { REGIONS } from "./region-definitions";

export class SpawnSystem {
  // Height offset from helipad surface to drone center of mass (spawns in a stable hover above pad)
  public static readonly DRONE_SKID_VERTICAL_OFFSET = 1.5;

  /**
   * Resolves a fully qualified spawn configuration.
   * Defaults gracefully to Central Training Helipad Alpha if unspecified.
   */
  public static resolveSpawn(
    requestedRegionId?: string | null,
    requestedHelipadId?: string | null
  ): SpawnConfiguration {
    // 1. Check if random dropzone was requested
    if (requestedHelipadId === "random") {
      const spawnable = SpawnSystem.getSpawnableHelipads();
      const randomPad = spawnable[Math.floor(Math.random() * spawnable.length)] || HELIPADS["training-alpha"];
      return SpawnSystem.createConfigForHelipad(randomPad);
    }

    // 2. Check if specific helipad ID was directly requested
    let targetHelipad = requestedHelipadId ? HELIPADS[requestedHelipadId] : null;

    // 3. If no valid helipad, check requested region's primary helipad
    if (!targetHelipad && requestedRegionId && REGIONS[requestedRegionId]) {
      const region = REGIONS[requestedRegionId];
      targetHelipad = HELIPADS[region.primaryHelipadId] || null;
    }

    // 4. If neither specified, always spawn at the primary training helipad (not random)
    if (!targetHelipad) {
      targetHelipad = HELIPADS["training-alpha"];
    }

    return SpawnSystem.createConfigForHelipad(targetHelipad);
  }

  public static createConfigForHelipad(targetHelipad: typeof HELIPADS[string]): SpawnConfiguration {
    const groundElevation = targetHelipad.elevation;
    const droneSpawnY = groundElevation + SpawnSystem.DRONE_SKID_VERTICAL_OFFSET;

    return {
      spawnId: `spawn-${targetHelipad.id}`,
      regionId: targetHelipad.regionId as RegionId,
      helipadId: targetHelipad.id,
      position: {
        x: targetHelipad.position.x,
        y: droneSpawnY,
        z: targetHelipad.position.z,
      },
      rotation: {
        pitch: 0,
        roll: 0,
        yaw: (targetHelipad.headingDeg * Math.PI) / 180,
      },
      groundElevation,
    };
  }

  /**
   * Get all registered helipads available for pilot spawning
   */
  public static getSpawnableHelipads() {
    return Object.values(HELIPADS).filter((h) => h.spawnAllowed);
  }
}
