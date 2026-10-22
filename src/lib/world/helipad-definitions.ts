// ==========================================================
// DRONE PILOT — CANONICAL HELIPAD REGISTRY
// Powered by the master WorldDefinition specification
// ==========================================================

import { Helipad } from "./world-types";
import { HELIPADS_RECORD } from "./world-definition";

export const HELIPADS: Record<string, Helipad> = HELIPADS_RECORD;

export const HELIPAD_LIST = Object.values(HELIPADS);

