"use client";

import React, { useState, useEffect, useRef } from "react";
import { VisionDetectionResult } from "@/lib/vision/browser-inference";
import { LandingAssistStatus } from "@/lib/vision/landing-assist-fsm";
import {
  Eye,
  Target,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Power,
  Cpu,
  Activity,
  Layers,
} from "lucide-react";

interface VisionLandingOverlayProps {
  detection: VisionDetectionResult;
  assistStatus: LandingAssistStatus;
  isAssistEnabled: boolean;
  onToggleAssist: () => void;
  offscreenCanvas?: HTMLCanvasElement | null;
}

export function VisionLandingOverlay({
  detection,
  assistStatus,
  isAssistEnabled,
  onToggleAssist,
  offscreenCanvas,
}: VisionLandingOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Copy offscreen 224x224 camera buffer to preview canvas when expanded
  useEffect(() => {
    if (!isExpanded || !offscreenCanvas) return;

    let animId: number;
    const renderPreview = () => {
      const targetCanvas = previewCanvasRef.current;
      if (targetCanvas && offscreenCanvas) {
        const ctx = targetCanvas.getContext("2d");
        if (ctx) {
          try {
            ctx.drawImage(offscreenCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
          } catch {
            // Ignore cross-context draw issues gracefully
          }
        }
      }
      animId = requestAnimationFrame(renderPreview);
    };

    animId = requestAnimationFrame(renderPreview);
    return () => cancelAnimationFrame(animId);
  }, [isExpanded, offscreenCanvas]);

  const getStateBadgeStyle = (state: string) => {
    switch (state) {
      case "DESCENDING":
      case "TOUCHDOWN_VERIFY":
      case "COMPLETE":
        return "text-emerald-300 border-emerald-500/60 bg-emerald-950/80 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
      case "ALIGNING":
      case "TARGET_ACQUIRED":
        return "text-sky-300 border-sky-500/60 bg-sky-950/80 shadow-[0_0_10px_rgba(14,165,233,0.3)]";
      case "SEARCHING":
        return "text-amber-300 border-amber-500/60 bg-amber-950/80 animate-pulse";
      case "ABORT_OR_GO_AROUND":
      case "INVALID":
        return "text-rose-300 border-rose-500/60 bg-rose-950/80 animate-pulse";
      case "ERROR":
        return "text-amber-300 border-amber-500/50 bg-amber-950/60";
      default:
        return "text-neutral-300 border-neutral-700 bg-neutral-900/80";
    }
  };

  const getStatusDotColor = () => {
    if (detection.status === "ERROR") return "bg-amber-400/80";
    if (detection.status === "LOADING") return "bg-sky-400 animate-pulse";
    if (detection.isDetected) return "bg-emerald-400 shadow-[0_0_8px_#34d399]";
    if (detection.status === "IDLE" || detection.status === "NO_TARGET") return "bg-amber-400";
    return "bg-neutral-500";
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 font-mono text-xs select-none pointer-events-auto">
      {/* Top Cockpit Pill Header */}
      <div className="bg-neutral-950/95 backdrop-blur-md border border-neutral-700/80 rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-3.5 ring-1 ring-white/10">
        
        {/* AI Vision Status Indicator */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className={`w-2.5 h-2.5 rounded-full ${getStatusDotColor()}`} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-neutral-300" />
              <span className="text-[11px] font-black text-white tracking-wider uppercase">
                AI Vision
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic State Pill */}
        <div
          className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border tracking-wider ${getStateBadgeStyle(
            assistStatus.state !== "DISABLED" ? assistStatus.state : detection.status
          )}`}
        >
          {assistStatus.state !== "DISABLED"
            ? assistStatus.state
            : detection.status === "LOADING"
            ? "LOADING MODEL..."
            : detection.isDetected
            ? `LOCKED: ${detection.predictedScene}`
            : detection.status === "ERROR"
            ? "VISION STANDBY"
            : "SEARCHING PAD"}
        </div>

        {/* Confidence & Target Readout */}
        {detection.isDetected ? (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
            <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-emerald-400 font-bold">
              {(detection.confidence * 100).toFixed(0)}%
            </span>
          </div>
        ) : (
          <div className="hidden sm:block text-[10px] text-neutral-400">
            {detection.status === "LOADING" ? "Loading ResNeXt-50" : "Scanning terrain"}
          </div>
        )}

        {/* Inference Latency */}
        <div className="hidden md:flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
          <Activity className="w-3 h-3 text-neutral-500" />
          <span>{detection.latencyMs > 0 ? `${detection.latencyMs}ms` : "10 Hz"}</span>
        </div>

        {/* Authoritative Assist Toggle Button */}
        <button
          onClick={onToggleAssist}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer select-none ${
            isAssistEnabled
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 border border-emerald-400/50 animate-pulse"
              : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-600 shadow"
          }`}
          title={isAssistEnabled ? "Disable AI Landing Assist (Key: K)" : "Engage Autonomous Precision Landing (Key: K)"}
        >
          <Power className={`w-3.5 h-3.5 ${isAssistEnabled ? "text-white" : "text-neutral-400"}`} />
          <span>{isAssistEnabled ? "ASSIST ON" : "ASSIST OFF"}</span>
          <span className={`text-[9px] px-1 py-0.2 rounded ${isAssistEnabled ? "bg-emerald-700 text-white" : "bg-neutral-700 text-neutral-300"}`}>
            K
          </span>
        </button>

        {/* Expand / Collapse Diagnostic Camera View */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-neutral-400 hover:text-white transition-colors p-1 rounded hover:bg-neutral-800 cursor-pointer flex items-center gap-1"
          aria-label="Toggle camera scope"
          title="Toggle Downward Nadir Camera Scope View"
        >
          <span className="text-[10px] font-bold text-neutral-400">SCOPE</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Diagnostic Inspector Dropdown */}
      {isExpanded && (
        <div className="mt-2 w-96 bg-neutral-950/95 backdrop-blur-xl border border-neutral-700/80 rounded-2xl p-4 shadow-2xl space-y-3.5 ring-1 ring-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-200">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-black uppercase tracking-wider">
                ResNeXt-50 Nadir Vision Scope
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
              224x224 RGB
            </span>
          </div>

          {/* Target Detection Scope View */}
          <div className="relative w-full h-48 bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden flex items-center justify-center">
            
            {/* Live Camera Canvas Stream (or synthetic fallback) */}
            <canvas
              ref={previewCanvasRef}
              width={224}
              height={224}
              className="absolute inset-0 w-full h-full object-contain"
            />

            {/* Radar / Grid Reticle Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
              <div className="w-full h-px bg-emerald-400" />
              <div className="h-full w-px bg-emerald-400 absolute" />
              <div className="w-24 h-24 rounded-full border border-dashed border-emerald-400" />
              <div className="w-12 h-12 rounded-full border border-emerald-400" />
            </div>

            {/* Predicted Target Center Marker & Bounding Box */}
            {detection.isDetected ? (
              <>
                {/* Bounding Box */}
                <div
                  className="absolute border-2 border-emerald-400/80 bg-emerald-500/10 rounded transition-all duration-75 pointer-events-none"
                  style={{
                    left: `${Math.max(0, detection.bbox.xMin) * 100}%`,
                    top: `${Math.max(0, detection.bbox.yMin) * 100}%`,
                    width: `${Math.max(0.05, detection.bbox.xMax - detection.bbox.xMin) * 100}%`,
                    height: `${Math.max(0.05, detection.bbox.yMax - detection.bbox.yMin) * 100}%`,
                  }}
                />

                {/* Center Reticle Point */}
                <div
                  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
                  style={{
                    left: `${detection.center.u * 100}%`,
                    top: `${detection.center.v * 100}%`,
                  }}
                >
                  <div className="w-full h-full border-2 border-emerald-400 rounded-full animate-ping opacity-75" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399]" />
                  </div>
                </div>
              </>
            ) : detection.status === "ERROR" ? (
              <div className="relative z-10 text-[10px] text-amber-300 flex flex-col items-center gap-1 bg-neutral-950/90 px-3 py-1.5 rounded-lg border border-amber-500/30 text-center max-w-[190px]">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>AI Vision Standby</span>
                </div>
                <span className="text-[9px] text-neutral-400 font-sans">
                  Manual flight active. Provide NEXT_PUBLIC_MODEL_URL to enable AI helipad assist.
                </span>
              </div>
            ) : (
              <div className="relative z-10 text-[11px] text-neutral-400 uppercase tracking-widest flex items-center gap-2 bg-neutral-950/80 px-3 py-1.5 rounded-full border border-neutral-800">
                <Target className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Scanning For Helipad...</span>
              </div>
            )}

            {/* Scope Corner Telemetry */}
            <div className="absolute bottom-2 left-2.5 text-[9px] text-neutral-400 font-mono bg-black/60 px-1.5 py-0.5 rounded">
              FOV 75° Nadir
            </div>
            <div className="absolute bottom-2 right-2.5 text-[9px] text-emerald-400 font-bold font-mono bg-black/60 px-1.5 py-0.5 rounded">
              Center: ({detection.center.u.toFixed(2)}, {detection.center.v.toFixed(2)})
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 uppercase block font-semibold">Detection Confidence</span>
              <span className={`text-sm font-black ${detection.isDetected ? "text-emerald-400" : "text-neutral-400"}`}>
                {(detection.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 uppercase block font-semibold">Predicted Scene</span>
              <span className="text-sm font-black text-sky-400">{detection.predictedScene}</span>
            </div>
            <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 uppercase block font-semibold">Inference Latency</span>
              <span className="text-sm font-black text-white">{detection.latencyMs} ms</span>
            </div>
            <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 uppercase block font-semibold">Guidance FSM State</span>
              <span className="text-sm font-black text-amber-400">{assistStatus.state}</span>
            </div>
          </div>

          {/* Safety & Authoritative Manual Override Notice */}
          <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-start gap-2.5 text-[10px] text-neutral-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-white font-bold block text-[11px]">
                Authoritative Manual Override Active
              </span>
              Moving pitch, roll, or throttle sticks instantly halts AI guidance and yields 100% manual control to the pilot.
            </div>
          </div>

          {/* Abort Warning Alert if present */}
          {assistStatus.abortReason && (
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-center gap-2.5 text-[10px] text-rose-200 animate-pulse">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{assistStatus.abortReason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
