// ==========================================================
// DRONE PILOT — PHASE C SYNTHETIC DATASET GENERATION TEST SUITE
// Verifies 3D-to-2D pinhole camera projection, normalized bounding
// box computation, out-of-frame detection, seeded PRNG reproducibility,
// leakage-free train/val/test splits, and schema integrity.
// ==========================================================

import * as THREE from "three";
import {
  createDownwardCamera,
  evaluateHelipadProjection,
  projectWorldToNdc,
  ndcToNormalizedImage,
} from "../lib/vision/camera-projection";
import {
  ScenarioGenerator,
  ALL_NINE_HELIPAD_IDS,
  SeededRng,
} from "../lib/vision/scenario-generator";
import {
  splitDatasetByFlightRun,
  generateDatasetSummary,
  validateDatasetIntegrity,
  formatRecordsToJSONL,
  formatRecordsToCSV,
} from "../lib/vision/dataset-exporter";
import { DatasetSampleRecord } from "../lib/vision/dataset-schema";
import { HELIPADS_RECORD } from "../lib/world/world-definition";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ✕ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failCount++;
  }
}

export function runDatasetGenerationTests() {
  console.log("\n=== RUNNING PHASE C DATASET GENERATION & PROJECTION TESTS ===\n");

  // ----------------------------------------------------------
  // Test 1: Pinhole Camera Geometry & Directly Nadir Alignment
  // ----------------------------------------------------------
  const dronePos = { x: 0, y: 15.0, z: 0 };
  const droneAttitude = { pitchDeg: 0, rollDeg: 0, yawDeg: 0 };
  const camera = createDownwardCamera(dronePos, droneAttitude, 75, 1.0);

  assert(
    Math.abs(camera.position.x - 0) < 1e-4 &&
      Math.abs(camera.position.y - 14.92) < 1e-4 &&
      Math.abs(camera.position.z - 0) < 1e-4,
    "Downward camera positions at underside of drone airframe (-8cm offset)",
    `Camera pos: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})`
  );

  // Directly below point: (0, 1.2, 0)
  const targetPt = new THREE.Vector3(0, 1.2, 0);
  const ndc = projectWorldToNdc(targetPt, camera);
  assert(
    ndc.inFront && Math.abs(ndc.ndcX) < 1e-3 && Math.abs(ndc.ndcY) < 1e-3,
    "Directly nadir target projects to exact optical center (NDC (0, 0))",
    `NDC: (${ndc.ndcX.toFixed(4)}, ${ndc.ndcY.toFixed(4)})`
  );

  const imgCoord = ndcToNormalizedImage(ndc.ndcX, ndc.ndcY);
  assert(
    Math.abs(imgCoord.u - 0.5) < 1e-3 && Math.abs(imgCoord.v - 0.5) < 1e-3,
    "Directly nadir target maps to normalized image center (u=0.5, v=0.5)",
    `Image: (${imgCoord.u.toFixed(4)}, ${imgCoord.v.toFixed(4)})`
  );

  // ----------------------------------------------------------
  // Test 2: Bounding Box Calculation & Circular Perimeter Projection
  // ----------------------------------------------------------
  const helipadAlpha = HELIPADS_RECORD["training-alpha"];
  const proj = evaluateHelipadProjection(
    camera,
    dronePos,
    droneAttitude,
    helipadAlpha.position,
    helipadAlpha.dimensions.radius || 7.0,
    helipadAlpha.headingDeg,
    224,
    224
  );

  assert(
    proj.visibility === "FULLY_VISIBLE" && proj.isValidTarget === true,
    "Centered helipad within altitude envelope is detected as FULLY_VISIBLE and valid",
    `Visibility: ${proj.visibility}, Valid: ${proj.isValidTarget}`
  );

  assert(
    proj.bboxNorm.xMin >= 0 &&
      proj.bboxNorm.xMax <= 1 &&
      proj.bboxNorm.yMin >= 0 &&
      proj.bboxNorm.yMax <= 1 &&
      proj.bboxNorm.xMin < proj.bboxNorm.xMax &&
      proj.bboxNorm.yMin < proj.bboxNorm.yMax,
    "Normalized bounding box lies within [0, 1] range with positive extent",
    `Bbox: [${proj.bboxNorm.xMin.toFixed(3)}, ${proj.bboxNorm.yMin.toFixed(3)}, ${proj.bboxNorm.xMax.toFixed(3)}, ${proj.bboxNorm.yMax.toFixed(3)}]`
  );

  assert(
    proj.apparentRadiusPixels > 10 && proj.apparentRadiusPixels < 112,
    "Apparent radius in 224x224 pixels is geometrically consistent with 15m altitude and 7m radius",
    `Radius: ${proj.apparentRadiusPixels}px`
  );

  // ----------------------------------------------------------
  // Test 3: Out-of-Frame & Lateral Offset Clipping
  // ----------------------------------------------------------
  const farDronePos = { x: 80.0, y: 15.0, z: 0 }; // 80m lateral offset (well outside 75° FOV)
  const farCamera = createDownwardCamera(farDronePos, droneAttitude, 75, 1.0);
  const farProj = evaluateHelipadProjection(
    farCamera,
    farDronePos,
    droneAttitude,
    helipadAlpha.position,
    helipadAlpha.dimensions.radius || 7.0,
    helipadAlpha.headingDeg,
    224,
    224
  );

  assert(
    farProj.visibility === "OUT_OF_FRAME" && farProj.isValidTarget === false,
    "Target 80m off-axis correctly flagged as OUT_OF_FRAME and invalid target",
    `Visibility: ${farProj.visibility}`
  );

  assert(
    farProj.invalidReasonCode === "OUT_OF_FRAME",
    "Assigns correct invalid reason code for out-of-frame targets",
    `Reason: ${farProj.invalidReasonCode}`
  );

  // ----------------------------------------------------------
  // Test 4: Truncation Flag on Image Boundary Intersection
  // ----------------------------------------------------------
  const edgeDronePos = { x: 12.0, y: 12.0, z: 0 }; // Helipad partially clipped by image border
  const edgeCamera = createDownwardCamera(edgeDronePos, droneAttitude, 75, 1.0);
  const edgeProj = evaluateHelipadProjection(
    edgeCamera,
    edgeDronePos,
    droneAttitude,
    helipadAlpha.position,
    helipadAlpha.dimensions.radius || 7.0,
    helipadAlpha.headingDeg,
    224,
    224
  );

  assert(
    edgeProj.isTruncated === true,
    "Detects boundary truncation when helipad rim crosses camera frustum edge",
    `isTruncated: ${edgeProj.isTruncated}`
  );

  // ----------------------------------------------------------
  // Test 5: Excessive Altitude Filter
  // ----------------------------------------------------------
  const highDronePos = { x: 0, y: 80.0, z: 0 }; // 80m altitude (exceeds 40m ceiling)
  const highCamera = createDownwardCamera(highDronePos, droneAttitude, 75, 1.0);
  const highProj = evaluateHelipadProjection(
    highCamera,
    highDronePos,
    droneAttitude,
    helipadAlpha.position,
    helipadAlpha.dimensions.radius || 7.0,
    helipadAlpha.headingDeg,
    224,
    224
  );

  assert(
    highProj.visibility === "EXCESSIVE_DISTANCE" && highProj.isValidTarget === false,
    "Rejects target above 40m altitude threshold as EXCESSIVE_DISTANCE",
    `Visibility: ${highProj.visibility}, Reason: ${highProj.invalidReasonCode}`
  );

  // ----------------------------------------------------------
  // Test 6: Deterministic Seeded PRNG Reproducibility
  // ----------------------------------------------------------
  const gen1 = new ScenarioGenerator({ seed: 7777, runCount: 5, framesPerRun: 4 });
  const batch1 = gen1.generateBatch();

  const gen2 = new ScenarioGenerator({ seed: 7777, runCount: 5, framesPerRun: 4 });
  const batch2 = gen2.generateBatch();

  let identical = true;
  for (let i = 0; i < batch1.length; i++) {
    if (
      batch1[i].dronePosition.x !== batch2[i].dronePosition.x ||
      batch1[i].dronePosition.y !== batch2[i].dronePosition.y ||
      batch1[i].dronePosition.z !== batch2[i].dronePosition.z ||
      batch1[i].targetHelipadId !== batch2[i].targetHelipadId
    ) {
      identical = false;
      break;
    }
  }

  assert(
    identical && batch1.length === 20,
    "Seeded scenario generator reproduces bit-exact trajectory parameters with identical seeds",
    `Generated count: ${batch1.length}`
  );

  // ----------------------------------------------------------
  // Test 7: Multi-Helipad Coverage (All 9 Helipads Supported)
  // ----------------------------------------------------------
  const multiGen = new ScenarioGenerator({
    seed: 9999,
    targetHelipads: [...ALL_NINE_HELIPAD_IDS],
    runCount: 18,
    framesPerRun: 2,
  });
  const multiBatch = multiGen.generateBatch();
  const representedPads = new Set(multiBatch.map((p) => p.targetHelipadId));

  assert(
    representedPads.size === 9,
    "Scenario generator supports and samples across all 9 island helipads",
    `Pads covered: ${Array.from(representedPads).join(", ")}`
  );

  // ----------------------------------------------------------
  // Test 8: Flight-Run Split Leakage Prevention (70/15/15)
  // ----------------------------------------------------------
  // Construct mock sample records across 10 flight runs
  const mockRecords: DatasetSampleRecord[] = [];
  for (let r = 0; r < 10; r++) {
    const flightRunId = `run_mock_${r}`;
    for (let f = 0; f < 5; f++) {
      mockRecords.push({
        sampleId: `sample_${r}_${f}`,
        flightRunId,
        sequenceNumber: f,
        simulationTimestampSeconds: f * 0.5,
        timestampIso: new Date().toISOString(),
        imageFilename: `images/sample_${r}_${f}.png`,
        targetHelipadId: "training-alpha",
        sceneCategory: "Field",
        surfaceType: "concrete",
        helipadWorldCenter: { x: 0, y: 1.2, z: 0 },
        helipadRadiusMeters: 7.0,
        airframeType: "quadcopter",
        droneWorldPosition: { x: 0, y: 15, z: 0 },
        droneAttitude: { pitchDeg: 0, rollDeg: 0, yawDeg: 0 },
        altitudeAglMeters: 13.8,
        altitudeAbovePadMeters: 13.8,
        cameraFovDegrees: 75,
        imageResolution: { width: 224, height: 224 },
        projection: {
          centerNorm: { u: 0.5, v: 0.5 },
          centerPixel: { x: 112, y: 112 },
          bboxNorm: { xMin: 0.3, yMin: 0.3, xMax: 0.7, yMax: 0.7 },
          bboxPixel: { xMin: 67, yMin: 67, xMax: 157, yMax: 157 },
          apparentRadiusPixels: 45,
          isTruncated: false,
        },
        relativePose: { dx: 0, dy: 13.8, dz: 0, dYawDeg: 0, distance3d: 13.8 },
        detection: {
          isValidTarget: true,
          visibility: "FULLY_VISIBLE",
          invalidReasonCode: "NONE",
        },
        telemetry: {
          flightTimeSeconds: f * 0.5,
          flightMode: "HOVER",
          groundSpeedKmh: 0,
          verticalSpeedMs: 0,
          batteryPercent: 99,
          motorOutputs: [0.6, 0.6, 0.6, 0.6],
        },
      });
    }
  }

  const splitManifest = splitDatasetByFlightRun(mockRecords, 0.7, 0.15, 0.15, 4242);
  const trainRuns = new Set(splitManifest.splits.train.flightRunIds);
  const valRuns = new Set(splitManifest.splits.val.flightRunIds);
  const testRuns = new Set(splitManifest.splits.test.flightRunIds);

  let hasLeakage = false;
  for (const rId of trainRuns) {
    if (valRuns.has(rId) || testRuns.has(rId)) hasLeakage = true;
  }
  for (const rId of valRuns) {
    if (testRuns.has(rId)) hasLeakage = true;
  }

  assert(
    !hasLeakage,
    "Zero flight-run leakage: Train, Val, and Test flight-run ID sets are strictly mutually disjoint",
    `Train: ${trainRuns.size}, Val: ${valRuns.size}, Test: ${testRuns.size}`
  );

  assert(
    splitManifest.splits.train.sampleCount +
      splitManifest.splits.val.sampleCount +
      splitManifest.splits.test.sampleCount ===
      mockRecords.length,
    "Sum of partitioned samples across splits matches total dataset count (50 samples)",
    `Total: ${splitManifest.totalSamples}`
  );

  // ----------------------------------------------------------
  // Test 9: Dataset Summary & Schema Serialization
  // ----------------------------------------------------------
  const summaryReport = generateDatasetSummary(mockRecords, splitManifest);
  assert(
    summaryReport.totalSamples === 50 &&
      summaryReport.countsByHelipad["training-alpha"] === 50 &&
      summaryReport.countsBySceneCategory["Field"] === 50,
    "Dataset summary calculates accurate category aggregates and class balances"
  );

  const jsonlOutput = formatRecordsToJSONL(mockRecords.slice(0, 3));
  const jsonlLines = jsonlOutput.trim().split("\n");
  let jsonlValid = true;
  try {
    for (const l of jsonlLines) {
      JSON.parse(l);
    }
  } catch (err) {
    jsonlValid = false;
  }

  assert(
    jsonlValid && jsonlLines.length === 3,
    "formatRecordsToJSONL produces valid, streamable line-delimited JSON"
  );

  const csvOutput = formatRecordsToCSV(mockRecords.slice(0, 3));
  const csvLines = csvOutput.trim().split("\n");
  assert(
    csvLines.length === 4 && csvLines[0].startsWith("Sample_ID,"),
    "formatRecordsToCSV produces valid tabular CSV index with header row"
  );

  // ----------------------------------------------------------
  // Test 10: Validation Pipeline Integrity Verification
  // ----------------------------------------------------------
  const validation = validateDatasetIntegrity(mockRecords, splitManifest);
  assert(
    validation.valid === true && validation.errors.length === 0,
    "validateDatasetIntegrity validates consistent dataset without errors",
    `Errors: ${validation.errors.join("; ")}`
  );

  console.log(`\nTEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED\n`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runDatasetGenerationTests();
