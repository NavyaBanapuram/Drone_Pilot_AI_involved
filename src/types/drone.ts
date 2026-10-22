export type DroneType = "quadcopter" | "hexacopter" | "octacopter";

export interface DroneSpecs {
  rotors: number;
  handling: string;
  maxLift: string;
  stability: string;
  weightClass: string;
}

export interface DroneModel {
  id: string; // Unique ID for the preset (e.g. "aero-trainer-x4")
  platformId: DroneType; // Maps to the 3D renderer (quadcopter, hexacopter, etc)
  platformCategory: string; // "Multirotor", "Fixed-Wing", etc.
  missionCategory: string; // "Training", "Agriculture", "Inspection", etc.
  name: string;
  tagline: string;
  description: string;
  whyThisAircraft: string; // Educational explanation
  image: string;
  badge: string;
  
  // High-level config overview for the info modal
  baseMassKg: number;
  batteryCells: number;
  defaultPayloadKg: number;
  sensors: string[];
}
