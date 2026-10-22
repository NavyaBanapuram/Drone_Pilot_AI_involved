"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { WorldScene } from "@/components/simulator/world-scene";
import {
  createDownwardCamera,
  evaluateHelipadProjection,
} from "@/lib/vision/camera-projection";
import {
  ScenarioGenerator,
  ALL_NINE_HELIPAD_IDS,
  ScenarioPoint,
} from "@/lib/vision/scenario-generator";
import {
  DatasetSampleRecord,
  DatasetSplitManifest,
  DatasetSummaryReport,
} from "@/lib/vision/dataset-schema";
import {
  splitDatasetByFlightRun,
  generateDatasetSummary,
  formatRecordsToJSONL,
  formatRecordsToCSV,
  validateDatasetIntegrity,
} from "@/lib/vision/dataset-exporter";
import { HELIPADS_RECORD } from "@/lib/world/world-definition";
import { Camera, Play, CheckCircle, AlertCircle, RefreshCw, Layers } from "lucide-react";

declare global {
  interface Window {
    __DATASET_RUNNER_READY__?: boolean;
    __onSampleCaptured?: (payload: { sampleId: string; imageFilename: string; dataUrl: string; record: DatasetSampleRecord }) => Promise<void>;
    __onBatchComplete?: (payload: { summary: DatasetSummaryReport; manifest: DatasetSplitManifest; jsonl: string; csv: string }) => Promise<void>;
  }
}

export default function DatasetCapturePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Ready to generate precision landing dataset");
  const [runCount, setRunCount] = useState(10);
  const [framesPerRun, setFramesPerRun] = useState(10);
  const [seed, setSeed] = useState(4242);
  const [selectedHelipads, setSelectedHelipads] = useState<string[]>([...ALL_NINE_HELIPAD_IDS]);
  const [currentSample, setCurrentSample] = useState<DatasetSampleRecord | null>(null);
  const [summary, setSummary] = useState<DatasetSummaryReport | null>(null);

  const worldSceneRef = useRef<WorldScene | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Initialize Isolated Three.js Renderer & WorldScene
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(224, 224, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    const worldScene = new WorldScene(scene);
    scene.add(worldScene.group);
    worldSceneRef.current = worldScene;

    // Sanitize any missing materials
    scene.traverse((obj: any) => {
      if (obj.isMesh && !obj.material) {
        obj.material = new THREE.MeshBasicMaterial({ color: 0x888888 });
      }
    });

    window.__DATASET_RUNNER_READY__ = true;
    setStatusText("3D World scene initialized (224x224 WebGL). Ready for capture.");

    // Check for URL autoplay parameter (e.g. for headless Playwright execution)
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoplay") === "true") {
      const pRuns = parseInt(params.get("runs") || "10", 10);
      const pFrames = parseInt(params.get("frames") || "10", 10);
      const pSeed = parseInt(params.get("seed") || "4242", 10);
      setTimeout(() => {
        executeCaptureBatch(pRuns, pFrames, pSeed);
      }, 500);
    }

    return () => {
      renderer.dispose();
    };
  }, []);

  const executeCaptureBatch = async (
    targetRuns = runCount,
    targetFrames = framesPerRun,
    targetSeed = seed
  ) => {
    if (!rendererRef.current || !sceneRef.current) return;
    setIsRunning(true);
    setProgress(0);
    setSummary(null);

    const scenarioGen = new ScenarioGenerator({
      seed: targetSeed,
      targetHelipads: selectedHelipads.length > 0 ? selectedHelipads : [...ALL_NINE_HELIPAD_IDS],
      runCount: targetRuns,
      framesPerRun: targetFrames,
      negativeRunRatio: 0.2, // 20% negative/off-pad samples
    });

    const scenarioPoints = scenarioGen.generateBatch();
    const totalPoints = scenarioPoints.length;
    setStatusText(`Generated ${totalPoints} trajectory scenario points across ${targetRuns} flight runs.`);

    const records: DatasetSampleRecord[] = [];
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const canvas = canvasRef.current!;

    for (let i = 0; i < totalPoints; i++) {
      const pt = scenarioPoints[i];
      const helipad = HELIPADS_RECORD[pt.targetHelipadId];
      if (!helipad) continue;

      const sampleId = `sample_${pt.flightRunId}_${pt.sequenceNumber.toString().padStart(4, "0")}`;
      const imageFilename = `images/${sampleId}.png`;

      // 1. Position and orient downward camera
      const camera = createDownwardCamera(pt.dronePosition, pt.droneAttitude, 75, 1.0);

      // 2. Evaluate ground-truth projection & bounding box
      const proj = evaluateHelipadProjection(
        camera,
        pt.dronePosition,
        pt.droneAttitude,
        helipad.position,
        helipad.dimensions.radius || 7.0,
        helipad.headingDeg,
        224,
        224
      );

      // 3. Render 3D frame through downward camera
      renderer.render(scene, camera);

      // 4. Capture genuine PNG data URL
      const dataUrl = canvas.toDataURL("image/png");

      // 5. Draw visual verification overlay
      drawOverlay(proj);

      // 6. Build synchronized record
      const record: DatasetSampleRecord = {
        sampleId,
        flightRunId: pt.flightRunId,
        sequenceNumber: pt.sequenceNumber,
        simulationTimestampSeconds: pt.timeSeconds,
        timestampIso: new Date().toISOString(),
        imageFilename,
        targetHelipadId: pt.targetHelipadId,
        sceneCategory: pt.sceneCategory,
        surfaceType: helipad.surfaceType,
        helipadWorldCenter: { ...helipad.position },
        helipadRadiusMeters: helipad.dimensions.radius || 7.0,
        airframeType: pt.airframeType,
        droneWorldPosition: { ...pt.dronePosition },
        droneAttitude: { ...pt.droneAttitude },
        altitudeAglMeters: pt.altitudeAglMeters,
        altitudeAbovePadMeters: Math.round((pt.dronePosition.y - helipad.position.y) * 100) / 100,
        cameraFovDegrees: 75,
        imageResolution: { width: 224, height: 224 },
        projection: {
          centerNorm: proj.centerNorm,
          centerPixel: proj.centerPixel,
          bboxNorm: proj.bboxNorm,
          bboxPixel: proj.bboxPixel,
          apparentRadiusPixels: proj.apparentRadiusPixels,
          isTruncated: proj.isTruncated,
        },
        relativePose: proj.relativePose,
        detection: {
          isValidTarget: proj.isValidTarget,
          visibility: proj.visibility,
          invalidReasonCode: proj.invalidReasonCode,
        },
        telemetry: {
          flightTimeSeconds: pt.timeSeconds,
          flightMode: "HOVER",
          groundSpeedKmh: 12.0,
          verticalSpeedMs: -0.8,
          batteryPercent: 95.0,
          batteryVoltageV: 16.2,
          motorOutputs: [0.65, 0.65, 0.65, 0.65],
        },
      };

      records.push(record);
      setCurrentSample(record);
      setProgress(Math.round(((i + 1) / totalPoints) * 100));

      // Stream to Playwright automation if active
      if (window.__onSampleCaptured) {
        await window.__onSampleCaptured({
          sampleId,
          imageFilename,
          dataUrl,
          record,
        });
      }

      // Yield frame to UI
      if (i % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    // Generate Partitioned Splits & Verification Report
    const manifest = splitDatasetByFlightRun(records, 0.7, 0.15, 0.15, targetSeed);
    const summaryReport = generateDatasetSummary(records, manifest);
    const validation = validateDatasetIntegrity(records, manifest);

    setSummary(summaryReport);
    setStatusText(
      `Dataset generated: ${records.length} samples. Valid: ${summaryReport.validTargetsCount}, Invalid: ${summaryReport.invalidTargetsCount} (${summaryReport.negativeSamplePercentage}%). Integrity: ${validation.valid ? "PASSED" : "FAILED"}`
    );
    setIsRunning(false);

    if (window.__onBatchComplete) {
      await window.__onBatchComplete({
        summary: summaryReport,
        manifest,
        jsonl: formatRecordsToJSONL(records),
        csv: formatRecordsToCSV(records),
      });
    }
  };

  const drawOverlay = (proj: any) => {
    const oCanvas = overlayCanvasRef.current;
    if (!oCanvas) return;
    const ctx = oCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 224, 224);

    if (proj.visibility === "OUT_OF_FRAME" || proj.visibility === "BEHIND_CAMERA") {
      ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, 216, 216);
      ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
      ctx.font = "10px monospace";
      ctx.fillText(proj.visibility, 12, 20);
      return;
    }

    // Draw Bounding Box
    const b = proj.bboxPixel;
    ctx.strokeStyle = proj.isValidTarget ? "#22c55e" : "#eab308";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.xMin, b.yMin, b.xMax - b.xMin, b.yMax - b.yMin);

    // Draw Center Crosshair
    const cx = proj.centerPixel.x;
    const cy = proj.centerPixel.y;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 6);
    ctx.stroke();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-mono p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-[#FF5500]" />
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wider text-white">
                DronePilot Synthetic Dataset Generator
              </h1>
              <p className="text-xs text-neutral-400">
                Phase C: ResNeXt Precision Landing Ground-Truth Pipeline (224x224 WebGL Nadir)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                isRunning ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
              }`}
            />
            <span className="text-xs text-neutral-400 uppercase">{isRunning ? "CAPTURING" : "IDLE"}</span>
          </div>
        </div>

        {/* Viewport and Live Inspector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 224x224 WebGL Viewport */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col items-center">
            <h2 className="text-xs text-neutral-400 uppercase mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" /> 224x224 Nadir Camera Feed
            </h2>
            <div className="relative w-[224px] h-[224px] rounded-lg overflow-hidden border-2 border-neutral-700 shadow-xl bg-black">
              <canvas ref={canvasRef} width={224} height={224} className="absolute inset-0" />
              <canvas
                ref={overlayCanvasRef}
                width={224}
                height={224}
                className="absolute inset-0 pointer-events-none"
              />
            </div>
            <div className="mt-3 text-[11px] text-neutral-400 flex items-center justify-between w-full px-2">
              <span>FOV: 75° Nadir</span>
              <span>Aspect: 1:1</span>
              <span>224 x 224</span>
            </div>
          </div>

          {/* Current Sample Ground Truth Inspector */}
          <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h2 className="text-xs text-neutral-400 uppercase mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-sky-400" /> Active Ground-Truth Telemetry
              </h2>
              {currentSample ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase block">Sample ID</span>
                    <span className="text-white font-bold truncate block">{currentSample.sampleId}</span>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase block">Target Helipad</span>
                    <span className="text-emerald-400 font-bold">{currentSample.targetHelipadId}</span>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase block">Scene Class</span>
                    <span className="text-sky-400 font-bold">{currentSample.sceneCategory}</span>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase block">Altitude Above Pad</span>
                    <span className="text-white font-bold">{currentSample.altitudeAbovePadMeters} m</span>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase block">BBox (Norm)</span>
                    <span className="text-amber-400 font-mono text-[11px]">
                      [{currentSample.projection.bboxNorm.xMin.toFixed(2)},{" "}
                      {currentSample.projection.bboxNorm.yMin.toFixed(2)},{" "}
                      {currentSample.projection.bboxNorm.xMax.toFixed(2)},{" "}
                      {currentSample.projection.bboxNorm.yMax.toFixed(2)}]
                    </span>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase block">Target Visibility</span>
                    <span
                      className={`font-bold ${
                        currentSample.detection.isValidTarget ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {currentSample.detection.visibility}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-neutral-500 text-xs italic py-8 text-center">
                  Press Start Batch Capture to begin generating verified frames.
                </div>
              )}
            </div>

            {/* Progress & Status */}
            <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>{statusText}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#FF5500] h-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Controls */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h2 className="text-xs text-neutral-400 uppercase mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#FF5500]" /> Batch Parameters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-neutral-400 block mb-1">Flight Runs</label>
              <input
                type="number"
                min="1"
                max="150"
                value={runCount}
                onChange={(e) => setRunCount(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">Frames Per Run</label>
              <input
                type="number"
                min="1"
                max="30"
                value={framesPerRun}
                onChange={(e) => setFramesPerRun(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">PRNG Seed</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white"
                disabled={isRunning}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => executeCaptureBatch(runCount, framesPerRun, seed)}
                disabled={isRunning}
                className="w-full bg-[#FF5500] hover:bg-[#e04b00] disabled:bg-neutral-800 text-white font-bold p-2.5 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" /> Start Batch Capture
              </button>
            </div>
          </div>
        </div>

        {/* Verification Summary Report */}
        {summary && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-4">
            <h2 className="text-xs text-emerald-400 uppercase font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Batch Complete: Verification Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
                <span className="text-neutral-400 block text-[10px] uppercase">Total Samples</span>
                <span className="text-lg font-bold text-white">{summary.totalSamples}</span>
              </div>
              <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
                <span className="text-neutral-400 block text-[10px] uppercase">Valid Targets</span>
                <span className="text-lg font-bold text-emerald-400">{summary.validTargetsCount}</span>
              </div>
              <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
                <span className="text-neutral-400 block text-[10px] uppercase">Negative / Occluded</span>
                <span className="text-lg font-bold text-amber-400">
                  {summary.invalidTargetsCount} ({summary.negativeSamplePercentage}%)
                </span>
              </div>
              <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
                <span className="text-neutral-400 block text-[10px] uppercase">Train / Val / Test</span>
                <span className="text-lg font-bold text-sky-400">
                  {summary.splits.train} / {summary.splits.val} / {summary.splits.test}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
