// ==========================================================
// DRONE PILOT — BROWSER-BASED ONNX INFERENCE ENGINE (PHASE E)
// Loads trained ResNeXt-50 multi-task ONNX model via ONNX Runtime Web,
// renders genuine 224x224 downward camera frames, applies ImageNet
// normalization, and returns typed precision-landing predictions.
// ==========================================================

import * as THREE from "three";
import { LANDING_SCENE_CATEGORIES, LandingSceneCategory } from "./dataset-schema";
import { createDownwardCamera } from "./camera-projection";

export interface VisionDetectionResult {
  status: "IDLE" | "LOADING" | "DETECTED" | "NO_TARGET" | "ERROR" | "INVALID";
  confidence: number; // [0.0, 1.0]
  isDetected: boolean; // confidence >= threshold && isValid
  center: {
    u: number; // [0.0, 1.0] normalized horizontal
    v: number; // [0.0, 1.0] normalized vertical
    pixelX: number; // [0, 224]
    pixelY: number; // [0, 224]
  };
  bbox: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };
  predictedScene: LandingSceneCategory;
  sceneConfidence: number;
  latencyMs: number;
  timestampMs: number;
  captureTimestampMs?: number;
  errorMessage?: string;
  invalidReason?: string;
}

const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

export class BrowserInferenceEngine {
  private session: any = null;
  private isLoading = false;
  private isModelLoaded = false;
  private loadError: string | null = null;

  // Offscreen rendering pipeline for downward camera
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenRenderer: THREE.WebGLRenderer | null = null;
  private downwardCamera: THREE.PerspectiveCamera | null = null;

  // Pre-allocated tensor buffers to prevent GC thrashing in 60 FPS loop
  private preallocatedInput: Float32Array = new Float32Array(1 * 3 * 224 * 224);
  private pixelBuffer: Uint8Array = new Uint8Array(224 * 224 * 4);

  // Rate-limiting state
  private isInferring = false;
  private lastInferenceTimeMs = 0;
  private inferenceIntervalMs = 100; // 10 Hz inference rate

  // Latest result cache
  private latestResult: VisionDetectionResult = {
    status: "IDLE",
    confidence: 0,
    isDetected: false,
    center: { u: 0.5, v: 0.5, pixelX: 112, pixelY: 112 },
    bbox: { xMin: 0.35, yMin: 0.35, xMax: 0.65, yMax: 0.65 },
    predictedScene: "Field",
    sceneConfidence: 0,
    latencyMs: 0,
    timestampMs: 0,
  };

  constructor(inferenceIntervalMs = 100) {
    this.inferenceIntervalMs = inferenceIntervalMs;
  }

  /**
   * Asynchronously loads the ONNX Runtime Web session from public asset path or external CDN URL.
   */
  public async loadModel(
    modelPath = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MODEL_URL
      ? process.env.NEXT_PUBLIC_MODEL_URL
      : "/models/precision_landing_resnext50.onnx"
  ): Promise<boolean> {
    if (this.isModelLoaded || this.isLoading) return this.isModelLoaded;
    if (typeof window === "undefined") return false;

    this.isLoading = true;
    this.latestResult.status = "LOADING";

    try {
      // Dynamic import to prevent SSR bundling issues
      const ort = await import("onnxruntime-web");

      // Configure ONNX Runtime Web execution flags
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;

      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });

      this.isModelLoaded = true;
      this.isLoading = false;
      this.latestResult.status = "IDLE";
      return true;
    } catch (err: any) {
      console.warn("BrowserInferenceEngine: Note - ONNX model not loaded or blocked by CORS:", err?.message || err);
      this.isLoading = false;
      this.loadError = err?.message || "Model unavailable";
      this.latestResult.status = "ERROR";
      this.latestResult.errorMessage = this.loadError || undefined;
      return false;
    }
  }

  /**
   * Initializes offscreen 224x224 WebGL renderer for capturing genuine nadir frames.
   */
  public initOffscreenRenderer(): void {
    if (typeof document === "undefined" || this.offscreenRenderer) return;

    const canvas = document.createElement("canvas");
    canvas.width = 224;
    canvas.height = 224;
    this.offscreenCanvas = canvas;

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        preserveDrawingBuffer: true,
        powerPreference: "low-power",
      });
      renderer.setSize(224, 224, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.offscreenRenderer = renderer;
    } catch (e) {
      console.warn("BrowserInferenceEngine: Offscreen WebGLRenderer initialization error:", e);
    }
  }

  /**
   * Executes inference on the current simulation scene state through downward camera.
   * Safe to call every animation frame; automatically rate-limits to 10 Hz and runs asynchronously.
   */
  public processFrame(
    scene: THREE.Scene,
    dronePosition: { x: number; y: number; z: number },
    droneAttitudeDeg: { pitchDeg: number; rollDeg: number; yawDeg: number }
  ): VisionDetectionResult {
    const now = performance.now();

    // Check if ready and rate limit has elapsed
    if (
      !this.isModelLoaded ||
      !this.session ||
      this.isInferring ||
      now - this.lastInferenceTimeMs < this.inferenceIntervalMs
    ) {
      return this.latestResult;
    }

    // Trigger async inference
    this.lastInferenceTimeMs = now;
    this.isInferring = true;

    this.runInference(scene, dronePosition, droneAttitudeDeg)
      .then((res) => {
        // Enforce sequence ordering: late-returning inferences cannot overwrite newer accepted frames
        const currentCapture = this.latestResult.captureTimestampMs ?? this.latestResult.timestampMs ?? 0;
        const newCapture = res.captureTimestampMs ?? res.timestampMs ?? 0;
        if (newCapture >= currentCapture) {
          this.latestResult = res;
        }
      })
      .catch((err) => {
        this.latestResult.status = "ERROR";
        this.latestResult.errorMessage = err?.message || "Inference execution error";
      })
      .finally(() => {
        this.isInferring = false;
      });

    return this.latestResult;
  }

  private async runInference(
    scene: THREE.Scene,
    dronePosition: { x: number; y: number; z: number },
    droneAttitudeDeg: { pitchDeg: number; rollDeg: number; yawDeg: number }
  ): Promise<VisionDetectionResult> {
    const t0 = performance.now();

    if (!this.offscreenRenderer || !this.offscreenCanvas) {
      this.initOffscreenRenderer();
    }
    if (!this.offscreenRenderer) {
      throw new Error("Offscreen WebGL renderer unavailable");
    }

    // 1. Position and orient downward camera matching training geometry
    const camera = createDownwardCamera(dronePosition, droneAttitudeDeg, 75, 1.0);
    this.downwardCamera = camera;
    const captureTimestampMs = Date.now();

    // 2. Render 224x224 frame
    this.offscreenRenderer.render(scene, camera);

    // 3. Read pixels into preallocated buffer [224 * 224 * 4] (RGBA)
    const gl = this.offscreenRenderer.getContext();
    gl.readPixels(0, 0, 224, 224, gl.RGBA, gl.UNSIGNED_BYTE, this.pixelBuffer);

    // 4. Preprocess pixels into normalized NCHW Float32 tensor [1, 3, 224, 224]
    // WebGL readPixels reads bottom-to-top, so flip Y to match standard image coordinates
    const inputData = this.preallocatedInput;
    const planeSize = 224 * 224;

    for (let y = 0; y < 224; y++) {
      const flippedY = 223 - y;
      for (let x = 0; x < 224; x++) {
        const srcIdx = (flippedY * 224 + x) * 4;
        const dstIdx = y * 224 + x;

        const rNorm = this.pixelBuffer[srcIdx] / 255.0;
        const gNorm = this.pixelBuffer[srcIdx + 1] / 255.0;
        const bNorm = this.pixelBuffer[srcIdx + 2] / 255.0;

        // Channel 0 (R)
        inputData[dstIdx] = (rNorm - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
        // Channel 1 (G)
        inputData[planeSize + dstIdx] = (gNorm - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
        // Channel 2 (B)
        inputData[planeSize * 2 + dstIdx] = (bNorm - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
      }
    }

    // 5. Construct ONNX Tensor & Run Session
    const ort = await import("onnxruntime-web");
    const inputTensor = new ort.Tensor("float32", inputData, [1, 3, 224, 224]);

    const feeds: Record<string, any> = { image: inputTensor };
    const results = await this.session.run(feeds);

    const latencyMs = Math.round(performance.now() - t0);
    const nowMs = Date.now();

    // Strict validation of outputs
    if (!results || !results.confidence || !results.center || !results.bbox || !results.scene_probs) {
      return {
        status: "INVALID",
        confidence: 0,
        isDetected: false,
        center: { u: 0.5, v: 0.5, pixelX: 112, pixelY: 112 },
        bbox: { xMin: 0, yMin: 0, xMax: 0, yMax: 0 },
        predictedScene: "Field",
        sceneConfidence: 0,
        latencyMs,
        timestampMs: nowMs,
        captureTimestampMs,
        invalidReason: "Model output tensors missing or malformed",
      };
    }

    const confData = results.confidence.data as Float32Array;
    const centerData = results.center.data as Float32Array;
    const bboxData = results.bbox.data as Float32Array;
    const sceneData = results.scene_probs.data as Float32Array;

    if (
      !confData || confData.length < 1 ||
      !centerData || centerData.length < 2 ||
      !bboxData || bboxData.length < 4 ||
      !sceneData || sceneData.length < 8
    ) {
      return {
        status: "INVALID",
        confidence: 0,
        isDetected: false,
        center: { u: 0.5, v: 0.5, pixelX: 112, pixelY: 112 },
        bbox: { xMin: 0, yMin: 0, xMax: 0, yMax: 0 },
        predictedScene: "Field",
        sceneConfidence: 0,
        latencyMs,
        timestampMs: nowMs,
        captureTimestampMs,
        invalidReason: "Model output tensor dimensions insufficient",
      };
    }

    const rawConf = confData[0];
    const rawU = centerData[0];
    const rawV = centerData[1];
    const rawXMin = bboxData[0];
    const rawYMin = bboxData[1];
    const rawXMax = bboxData[2];
    const rawYMax = bboxData[3];

    // Non-finite validation (NaN or Infinity)
    if (!Number.isFinite(rawConf) || !Number.isFinite(rawU) || !Number.isFinite(rawV)) {
      return {
        status: "INVALID",
        confidence: 0,
        isDetected: false,
        center: { u: 0.5, v: 0.5, pixelX: 112, pixelY: 112 },
        bbox: { xMin: 0, yMin: 0, xMax: 0, yMax: 0 },
        predictedScene: "Field",
        sceneConfidence: 0,
        latencyMs,
        timestampMs: nowMs,
        captureTimestampMs,
        invalidReason: "Non-finite confidence or center values detected",
      };
    }

    if (
      !Number.isFinite(rawXMin) ||
      !Number.isFinite(rawYMin) ||
      !Number.isFinite(rawXMax) ||
      !Number.isFinite(rawYMax)
    ) {
      return {
        status: "INVALID",
        confidence: 0,
        isDetected: false,
        center: { u: 0.5, v: 0.5, pixelX: 112, pixelY: 112 },
        bbox: { xMin: 0, yMin: 0, xMax: 0, yMax: 0 },
        predictedScene: "Field",
        sceneConfidence: 0,
        latencyMs,
        timestampMs: nowMs,
        captureTimestampMs,
        invalidReason: "Non-finite bounding box values detected",
      };
    }

    // Range checks: must be within reasonable bounds [0, 1]
    if (rawConf < 0.0 || rawConf > 1.0 || rawU < 0.0 || rawU > 1.0 || rawV < 0.0 || rawV > 1.0) {
      return {
        status: "INVALID",
        confidence: 0,
        isDetected: false,
        center: { u: 0.5, v: 0.5, pixelX: 112, pixelY: 112 },
        bbox: { xMin: 0, yMin: 0, xMax: 0, yMax: 0 },
        predictedScene: "Field",
        sceneConfidence: 0,
        latencyMs,
        timestampMs: nowMs,
        captureTimestampMs,
        invalidReason: "Confidence or center values outside [0, 1] range",
      };
    }

    // Check valid bounding box dimensions
    if (rawXMin < 0 || rawYMin < 0 || rawXMax > 1 || rawYMax > 1 || rawXMin >= rawXMax || rawYMin >= rawYMax) {
      return {
        status: "INVALID",
        confidence: 0,
        isDetected: false,
        center: { u: 0.5, v: 0.5, pixelX: 112, pixelY: 112 },
        bbox: { xMin: 0, yMin: 0, xMax: 0, yMax: 0 },
        predictedScene: "Field",
        sceneConfidence: 0,
        latencyMs,
        timestampMs: nowMs,
        captureTimestampMs,
        invalidReason: "Malformed bounding box bounds detected",
      };
    }

    // Argmax scene category with finite check
    let maxSceneIdx = 0;
    let maxSceneVal = -1;
    for (let s = 0; s < 8; s++) {
      const val = sceneData[s];
      if (!Number.isFinite(val)) {
        return {
          status: "INVALID",
          confidence: 0,
          isDetected: false,
          center: { u: 0.5, v: 0.5, pixelX: 112, pixelY: 112 },
          bbox: { xMin: 0, yMin: 0, xMax: 0, yMax: 0 },
          predictedScene: "Field",
          sceneConfidence: 0,
          latencyMs,
          timestampMs: nowMs,
          captureTimestampMs,
          invalidReason: "Non-finite scene probability detected",
        };
      }
      if (val > maxSceneVal) {
        maxSceneVal = val;
        maxSceneIdx = s;
      }
    }

    const confidence = rawConf;
    const isDetected = confidence >= 0.55;
    const u = rawU;
    const v = rawV;

    return {
      status: isDetected ? "DETECTED" : "NO_TARGET",
      confidence: Math.round(confidence * 1000) / 1000,
      isDetected,
      center: {
        u,
        v,
        pixelX: Math.round(u * 224 * 10) / 10,
        pixelY: Math.round(v * 224 * 10) / 10,
      },
      bbox: {
        xMin: rawXMin,
        yMin: rawYMin,
        xMax: rawXMax,
        yMax: rawYMax,
      },
      predictedScene: LANDING_SCENE_CATEGORIES[maxSceneIdx] || "Field",
      sceneConfidence: Math.round(maxSceneVal * 100) / 100,
      latencyMs,
      timestampMs: nowMs,
      captureTimestampMs,
    };
  }

  public getLatestResult(): VisionDetectionResult {
    return this.latestResult;
  }

  public getOffscreenCanvas(): HTMLCanvasElement | null {
    return this.offscreenCanvas;
  }

  public isReady(): boolean {
    return this.isModelLoaded;
  }

  public dispose(): void {
    if (this.session) {
      try {
        this.session.release();
      } catch {}
      this.session = null;
    }
    if (this.offscreenRenderer) {
      this.offscreenRenderer.dispose();
      this.offscreenRenderer = null;
    }
    this.offscreenCanvas = null;
  }
}
