"use client";

import React from "react";
import { Helipad, RegionId } from "@/lib/world/world-types";
import { HELIPAD_LIST } from "@/lib/world/helipad-definitions";
import { REGIONS } from "@/lib/world/region-definitions";
import { Crosshair, CheckCircle2, ShieldCheck, MapPin } from "lucide-react";

interface HelipadSelectorProps {
  selectedRegionId: RegionId;
  selectedHelipadId: string;
  onSelectHelipad: (helipadId: string) => void;
  className?: string;
}

export function HelipadSelector({
  selectedRegionId,
  selectedHelipadId,
  onSelectHelipad,
  className = "",
}: HelipadSelectorProps) {
  // Filter helipads in active region
  const regionHelipads = HELIPAD_LIST.filter((h) => h.regionId === selectedRegionId);
  // Fallback to all helipads if active region has none
  const displayedHelipads = regionHelipads.length > 0 ? regionHelipads : HELIPAD_LIST;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-sm tracking-wider uppercase text-neutral-900 flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-[#FF5500]" />
          AVAILABLE LAUNCH SITES ({displayedHelipads.length})
        </h2>
        <span className="font-mono text-xs text-neutral-500">
          DESIGNATED SPAWN PADS
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayedHelipads.map((pad) => {
          const isSelected = pad.id === selectedHelipadId;
          const region = REGIONS[pad.regionId];

          return (
            <div
              key={pad.id}
              onClick={() => onSelectHelipad(pad.id)}
              className={`rounded-xl p-4 cursor-pointer transition-all duration-200 border-2 flex flex-col justify-between ${
                isSelected
                  ? "bg-white border-black shadow-md ring-2 ring-[#FF5500] ring-offset-1 -translate-y-0.5"
                  : "bg-white/80 hover:bg-white border-neutral-300 hover:border-neutral-500 shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                      {pad.surfaceType}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-500 uppercase">
                      {region?.shortName || pad.regionId}
                    </span>
                  </div>

                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#FF5500] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                      <CheckCircle2 className="h-3 w-3" /> ACTIVE
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-neutral-400">
                      AVAILABLE
                    </span>
                  )}
                </div>

                <h3 className="font-heading font-bold text-sm text-neutral-900">
                  {pad.name}
                </h3>

                <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                  {pad.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between font-mono text-[11px]">
                <span className="text-neutral-500">
                  ELEVATION: <strong className="text-neutral-900">{pad.elevation.toFixed(1)}m</strong> MSL
                </span>
                <span className="text-neutral-500">
                  POS: [{pad.position.x}, {pad.position.z}]
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
