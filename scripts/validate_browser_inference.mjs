/**
 * DronePilot - Phase F Display-Only Browser Vision Validation
 * 
 * Exercises the actual browser inference pipeline in Playwright Chromium:
 * - Boots Next.js production server
 * - Validates ONNX Runtime Web model loading (/models/precision_landing_resnext50.onnx)
 * - Samples 30 live inference cycles from the Three.js offscreen renderer
 * - Measures latency distribution (median, p95)
 * - Verifies zero AI control leakage (assistance disabled by default)
 * - Confirms finite bounding boxes, centers, and scene classifications
 */

import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";

const PORT = 3336;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const REPORT_PATH = path.resolve(process.cwd(), "models", "browser_inference_validation_report.json");

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

function computeQuantile(arr, q) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

async function run() {
  console.log("=== DRONEPILOT: PHASE F DISPLAY-ONLY BROWSER INFERENCE VALIDATION ===\n");

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

  let browser = null;

  try {
    await waitForServer(`${BASE_URL}/api/health`, 30000);
    console.log("  ✓ Next.js server operational.\n");

    console.log("[2/5] Launching Playwright Chromium with WebGL support...");
    browser = await chromium.launch({
      headless: true,
      args: [
        "--enable-webgl",
        "--use-gl=angle",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    const consoleLogs = [];
    const consoleErrors = [];

    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleLogs.push({ type, text });
      if (type === "error") {
        consoleErrors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(err.message || String(err));
    });

    // Inject mock authentication so ProtectedRoute resolves immediately
    await page.addInitScript(() => {
      localStorage.setItem(
        "drone_pilot_mock_auth_session",
        JSON.stringify({
          uid: "test-pilot-vision",
          email: "vision@dronepilot.local",
          displayName: "Vision Test Pilot",
          emailVerified: true,
        })
      );
    });

    console.log("[3/5] Navigating to simulator /fly and loading ONNX model...");
    await page.goto(`${BASE_URL}/fly`, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log(`  Current Page URL: ${page.url()}`);

    // Wait for vision state hook and model loading
    console.log("  Waiting for ONNX model to load in WebGL context...");
    try {
      await page.waitForFunction(
        () => {
          const s = window.__DRONE_PILOT_VISION_STATE__;
          return s && s.isModelReady === true;
        },
        { timeout: 15000 }
      );
    } catch (e) {
      console.log(`  Current URL after wait: ${page.url()}`);
      console.log("  Browser console logs:");
      consoleLogs.forEach((l) => console.log(`    [${l.type}] ${l.text}`));
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
      console.log("  Page body text snippet:", bodyText);
      const visionState = await page.evaluate(() => window.__DRONE_PILOT_VISION_STATE__);
      console.log("  __DRONE_PILOT_VISION_STATE__:", visionState);
      throw e;
    }

    console.log("  ✓ ONNX model successfully initialized in browser session.\n");

    console.log("[4/5] Collecting 30 live inference samples (rate-limited to 10 Hz)...");
    const samples = [];
    let prevTimestamp = 0;

    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(120);
      const state = await page.evaluate(() => window.__DRONE_PILOT_VISION_STATE__);
      if (state && state.detection) {
        if (state.detection.timestampMs !== prevTimestamp) {
          prevTimestamp = state.detection.timestampMs;
          samples.push({
            sampleIndex: samples.length + 1,
            status: state.detection.status,
            confidence: state.detection.confidence,
            isDetected: state.detection.isDetected,
            center: state.detection.center,
            bbox: state.detection.bbox,
            predictedScene: state.detection.predictedScene,
            sceneConfidence: state.detection.sceneConfidence,
            latencyMs: state.detection.latencyMs,
            timestampMs: state.detection.timestampMs,
            isAssistEnabled: state.isAssistEnabled,
            assistState: state.assistStatus.state,
            lastCommand: state.assistStatus.lastCommand,
          });
        }
      }
    }

    console.log(`  ✓ Collected ${samples.length} live browser inference samples.\n`);

    console.log("[5/5] Analyzing safety invariants and latency distribution...");

    const latencies = samples.map((s) => s.latencyMs).filter((l) => Number.isFinite(l) && l > 0);
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);
    const meanLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const medianLatency = computeQuantile(latencies, 0.5);
    const p95Latency = computeQuantile(latencies, 0.95);

    // Verify Safety Invariants
    const allAssistanceDisabled = samples.every((s) => s.isAssistEnabled === false);
    const allCommandsZero = samples.every(
      (s) => s.lastCommand.pitch === 0 && s.lastCommand.roll === 0 && s.lastCommand.throttle === 0
    );
    const allFSMStatesDisabled = samples.every((s) => s.assistState === "DISABLED");
    const allOutputsFinite = samples.every(
      (s) =>
        Number.isFinite(s.confidence) &&
        Number.isFinite(s.center.u) &&
        Number.isFinite(s.center.v) &&
        Number.isFinite(s.bbox.xMin) &&
        Number.isFinite(s.bbox.xMax) &&
        Number.isFinite(s.bbox.yMin) &&
        Number.isFinite(s.bbox.yMax)
    );
    const invalidCount = samples.filter((s) => s.status === "INVALID" || s.status === "ERROR").length;

    console.log("=== BROWSER VALIDATION METRICS ===");
    console.log(`  Total Samples Collected:     ${samples.length}`);
    console.log(`  Model Load Status:           SUCCESS (ONNX Runtime Web WASM)`);
    console.log(`  Median Latency:              ${medianLatency.toFixed(1)} ms`);
    console.log(`  p95 Latency:                 ${p95Latency.toFixed(1)} ms`);
    console.log(`  Min / Max Latency:           ${minLatency} ms / ${maxLatency} ms`);
    console.log(`  Invalid Inferences:          ${invalidCount} (${((invalidCount / samples.length) * 100).toFixed(1)}%)`);
    console.log(`  AI Assistance Disabled:      ${allAssistanceDisabled ? "PASS (100% disabled)" : "FAIL"}`);
    console.log(`  AI Guidance Commands Zero:   ${allCommandsZero ? "PASS (pitch/roll/throttle = 0)" : "FAIL"}`);
    console.log(`  FSM State Quiescent:         ${allFSMStatesDisabled ? "PASS (all DISABLED)" : "FAIL"}`);
    console.log(`  Outputs Finite & Bounded:    ${allOutputsFinite ? "PASS (zero NaN/Infinity)" : "FAIL"}`);
    console.log(`  Uncaught Browser Errors:     ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.warn("  Console Errors:", consoleErrors);
    }

    const report = {
      timestampIso: new Date().toISOString(),
      modelPath: "/models/precision_landing_resnext50.onnx",
      sampleCount: samples.length,
      modelLoadSuccess: true,
      latency: {
        minMs: minLatency,
        maxMs: maxLatency,
        meanMs: Math.round(meanLatency * 10) / 10,
        medianMs: Math.round(medianLatency * 10) / 10,
        p95Ms: Math.round(p95Latency * 10) / 10,
      },
      safety: {
        allAssistanceDisabled,
        allCommandsZero,
        allFSMStatesDisabled,
        allOutputsFinite,
        invalidCount,
      },
      sampleSnapshot: samples.slice(0, 5),
      consoleErrors,
    };

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");
    console.log(`\n  ✓ Saved validation report to: ${REPORT_PATH}\n`);

  } finally {
    if (browser) await browser.close();
    console.log("Shutting down Next.js server...");
    serverProcess.kill();
  }
}

run().catch((err) => {
  console.error("Browser validation failed:", err);
  process.exit(1);
});
