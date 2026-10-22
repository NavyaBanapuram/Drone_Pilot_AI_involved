// ==========================================================
// DRONE PILOT — PRECISION LANDING DATASET SCHEMA SPECIFICATION
// Standardized schema definitions for synthetic ResNeXt vision
// training, bounding-box annotations, relative pose estimation,
// and Snowflake flight analytics.
// ==========================================================

import { DroneCategory, FlightMode } from "../simulation/types";

/**
 * 8 Standardized landing scene categories matching the ResNeXt
 * transfer-learning & hybrid random forest classification architecture.
 */
export type LandingSceneCategory =
  | "Building"
  | "Field"
  | "Lawn"
  | "Mountain"
  | "Road"
  | "Vehicles"
  | "WaterArea"
  | "Wilderness";

export const LANDING_SCENE_CATEGORIES: LandingSceneCategory[] = [
  "Building",
  "Field",
  "Lawn",
  "Mountain",
  "Road",
  "Vehicles",
  "WaterArea",
  "Wilderness",
];

/**
 * Maps each of the 9 DronePilot island helipads to its primary visual landing scene category.
 */
export const HELIPAD_SCENE_MAP: Record<string, LandingSceneCategory> = {
  "city-apex-rooftop": "Building",
  "training-alpha": "Field",
  "training-bravo": "Lawn",
  "mountain-alpha": "Mountain",
  "river-alpha": "Road",
  "industrial-alpha": "Vehicles",
  "coast-alpha": "WaterArea",
  "forest-alpha": "Wilderness",
  "city-alpha": "Road",
};

export type TargetVisibility =
  | "FULLY_VISIBLE"
  | "PARTIALLY_VISIBLE"
  | "OUT_OF_FRAME"
  | "BEHIND_CAMERA"
  | "EXCESSIVE_DISTANCE";

export type InvalidReasonCode =
  | "NONE"
  | "OUT_OF_FRAME"
  | "BEHIND_CAMERA"
  | "ALTITUDE_OUT_OF_RANGE"
  | "EXTREME_TILT"
  | "TOO_FAR_OFF_AXIS";

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface EulerDegrees {
  pitchDeg: number;
  rollDeg: number;
  yawDeg: number;
}

export interface BoundingBox2D {
  xMin: number; // 0.0 to 1.0 (normalized) or pixels
  yMin: number;
  xMax: number;
  yMax: number;
}

export interface NormalizedCenter2D {
  u: number; // 0.0 (left) to 1.0 (right)
  v: number; // 0.0 (top) to 1.0 (bottom)
}

export interface PixelCenter2D {
  x: number; // 0 to imageWidth
  y: number; // 0 to imageHeight
}

export interface RelativePose {
  dx: number; // meters (lateral aircraft right/east relative to pad)
  dy: number; // meters (aircraft altitude relative to pad surface elevation)
  dz: number; // meters (longitudinal aircraft forward/north relative to pad)
  dYawDeg: number; // degrees (heading difference between aircraft and pad)
  distance3d: number; // Euclidean 3D distance in meters
}

/**
 * Complete synchronized dataset sample record linking image,
 * ground truth geometry, detection bounding box, and flight telemetry.
 */
export interface DatasetSampleRecord {
  // Identification & Lineage
  sampleId: string; // e.g. "sample_run_xxx_000042"
  flightRunId: string; // Unique flight run lineage
  sequenceNumber: number; // Monotonic frame index within flight run
  simulationTimestampSeconds: number; // Monotonic simulation time
  timestampIso: string; // UTC ISO-8601 recording timestamp
  imageFilename: string; // e.g. "images/sample_run_xxx_000042.png"

  // Environment & Helipad Identity
  targetHelipadId: string; // e.g. "training-alpha"
  sceneCategory: LandingSceneCategory; // ResNeXt scene classification target
  surfaceType: "concrete" | "steel" | "wood" | "rooftop" | "turf";
  helipadWorldCenter: Vector3D;
  helipadRadiusMeters: number;

  // Aircraft & Downward Optical Sensor Pose
  airframeType: DroneCategory;
  droneWorldPosition: Vector3D;
  droneAttitude: EulerDegrees;
  altitudeAglMeters: number;
  altitudeAbovePadMeters: number;
  cameraFovDegrees: number;
  imageResolution: {
    width: number; // 224 default
    height: number; // 224 default
  };

  // Geometric Projection & Bounding Box Annotations
  projection: {
    centerNorm: NormalizedCenter2D; // (0,0) top-left, (1,1) bottom-right
    centerPixel: PixelCenter2D; // [0, 224]
    bboxNorm: BoundingBox2D; // [0.0 - 1.0]
    bboxPixel: BoundingBox2D; // [0 - 224]
    apparentRadiusPixels: number;
    isTruncated: boolean; // True if pad boundary intersects image border
  };

  // Relative 3D Pose (Target guidance for precision descent)
  relativePose: RelativePose;

  // Detection Label & Quality Filter
  detection: {
    isValidTarget: boolean; // True only if pad is detectable and in-frame
    visibility: TargetVisibility;
    invalidReasonCode: InvalidReasonCode;
  };

  // Synchronized Blackbox Telemetry Snapshot
  telemetry: {
    flightTimeSeconds: number;
    flightMode: FlightMode;
    groundSpeedKmh: number;
    verticalSpeedMs: number;
    batteryPercent: number;
    batteryVoltageV?: number;
    motorOutputs: number[];
  };
}

export interface DatasetSplitManifest {
  datasetName: string;
  version: string;
  createdIso: string;
  totalSamples: number;
  totalFlightRuns: number;
  splits: {
    train: {
      flightRunIds: string[];
      sampleIds: string[];
      sampleCount: number;
      percentage: number;
    };
    val: {
      flightRunIds: string[];
      sampleIds: string[];
      sampleCount: number;
      percentage: number;
    };
    test: {
      flightRunIds: string[];
      sampleIds: string[];
      sampleCount: number;
      percentage: number;
    };
  };
}

export interface DatasetSummaryReport {
  datasetName: string;
  totalSamples: number;
  validTargetsCount: number;
  invalidTargetsCount: number;
  negativeSamplePercentage: number;
  countsByHelipad: Record<string, number>;
  countsBySceneCategory: Record<LandingSceneCategory, number>;
  countsByVisibility: Record<TargetVisibility, number>;
  countsByInvalidReason: Record<InvalidReasonCode, number>;
  altitudeDistributionMeters: {
    min: number;
    max: number;
    mean: number;
  };
  splits: {
    train: number;
    val: number;
    test: number;
  };
}
