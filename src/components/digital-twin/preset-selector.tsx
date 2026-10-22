"use client";

import React from "react";
import { DroneDigitalTwinConfiguration } from "@/types/drone-digital-twin";
import { DIGITAL_TWIN_PRESETS } from "@/lib/digital-twin/digital-twin-presets";
import { Sparkles, Copy, Plane } from "lucide-react";

interface PresetSelectorProps {
  currentConfig: DroneDigitalTwinConfiguration;
  onSelectPreset: (preset: DroneDigitalTwinConfiguration) => void;
  onCloneToCustom: () => void;
}

export function PresetSelector({
  currentConfig,
  onSelectPreset,
  onCloneToCustom,
}: PresetSelectorProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-300 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#FF5500] uppercase">
            AIRCRAFT PRESETS & ARCHITECTURE
          </span>
          <h2 className="text-base sm:text-lg font-heading font-bold text-neutral-950 uppercase">
            SELECT AIRCRAFT CONFIGURATION
          </h2>
        </div>

        <button
          type="button"
          onClick={onCloneToCustom}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold tracking-wide transition-all self-start sm:self-auto shadow-xs"
        >
          <Copy className="h-3.5 w-3.5 text-[#FF5500]" />
          <span>Clone to Custom Model</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {DIGITAL_TWIN_PRESETS.map((preset) => {
          const isSelected = currentConfig.identity.id === preset.identity.id;
          return (
            <button
              key={preset.identity.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                isSelected
                  ? "border-[#FF5500] bg-orange-50/60 ring-2 ring-[#FF5500]/20 shadow-xs"
                  : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100/60 hover:border-neutral-300"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                  <Plane className="h-3 w-3 text-[#FF5500]" />
                  {preset.identity.category}
                </span>

                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-neutral-200/80 text-neutral-800">
                  {preset.airframe.motorCount}R
                </span>
              </div>

              <span className="text-sm font-heading font-bold text-neutral-900 leading-tight">
                {preset.identity.name}
              </span>

              <span className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-snug">
                {preset.identity.description}
              </span>

              <div className="mt-3 pt-2 border-t border-neutral-200/80 flex items-center justify-between text-[10px] font-mono text-neutral-600">
                <span>Mass: {preset.massProperties.totalMassKg}kg</span>
                <span>TWR: {preset.performance.thrustToWeightRatio}:1</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
