"use client";

import React from "react";
import { RegionDefinition, Helipad } from "@/lib/world/world-types";
import { Wind, Thermometer, Eye, Mountain, Compass, ShieldCheck } from "lucide-react";

interface RegionPreviewPanelProps {
  region: RegionDefinition;
  availableHelipads: Helipad[];
  onSelectHelipad: (helipadId: string) => void;
  selectedHelipadId: string;
  className?: string;
}

export function RegionPreviewPanel({
  region,
  availableHelipads,
  onSelectHelipad,
  selectedHelipadId,
  className = "",
}: RegionPreviewPanelProps) {
  const env = region.environment;

  return (
    <div
      className={`bg-white border-2 border-black rounded-2xl p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col justify-between font-sans ${className}`}
    >
      <div>
        {/* Header: Region Name & Sector Category */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: region.mapColor }}
              />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                ZONE // {region.id.toUpperCase()}
              </span>
            </div>
            <h2 className="font-heading font-bold text-xl text-neutral-950 uppercase mt-0.5">
              {region.name}
            </h2>
          </div>

          <span className="font-mono text-xs font-bold uppercase px-2.5 py-1 rounded bg-neutral-100 border border-neutral-300 text-neutral-800 shrink-0">
            {region.category}
          </span>
        </div>

        {/* Geographic Description */}
        <p className="mt-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
          {region.description}
        </p>

        {/* Environmental Telemetry Grid */}
        <div className="mt-4">
          <span className="font-mono text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
            METEOROLOGICAL TELEMETRY
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Wind */}
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[10px] font-mono uppercase">WIND</span>
                <Wind className="h-3.5 w-3.5 text-[#FF5500]" />
              </div>
              <div className="mt-1">
                <strong className="font-mono text-sm text-neutral-900 block leading-tight">
                  {env.baseWindSpeedMs.toFixed(1)} m/s
                </strong>
                <span className="text-[10px] font-mono text-neutral-500">
                  HDG {env.windDirectionDeg.toString().padStart(3, "0")}°
                </span>
              </div>
            </div>

            {/* Temperature */}
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[10px] font-mono uppercase">AIR TEMP</span>
                <Thermometer className="h-3.5 w-3.5 text-[#FF5500]" />
              </div>
              <div className="mt-1">
                <strong className="font-mono text-sm text-neutral-900 block leading-tight">
                  {env.airTemperatureC}°C
                </strong>
                <span className="text-[10px] font-mono text-neutral-500">
                  ρ {env.airDensity.toFixed(2)} kg/m³
                </span>
              </div>
            </div>

            {/* Visibility */}
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[10px] font-mono uppercase">VISIBILITY</span>
                <Eye className="h-3.5 w-3.5 text-[#FF5500]" />
              </div>
              <div className="mt-1">
                <strong className="font-mono text-sm text-neutral-900 block leading-tight">
                  {env.visibilityKm} km
                </strong>
                <span className="text-[10px] font-mono text-neutral-500">
                  VFR CONDITIONS
                </span>
              </div>
            </div>

            {/* Elevation Envelope */}
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[10px] font-mono uppercase">ELEVATION</span>
                <Mountain className="h-3.5 w-3.5 text-[#FF5500]" />
              </div>
              <div className="mt-1">
                <strong className="font-mono text-sm text-neutral-900 block leading-tight">
                  {region.elevationRange.min}–{region.elevationRange.max}m
                </strong>
                <span className="text-[10px] font-mono text-neutral-500">
                  AGL ENVELOPE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Available Helipads in this Region */}
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              LAUNCH PADS IN THIS SECTOR ({availableHelipads.length})
            </span>
          </div>

          {availableHelipads.length === 0 ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              No designated landing pad in this sector. Flights deploy to nearest perimeter outpost.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableHelipads.map((pad) => {
                const isSelected = pad.id === selectedHelipadId;
                return (
                  <button
                    key={pad.id}
                    type="button"
                    onClick={() => onSelectHelipad(pad.id)}
                    className={`p-3 rounded-xl text-left transition-all border-2 flex items-center justify-between ${
                      isSelected
                        ? "bg-neutral-950 text-white border-black shadow-md ring-2 ring-[#FF5500]"
                        : "bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
                    }`}
                  >
                    <div>
                      <strong className="font-heading text-xs font-bold block truncate">
                        {pad.name}
                      </strong>
                      <span
                        className={`font-mono text-[10px] block ${
                          isSelected ? "text-neutral-300" : "text-neutral-500"
                        }`}
                      >
                        ALT: {pad.elevation.toFixed(1)}m • {pad.surfaceType.toUpperCase()}
                      </span>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isSelected
                          ? "bg-[#FF5500] text-white"
                          : "bg-neutral-100 text-neutral-700 border border-neutral-300"
                      }`}
                    >
                      H
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
