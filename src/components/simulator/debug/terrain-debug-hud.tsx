"use client";

import React, { useMemo } from "react";
import { TelemetryState } from "@/lib/simulation/types";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";
import { REGIONS } from "@/lib/world/region-definitions";
import { HELIPAD_LIST } from "@/lib/world/helipad-definitions";
import { queryHydrology } from "@/lib/world/hydrology-mask";
import { Terminal, X } from "lucide-react";

interface TerrainDebugHUDProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryState;
}

export function TerrainDebugHUD({ isOpen, onClose, telemetry }: TerrainDebugHUDProps) {
  if (!isOpen) return null;

  const sample = evaluateIslandElevation(telemetry.position.x, telemetry.position.z);
  const region = REGIONS[sample.regionId];
  const hydro = queryHydrology(telemetry.position.x, telemetry.position.z, sample.elevation);

  // Nearest helipad calculation
  let nearestHelipad = HELIPAD_LIST[0];
  let minDistance = Infinity;

  for (const h of HELIPAD_LIST) {
    const d = Math.hypot(
      telemetry.position.x - h.position.x,
      telemetry.position.z - h.position.z
    );
    if (d < minDistance) {
      minDistance = d;
      nearestHelipad = h;
    }
  }

  const agl = Math.max(0, telemetry.position.y - sample.elevation - 0.245);

  return (
    <div className="fixed top-16 left-4 z-40 w-80 bg-black/90 text-white border-2 border-emerald-500 rounded-xl p-3.5 shadow-2xl backdrop-blur-md font-mono text-xs select-none animate-in fade-in duration-150">
      {/* Title Bar */}
      <div className="flex items-center justify-between border-b border-neutral-700 pb-2 mb-2.5">
        <div className="flex items-center gap-2 text-emerald-400">
          <Terminal className="h-4 w-4" />
          <span className="font-bold tracking-wider text-[11px] uppercase">
            HYDROLOGY & TERRAIN DEBUG
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-white"
          aria-label="Close debug HUD"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Telemetry Metrics */}
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-neutral-400">WORLD POS:</span>
          <span className="font-bold text-white">
            [{telemetry.position.x.toFixed(1)}m, {telemetry.position.z.toFixed(1)}m]
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-400">GROUND ELEVATION:</span>
          <span className="font-bold text-amber-400">
            {sample.elevation >= 0 ? `+${sample.elevation.toFixed(2)}m` : `${sample.elevation.toFixed(2)}m`} MSL
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-400">SEA LEVEL (CANONICAL):</span>
          <span className="font-bold text-sky-400">0.0m MSL</span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-400">WATER DEPTH:</span>
          <span className={`font-bold ${hydro.depth > 0 ? "text-cyan-400" : "text-neutral-400"}`}>
            {hydro.depth.toFixed(2)}m ({hydro.type})
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-400">DRONE ALT (MSL):</span>
          <span className="font-bold text-cyan-400">
            {telemetry.position.y.toFixed(2)}m
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-400">RADAR AGL:</span>
          <span className="font-bold text-emerald-400">
            {agl.toFixed(2)}m AGL
          </span>
        </div>

        <div className="flex justify-between border-t border-neutral-800 pt-1.5">
          <span className="text-neutral-400">SURFACE BIOME:</span>
          <span className="font-bold text-[#FF5500] uppercase">
            {sample.surfaceType} ({sample.slope > 0.4 ? "STEEP" : "FLAT"})
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-400">ACTIVE REGION:</span>
          <span className="font-bold text-white truncate max-w-[150px]">
            {region?.name || sample.regionId}
          </span>
        </div>

        <div className="flex justify-between border-t border-neutral-800 pt-1.5">
          <span className="text-neutral-400">NEAREST HELIPAD:</span>
          <span className="text-neutral-200 truncate max-w-[140px]">
            {nearestHelipad.name.split(" ")[0]} ({minDistance.toFixed(0)}m)
          </span>
        </div>
      </div>

      <div className="mt-2.5 pt-1.5 border-t border-neutral-800 text-[10px] text-neutral-500 flex justify-between">
        <span>PRESS F3 OR ` TO TOGGLE</span>
        <span className="text-emerald-500 font-bold">ACTIVE</span>
      </div>
    </div>
  );
}
