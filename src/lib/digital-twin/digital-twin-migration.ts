// ==========================================================
// DRONE PILOT — PHASE 6: CONFIGURATION SCHEMA MIGRATION
// Safely upgrades older saved configuration schemas to newer versions.
// ==========================================================

import { DroneDigitalTwinConfiguration } from "@/types/drone-digital-twin";

export const CURRENT_SCHEMA_VERSION = "1.0";

/**
 * Validates and migrates a raw Digital Twin configuration payload.
 */
export function migrateDigitalTwinConfig(rawConfig: any): DroneDigitalTwinConfiguration {
  if (!rawConfig) {
    throw new Error("Cannot migrate null configuration.");
  }

  let migrated = JSON.parse(JSON.stringify(rawConfig));

  // Determine current schema version
  const version = migrated.digitalTwinSchemaVersion || "1.0";

  if (version === "1.0") {
    // Current target version. Ensure it has the version tag explicitly.
    migrated.digitalTwinSchemaVersion = "1.0";
    // Add any missing fields for 1.0 baseline if necessary
    if (!migrated.identity) {
      migrated.identity = {};
    }
    migrated.identity.configurationVersion = migrated.identity.configurationVersion || "1.0";
  } else {
    // Future: 1.0 -> 1.1 -> 1.2
    console.warn(`Encountered unknown schema version: ${version}. Attempting to parse as ${CURRENT_SCHEMA_VERSION}.`);
  }

  return migrated as DroneDigitalTwinConfiguration;
}
