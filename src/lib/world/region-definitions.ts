// ==========================================================
// DRONE PILOT — CANONICAL REGION REGISTRY
// Powered by the master WorldDefinition specification
// ==========================================================

import { RegionDefinition, RegionId } from "./world-types";
import { REGIONS_RECORD } from "./world-definition";

export const REGIONS: Record<string, RegionDefinition> = REGIONS_RECORD;

export const REGION_LIST = Object.values(REGIONS);

