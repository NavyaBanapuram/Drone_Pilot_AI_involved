/**
 * DronePilot - Safe ONNX Model Setup & Verification Tool
 * 
 * Verifies or restores the ResNeXt-50 ONNX landing model artifact
 * without violating GitHub's 100 MB repository file size limit.
 * 
 * Runtime Model Location: public/models/precision_landing_resnext50.onnx
 * Expected Size: 100,481,863 bytes
 * Expected SHA-256: a0a90a29348b720206b763ceeff625af1564bd4ec0c93b5052dd4f6faf90774e
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import http from "http";
import https from "https";

const EXPECTED_ONNX_BYTES = 100481863;
const EXPECTED_ONNX_SHA256 = "a0a90a29348b720206b763ceeff625af1564bd4ec0c93b5052dd4f6faf90774e";

const CWD = process.cwd();
const PUBLIC_ONNX_PATH = path.resolve(CWD, "public", "models", "precision_landing_resnext50.onnx");
const LOCAL_ONNX_SOURCE = path.resolve(CWD, "models", "precision_landing_resnext50.onnx");
const LOCAL_PT_SOURCE = path.resolve(CWD, "models", "best_precision_landing_model.pt");

function computeFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex").toLowerCase()));
    stream.on("error", (err) => reject(err));
  });
}

function formatBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB (${bytes.toLocaleString()} bytes)`;
}

async function verifyModelFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false };
  }
  const stat = fs.statSync(filePath);
  const hash = await computeFileHash(filePath);
  const isSizeMatch = stat.size === EXPECTED_ONNX_BYTES;
  const isHashMatch = hash === EXPECTED_ONNX_SHA256;
  return {
    exists: true,
    size: stat.size,
    hash,
    isValid: isSizeMatch && isHashMatch,
    isSizeMatch,
    isHashMatch,
  };
}

async function downloadModel(url, destPath) {
  console.log(`Downloading model from: ${url}`);
  const client = url.startsWith("https") ? https : http;
  
  // Ensure target directory exists
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const tempPath = `${destPath}.tmp`;
  const file = fs.createWriteStream(tempPath);

  return new Promise((resolve, reject) => {
    client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Follow redirect
        return downloadModel(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        return reject(new Error(`Download failed with HTTP ${response.statusCode}: ${response.statusMessage}`));
      }

      let downloadedBytes = 0;
      const totalBytes = parseInt(response.headers["content-length"] || "0", 10);

      response.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0 && process.stdout.isTTY) {
          const pct = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          process.stdout.write(`  [progress] ${pct}% (${formatBytes(downloadedBytes)})\r`);
        }
      });

      response.pipe(file);

      file.on("finish", () => {
        file.close(async () => {
          if (process.stdout.isTTY) process.stdout.write("\n");
          // Rename temp to target
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          fs.renameSync(tempPath, destPath);
          console.log(`✓ Download complete: ${formatBytes(downloadedBytes)} written to ${destPath}`);
          resolve(true);
        });
      });
    }).on("error", (err) => {
      file.close();
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      reject(err);
    });
  });
}

async function main() {
  const isVerifyOnly = process.argv.includes("--verify");
  console.log("=== DRONEPILOT: ONNX MODEL ARTIFACT SETUP & VERIFICATION ===\n");
  console.log(`Target runtime path: ${PUBLIC_ONNX_PATH}`);

  const status = await verifyModelFile(PUBLIC_ONNX_PATH);

  if (status.exists) {
    console.log(`\nModel status: PRESENT`);
    console.log(`  Size:     ${formatBytes(status.size)} (expected: ${formatBytes(EXPECTED_ONNX_BYTES)})`);
    console.log(`  SHA-256:  ${status.hash}`);
    if (status.isValid) {
      console.log(`  Validity: ✓ VERIFIED (matches bit-exact reference build)`);
      return;
    } else {
      console.warn(`  Validity: ⚠ HASH/SIZE MISMATCH (model may have been modified or re-exported)`);
      if (isVerifyOnly) return;
    }
  } else {
    console.log(`\nModel status: NOT FOUND in public/models/`);
  }

  if (isVerifyOnly) {
    if (!status.exists) {
      console.error("Verification failed: model file not found.");
      process.exit(1);
    }
    return;
  }

  // Attempt Recovery / Setup options
  console.log("\nAttempting automatic local setup...");

  // Option 1: Copy from local models/ cache if available
  if (fs.existsSync(LOCAL_ONNX_SOURCE)) {
    console.log(`[1/3] Found local model in models/: ${LOCAL_ONNX_SOURCE}`);
    fs.mkdirSync(path.dirname(PUBLIC_ONNX_PATH), { recursive: true });
    fs.copyFileSync(LOCAL_ONNX_SOURCE, PUBLIC_ONNX_PATH);
    console.log(`  ✓ Copied model to ${PUBLIC_ONNX_PATH}`);
    const copyStatus = await verifyModelFile(PUBLIC_ONNX_PATH);
    if (copyStatus.isValid) {
      console.log(`  ✓ Successfully restored and verified ONNX model.`);
      return;
    }
  }

  // Option 2: Check for DRONEPILOT_MODEL_URL environment variable
  const envUrl = process.env.DRONEPILOT_MODEL_URL;
  if (envUrl) {
    console.log(`[2/3] Found DRONEPILOT_MODEL_URL environment variable. Initiating download...`);
    try {
      await downloadModel(envUrl, PUBLIC_ONNX_PATH);
      const dlStatus = await verifyModelFile(PUBLIC_ONNX_PATH);
      if (dlStatus.isValid) {
        console.log(`  ✓ Downloaded model passed SHA-256 integrity check.`);
        return;
      }
    } catch (err) {
      console.error(`  ❌ Failed to download from ${envUrl}:`, err.message);
    }
  }

  // Option 3: Check for PyTorch checkpoint to export
  if (fs.existsSync(LOCAL_PT_SOURCE)) {
    console.log(`[3/3] Found PyTorch checkpoint in models/: ${LOCAL_PT_SOURCE}`);
    console.log(`  To export directly to ONNX, run:`);
    console.log(`    python -m scripts.ml.export_onnx\n`);
    return;
  }

  // If no automated source exists, output actionable clean-checkout instructions
  console.log(`
ℹ HOW TO OBTAIN THE PRECISION LANDING MODEL ON A CLEAN CHECKOUT:
--------------------------------------------------------------------------------
Due to GitHub's 100 MB repository file size limit, the 100.48 MB ResNeXt-50
ONNX model is excluded from Git tracking via .gitignore.

To obtain or restore the model:
  1. If you have an external download URL:
     set DRONEPILOT_MODEL_URL=https://<your-host>/precision_landing_resnext50.onnx
     npm run model:setup

  2. Or manually copy the model:
     Place 'precision_landing_resnext50.onnx' into 'public/models/'

  3. Or export from the trained PyTorch checkpoint:
     python -m scripts.ml.export_onnx

Note: The DronePilot flight simulator remains 100% operational in manual flight
mode even without the model. AI landing assistance will remain safely disengaged.
--------------------------------------------------------------------------------
`);
}

main().catch((err) => {
  console.error("Error during model setup:", err);
  process.exit(1);
});
