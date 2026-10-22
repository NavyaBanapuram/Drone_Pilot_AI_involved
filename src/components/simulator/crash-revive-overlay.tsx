"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Zap, RotateCcw, BarChart3 } from "lucide-react";
import { CrashState } from "@/lib/simulation/types";

interface CrashReviveOverlayProps {
  crashState: CrashState | null;
  onReviveHere: () => void;
  onResetToBase: () => void;
  onOpenAnalysis: () => void;
}

export const CrashReviveOverlay: React.FC<CrashReviveOverlayProps> = ({
  crashState,
  onReviveHere,
  onResetToBase,
  onOpenAnalysis,
}) => {
  if (!crashState || !crashState.isCrashed) return null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyR" || e.code === "Space") {
        e.preventDefault();
        onReviveHere();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onReviveHere]);

  const primaryCause = crashState.primaryCause || "Catastrophic structural failure.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4 select-none bg-black/40 backdrop-blur-sm">
      <div className="pointer-events-auto max-w-sm w-full bg-neutral-900/95 border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="p-3 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/30">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-widest uppercase">
              Crash Detected
            </h2>
            <p className="text-sm font-medium text-white/60 mt-1">
              {primaryCause}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onReviveHere}
            className="w-full py-3.5 px-4 rounded-xl bg-[#FF5500] hover:bg-[#FF7733] text-white font-bold text-sm tracking-widest uppercase shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Revive drone immediately at this location (Space / R)"
          >
            <Zap className="w-5 h-5" />
            <span>Revive Drone</span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-black/20 rounded">
              [SPACE]
            </span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onResetToBase}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-white/70" />
              <span>Base</span>
            </button>

            <button
              onClick={onOpenAnalysis}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
