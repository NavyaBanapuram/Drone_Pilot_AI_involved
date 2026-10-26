/**
 * DronePilot - Phase D Expanded Dataset Generation Script (250 Samples)
 * 
 * Automates headless WebGL rendering of 250 genuine 224x224 camera images
 * across 25 flight runs x 10 frames with synchronized ground-truth labels.
 */

import { chromium } from "playwright";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";

const PORT = 3334; // Dedicated port to avoid any conflict
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve(process.cwd(), "precision_landing_dataset_250");
const IMAGES_DIR = path.join(OUTPUT_DIR, "images");
const LABELS_DIR = path.join(OUTPUT_DIR, "labels");
const SPLITS_DIR = path.join(OUTPUT_DIR, "splits");

const RUN_COUNT = 25;
const FRAMES_PER_RUN = 10;
const SEED = 55555;

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode && res.statusCode < 400) {
            resolve(true);
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        });
        req.on("error", reject);
        req.setTimeout(1000, () => req.destroy());
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms`);
}

async function run() {
  console.log("=== DRONEPILOT: GENERATING EXPANDED 250-SAMPLE SYNTHETIC DATASET ===");

  // Ensure directories exist
  [IMAGES_DIR, LABELS_DIR, SPLITS_DIR].forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
  });

  // Start Next.js production server
  console.log(`[1/5] Starting Next.js production server on port ${PORT}...`);
  const serverProcess = spawn("cmd.exe", ["/c", `npx next start -p ${PORT}`], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (data) => {
    const text = data.toString().trim();
    if (text) console.log(`  [server] ${text}`);
  });

  serverProcess.stderr.on("data", (data) => {
    const text = data.toString().trim();
    if (text && !text.includes("ExperimentalWarning")) {
      console.warn(`  [server:warn] ${text}`);
    }
  });

  try {
    await waitForServer(`${BASE_URL}/dataset-capture`);
    console.log(`[2/5] Production server active at ${BASE_URL}`);

    // Launch Playwright Headless Chromium with WebGL
    console.log("[3/5] Launching headless browser with WebGL enabled...");
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--use-gl=angle",
        "--use-angle=default",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    let capturedCount = 0;
    const capturedRecords = [];

    // Stream handler to capture images to disk
    await page.exposeFunction("__onSampleCaptured", async ({ sampleId, dataUrl, record }) => {
      try {
        capturedCount++;
        capturedRecords.push(record);

        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const filename = path.join(OUTPUT_DIR, record.imageFilename);
        fs.writeFileSync(filename, buffer);

        if (capturedCount % 25 === 0 || capturedCount === RUN_COUNT * FRAMES_PER_RUN) {
          console.log(
            `  Captured frame ${capturedCount}/${RUN_COUNT * FRAMES_PER_RUN} -> ${record.imageFilename} (${buffer.length} bytes, Helipad: ${record.targetHelipadId}, Class: ${record.sceneCategory})`
          );
        }
      } catch (err) {
        console.error("Error in __onSampleCaptured:", err);
        throw err;
      }
    });

    // Batch completion handler
    const batchCompletePromise = new Promise((resolve, reject) => {
      page.exposeFunction("__onBatchComplete", async ({ summary, manifest, jsonl, csv }) => {
        try {
          console.log("[4/5] Batch complete received from renderer. Writing labels and manifests...");

          // 1. Write dataset_all.jsonl and dataset_all.csv
          fs.writeFileSync(path.join(LABELS_DIR, "dataset_all.jsonl"), jsonl, "utf-8");
          fs.writeFileSync(path.join(LABELS_DIR, "dataset_all.csv"), csv, "utf-8");

          // 2. Write split files
          const trainIds = new Set(manifest.splits.train.sampleIds);
          const valIds = new Set(manifest.splits.val.sampleIds);
          const testIds = new Set(manifest.splits.test.sampleIds);

          const trainRecords = capturedRecords.filter((r) => trainIds.has(r.sampleId));
          const valRecords = capturedRecords.filter((r) => valIds.has(r.sampleId));
          const testRecords = capturedRecords.filter((r) => testIds.has(r.sampleId));

          fs.writeFileSync(path.join(SPLITS_DIR, "train.jsonl"), trainRecords.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
          fs.writeFileSync(path.join(SPLITS_DIR, "val.jsonl"), valRecords.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
          fs.writeFileSync(path.join(SPLITS_DIR, "test.jsonl"), testRecords.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");

          // 3. Write manifest & summary
          fs.writeFileSync(path.join(SPLITS_DIR, "split_manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
          fs.writeFileSync(path.join(OUTPUT_DIR, "dataset_summary.json"), JSON.stringify(summary, null, 2), "utf-8");

          resolve({ summary, manifest });
        } catch (err) {
          console.error("Error in __onBatchComplete:", err);
          reject(err);
        }
      });
    });

    // Navigate to capture page with autoplay
    const targetUrl = `${BASE_URL}/dataset-capture?autoplay=true&runs=${RUN_COUNT}&frames=${FRAMES_PER_RUN}&seed=${SEED}`;
    console.log(`  Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    // Await batch completion
    const { summary, manifest } = await batchCompletePromise;

    console.log("\n[5/5] Generation Complete! Summary Verification:");
    console.log(`  Total Images Captured: ${capturedCount}`);
    console.log(`  Valid Detection Targets: ${summary.validTargetsCount}`);
    console.log(`  Invalid / Occluded / Negative: ${summary.invalidTargetsCount} (${summary.negativeSamplePercentage}%)`);
    console.log(`  Split Distribution: Train=${manifest.splits.train.flightRunIds.length} runs (${manifest.splits.train.sampleCount} samples), Val=${manifest.splits.val.flightRunIds.length} runs (${manifest.splits.val.sampleCount} samples), Test=${manifest.splits.test.flightRunIds.length} runs (${manifest.splits.test.sampleCount} samples)`);
    console.log(`  Output Path: ${OUTPUT_DIR}`);

    await browser.close();
  } finally {
    console.log("Shutting down Next.js server...");
    try {
      execSync(`taskkill /pid ${serverProcess.pid} /f /t`, { stdio: "ignore" });
    } catch {}
    serverProcess.kill();
  }
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("FATAL ERROR during dataset generation:", err);
    process.exit(1);
  });
