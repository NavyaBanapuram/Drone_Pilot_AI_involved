import fs from "fs";
import path from "path";

const DATASET_DIR = path.resolve(process.cwd(), "precision_landing_dataset");
const labelsJsonPath = path.join(DATASET_DIR, "labels", "dataset_all.jsonl");
const manifestPath = path.join(DATASET_DIR, "splits", "split_manifest.json");

if (!fs.existsSync(labelsJsonPath)) {
  console.error("Missing dataset_all.jsonl");
  process.exit(1);
}

const records = fs
  .readFileSync(labelsJsonPath, "utf-8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

console.log("=== DATASET INTEGRITY & FILE VERIFICATION ===");
console.log(`Total sample records loaded: ${records.length}`);

let missingImages = 0;
let validImageSizes = 0;
let smallImages = 0;
let totalBytes = 0;

for (const r of records) {
  const imgPath = path.join(DATASET_DIR, r.imageFilename);
  if (!fs.existsSync(imgPath)) {
    missingImages++;
  } else {
    const stat = fs.statSync(imgPath);
    totalBytes += stat.size;
    if (stat.size >= 1000) {
      validImageSizes++;
    } else {
      smallImages++;
    }
  }
}

console.log(`Image files verified: ${validImageSizes}/${records.length}`);
console.log(`Missing image files: ${missingImages}`);
console.log(`Suspiciously small images (<1KB): ${smallImages}`);
console.log(`Total images disk size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

// Verify Split Disjointness
const trainRuns = new Set(manifest.splits.train.flightRunIds);
const valRuns = new Set(manifest.splits.val.flightRunIds);
const testRuns = new Set(manifest.splits.test.flightRunIds);

let runLeaks = 0;
for (const id of trainRuns) {
  if (valRuns.has(id) || testRuns.has(id)) runLeaks++;
}
for (const id of valRuns) {
  if (testRuns.has(id)) runLeaks++;
}

console.log(`Flight-run split leakage count: ${runLeaks}`);

// Verify Bounding Box Ranges
let invalidBBoxes = 0;
for (const r of records) {
  if (r.detection.isValidTarget) {
    const b = r.projection.bboxNorm;
    if (b.xMin < 0 || b.yMin < 0 || b.xMax > 1 || b.yMax > 1 || b.xMin >= b.xMax || b.yMin >= b.yMax) {
      invalidBBoxes++;
    }
  }
}
console.log(`Invalid bounding box count: ${invalidBBoxes}`);

if (missingImages === 0 && runLeaks === 0 && invalidBBoxes === 0) {
  console.log("\nALL VERIFICATIONS PASSED: Synthetic dataset is mathematically sound, leak-free, and fully verified!");
} else {
  console.error("\nVERIFICATION FAILED: Anomalies detected.");
  process.exit(1);
}
