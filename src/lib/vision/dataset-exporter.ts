// ==========================================================
// DRONE PILOT — DATASET EXPORTER & SPLIT MANIFEST GENERATOR
// Leakage-proof flight-run dataset partitioning (70/15/15),
// JSONL/CSV serialization, and dataset schema validation.
// ==========================================================

import {
  DatasetSampleRecord,
  DatasetSplitManifest,
  DatasetSummaryReport,
  LandingSceneCategory,
  TargetVisibility,
  InvalidReasonCode,
  LANDING_SCENE_CATEGORIES,
} from "./dataset-schema";
import { SeededRng } from "./scenario-generator";

export function splitDatasetByFlightRun(
  records: DatasetSampleRecord[],
  trainRatio = 0.7,
  valRatio = 0.15,
  _testRatio = 0.15,
  seed = 4242
): DatasetSplitManifest {
  // 1. Group records by unique flightRunId
  const runMap = new Map<string, DatasetSampleRecord[]>();
  for (const rec of records) {
    if (!runMap.has(rec.flightRunId)) {
      runMap.set(rec.flightRunId, []);
    }
    runMap.get(rec.flightRunId)!.push(rec);
  }

  const uniqueRunIds = Array.from(runMap.keys());
  const rng = new SeededRng(seed);

  // Deterministic Fisher-Yates shuffle of flight runs
  const shuffledRuns = [...uniqueRunIds];
  for (let i = shuffledRuns.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffledRuns[i], shuffledRuns[j]] = [shuffledRuns[j], shuffledRuns[i]];
  }

  // Calculate split cutoffs by complete flight runs
  const totalRuns = shuffledRuns.length;
  let trainCount = Math.max(1, Math.round(totalRuns * trainRatio));
  let valCount = Math.max(1, Math.round(totalRuns * valRatio));

  if (totalRuns >= 3) {
    if (trainCount + valCount >= totalRuns) {
      valCount = Math.max(1, totalRuns - trainCount - 1);
    }
  }

  const trainRunIds = new Set(shuffledRuns.slice(0, trainCount));
  const valRunIds = new Set(shuffledRuns.slice(trainCount, trainCount + valCount));
  const testRunIds = new Set(shuffledRuns.slice(trainCount + valCount));

  // If very few runs, ensure test has remaining
  if (testRunIds.size === 0 && totalRuns > 1) {
    const lastVal = Array.from(valRunIds).pop();
    if (lastVal && valRunIds.size > 1) {
      valRunIds.delete(lastVal);
      testRunIds.add(lastVal);
    }
  }

  const trainSamples: string[] = [];
  const valSamples: string[] = [];
  const testSamples: string[] = [];

  for (const rec of records) {
    if (trainRunIds.has(rec.flightRunId)) {
      trainSamples.push(rec.sampleId);
    } else if (valRunIds.has(rec.flightRunId)) {
      valSamples.push(rec.sampleId);
    } else {
      testSamples.push(rec.sampleId);
    }
  }

  const totalSamples = records.length;

  return {
    datasetName: "DronePilot-Precision-Landing-Dataset",
    version: "1.0.0",
    createdIso: new Date().toISOString(),
    totalSamples,
    totalFlightRuns: totalRuns,
    splits: {
      train: {
        flightRunIds: Array.from(trainRunIds),
        sampleIds: trainSamples,
        sampleCount: trainSamples.length,
        percentage: totalSamples > 0 ? Math.round((trainSamples.length / totalSamples) * 1000) / 10 : 0,
      },
      val: {
        flightRunIds: Array.from(valRunIds),
        sampleIds: valSamples,
        sampleCount: valSamples.length,
        percentage: totalSamples > 0 ? Math.round((valSamples.length / totalSamples) * 1000) / 10 : 0,
      },
      test: {
        flightRunIds: Array.from(testRunIds),
        sampleIds: testSamples,
        sampleCount: testSamples.length,
        percentage: totalSamples > 0 ? Math.round((testSamples.length / totalSamples) * 1000) / 10 : 0,
      },
    },
  };
}

export function generateDatasetSummary(
  records: DatasetSampleRecord[],
  manifest: DatasetSplitManifest
): DatasetSummaryReport {
  const countsByHelipad: Record<string, number> = {};
  const countsBySceneCategory: Record<LandingSceneCategory, number> = {
    Building: 0,
    Field: 0,
    Lawn: 0,
    Mountain: 0,
    Road: 0,
    Vehicles: 0,
    WaterArea: 0,
    Wilderness: 0,
  };
  const countsByVisibility: Record<TargetVisibility, number> = {
    FULLY_VISIBLE: 0,
    PARTIALLY_VISIBLE: 0,
    OUT_OF_FRAME: 0,
    BEHIND_CAMERA: 0,
    EXCESSIVE_DISTANCE: 0,
  };
  const countsByInvalidReason: Record<InvalidReasonCode, number> = {
    NONE: 0,
    OUT_OF_FRAME: 0,
    BEHIND_CAMERA: 0,
    ALTITUDE_OUT_OF_RANGE: 0,
    EXTREME_TILT: 0,
    TOO_FAR_OFF_AXIS: 0,
  };

  let validCount = 0;
  let invalidCount = 0;
  let minAlt = Infinity;
  let maxAlt = -Infinity;
  let sumAlt = 0;

  for (const r of records) {
    countsByHelipad[r.targetHelipadId] = (countsByHelipad[r.targetHelipadId] || 0) + 1;
    countsBySceneCategory[r.sceneCategory] = (countsBySceneCategory[r.sceneCategory] || 0) + 1;
    countsByVisibility[r.detection.visibility] = (countsByVisibility[r.detection.visibility] || 0) + 1;
    countsByInvalidReason[r.detection.invalidReasonCode] =
      (countsByInvalidReason[r.detection.invalidReasonCode] || 0) + 1;

    if (r.detection.isValidTarget) {
      validCount++;
    } else {
      invalidCount++;
    }

    const alt = r.altitudeAbovePadMeters;
    if (alt < minAlt) minAlt = alt;
    if (alt > maxAlt) maxAlt = alt;
    sumAlt += alt;
  }

  const total = records.length;
  const negativePct = total > 0 ? Math.round((invalidCount / total) * 1000) / 10 : 0;

  return {
    datasetName: manifest.datasetName,
    totalSamples: total,
    validTargetsCount: validCount,
    invalidTargetsCount: invalidCount,
    negativeSamplePercentage: negativePct,
    countsByHelipad,
    countsBySceneCategory,
    countsByVisibility,
    countsByInvalidReason,
    altitudeDistributionMeters: {
      min: minAlt !== Infinity ? Math.round(minAlt * 10) / 10 : 0,
      max: maxAlt !== -Infinity ? Math.round(maxAlt * 10) / 10 : 0,
      mean: total > 0 ? Math.round((sumAlt / total) * 10) / 10 : 0,
    },
    splits: {
      train: manifest.splits.train.sampleCount,
      val: manifest.splits.val.sampleCount,
      test: manifest.splits.test.sampleCount,
    },
  };
}

export function formatRecordsToJSONL(records: DatasetSampleRecord[]): string {
  return records.map((r) => JSON.stringify(r)).join("\n");
}

export const DATASET_CSV_HEADERS = [
  "Sample_ID",
  "Flight_Run_ID",
  "Sequence_Number",
  "Simulation_Time_S",
  "Timestamp_ISO",
  "Image_Filename",
  "Target_Helipad_ID",
  "Scene_Category",
  "Surface_Type",
  "Drone_X_M",
  "Drone_Y_M",
  "Drone_Z_M",
  "Drone_Pitch_Deg",
  "Drone_Roll_Deg",
  "Drone_Yaw_Deg",
  "Altitude_AGL_M",
  "Altitude_Above_Pad_M",
  "Rel_Pose_DX_M",
  "Rel_Pose_DY_M",
  "Rel_Pose_DZ_M",
  "Rel_Pose_DYaw_Deg",
  "Rel_Distance_3D_M",
  "Center_Norm_U",
  "Center_Norm_V",
  "Center_Pixel_X",
  "Center_Pixel_Y",
  "BBox_Norm_XMin",
  "BBox_Norm_YMin",
  "BBox_Norm_XMax",
  "BBox_Norm_YMax",
  "BBox_Pixel_XMin",
  "BBox_Pixel_YMin",
  "BBox_Pixel_XMax",
  "BBox_Pixel_YMax",
  "Apparent_Radius_PX",
  "Is_Truncated",
  "Is_Valid_Target",
  "Visibility",
  "Invalid_Reason_Code",
  "Telemetry_Battery_Percent",
  "Telemetry_Ground_Speed_KMH",
] as const;

export function formatRecordToCSVRow(r: DatasetSampleRecord): string[] {
  return [
    r.sampleId,
    r.flightRunId,
    String(r.sequenceNumber),
    r.simulationTimestampSeconds.toFixed(2),
    r.timestampIso,
    r.imageFilename,
    r.targetHelipadId,
    r.sceneCategory,
    r.surfaceType,
    r.droneWorldPosition.x.toFixed(2),
    r.droneWorldPosition.y.toFixed(2),
    r.droneWorldPosition.z.toFixed(2),
    r.droneAttitude.pitchDeg.toFixed(2),
    r.droneAttitude.rollDeg.toFixed(2),
    r.droneAttitude.yawDeg.toFixed(2),
    r.altitudeAglMeters.toFixed(2),
    r.altitudeAbovePadMeters.toFixed(2),
    r.relativePose.dx.toFixed(2),
    r.relativePose.dy.toFixed(2),
    r.relativePose.dz.toFixed(2),
    r.relativePose.dYawDeg.toFixed(1),
    r.relativePose.distance3d.toFixed(2),
    r.projection.centerNorm.u.toFixed(4),
    r.projection.centerNorm.v.toFixed(4),
    r.projection.centerPixel.x.toFixed(1),
    r.projection.centerPixel.y.toFixed(1),
    r.projection.bboxNorm.xMin.toFixed(4),
    r.projection.bboxNorm.yMin.toFixed(4),
    r.projection.bboxNorm.xMax.toFixed(4),
    r.projection.bboxNorm.yMax.toFixed(4),
    String(r.projection.bboxPixel.xMin),
    String(r.projection.bboxPixel.yMin),
    String(r.projection.bboxPixel.xMax),
    String(r.projection.bboxPixel.yMax),
    r.projection.apparentRadiusPixels.toFixed(1),
    r.projection.isTruncated ? "1" : "0",
    r.detection.isValidTarget ? "1" : "0",
    r.detection.visibility,
    r.detection.invalidReasonCode,
    r.telemetry.batteryPercent.toFixed(1),
    r.telemetry.groundSpeedKmh.toFixed(2),
  ];
}

export function formatRecordsToCSV(records: DatasetSampleRecord[]): string {
  const rows = records.map(formatRecordToCSVRow);
  return [DATASET_CSV_HEADERS.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function validateDatasetIntegrity(
  records: DatasetSampleRecord[],
  manifest: DatasetSplitManifest
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const sampleIds = new Set<string>();
  const imageFiles = new Set<string>();

  // 1. Verify Sample Uniqueness and Bounds
  for (const r of records) {
    if (sampleIds.has(r.sampleId)) {
      errors.push(`Duplicate sampleId found: ${r.sampleId}`);
    }
    sampleIds.add(r.sampleId);

    if (imageFiles.has(r.imageFilename)) {
      errors.push(`Duplicate imageFilename found: ${r.imageFilename}`);
    }
    imageFiles.add(r.imageFilename);

    // Bounding Box Validations
    const b = r.projection.bboxNorm;
    if (b.xMin < 0 || b.xMax > 1 || b.yMin < 0 || b.yMax > 1 || b.xMin > b.xMax || b.yMin > b.yMax) {
      errors.push(`Invalid normalized bbox in sample ${r.sampleId}: [${b.xMin}, ${b.yMin}, ${b.xMax}, ${b.yMax}]`);
    }

    // Normalized Center Validations
    const c = r.projection.centerNorm;
    if (c.u < 0 || c.u > 1 || c.v < 0 || c.v > 1) {
      errors.push(`Normalized center out of [0, 1] bounds in sample ${r.sampleId}: (${c.u}, ${c.v})`);
    }

    // Scene Category Validation
    if (!LANDING_SCENE_CATEGORIES.includes(r.sceneCategory)) {
      errors.push(`Invalid sceneCategory '${r.sceneCategory}' in sample ${r.sampleId}`);
    }
  }

  // 2. Flight-Run Split Leakage Verification (Mathematical Set Disjointness)
  const trainRuns = new Set(manifest.splits.train.flightRunIds);
  const valRuns = new Set(manifest.splits.val.flightRunIds);
  const testRuns = new Set(manifest.splits.test.flightRunIds);

  for (const rId of trainRuns) {
    if (valRuns.has(rId)) {
      errors.push(`Dataset Leakage detected: Run ID ${rId} present in both Train and Val splits!`);
    }
    if (testRuns.has(rId)) {
      errors.push(`Dataset Leakage detected: Run ID ${rId} present in both Train and Test splits!`);
    }
  }

  for (const rId of valRuns) {
    if (testRuns.has(rId)) {
      errors.push(`Dataset Leakage detected: Run ID ${rId} present in both Val and Test splits!`);
    }
  }

  // 3. Completeness check
  const manifestTotal =
    manifest.splits.train.sampleCount +
    manifest.splits.val.sampleCount +
    manifest.splits.test.sampleCount;
  if (manifestTotal !== records.length) {
    errors.push(
      `Manifest sample count mismatch: sum of splits (${manifestTotal}) != record count (${records.length})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
