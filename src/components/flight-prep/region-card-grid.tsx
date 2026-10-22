"use client";

import React from "react";
import { RegionId, RegionDefinition } from "@/lib/world/world-types";
import { REGION_LIST } from "@/lib/world/region-definitions";
import {
  GraduationCap,
  Trees,
  Mountain,
  Waves,
  Building2,
  Factory,
  Anchor,
  Compass,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface RegionCardGridProps {
  selectedRegionId: RegionId;
  onSelectRegion: (regionId: RegionId) => void;
  className?: string;
}

const REGION_ICONS: Record<string, React.ReactNode> = {
  training: <GraduationCap className="h-5 w-5 text-amber-600" />,
  forest: <Trees className="h-5 w-5 text-emerald-600" />,
  mountain: <Mountain className="h-5 w-5 text-slate-600" />,
  river: <Waves className="h-5 w-5 text-sky-600" />,
  city: <Building2 className="h-5 w-5 text-blue-600" />,
  industrial: <Factory className="h-5 w-5 text-orange-600" />,
  coast: <Anchor className="h-5 w-5 text-teal-600" />,
  water: <Compass className="h-5 w-5 text-indigo-600" />,
};

export function RegionCardGrid({
  selectedRegionId,
  onSelectRegion,
  className = "",
}: RegionCardGridProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-sm tracking-wider uppercase text-neutral-900">
          SELECT FLIGHT REGION ({REGION_LIST.length})
        </h2>
        <span className="font-mono text-xs text-neutral-500">
          CHOOSE DEPLOYMENT SECTOR
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {REGION_LIST.map((region) => {
          const isSelected = region.id === selectedRegionId;
          const icon = REGION_ICONS[region.id] || <Compass className="h-5 w-5 text-neutral-600" />;
          const helipadCount = region.helipadIds.length;

          return (
            <div
              key={region.id}
              onClick={() => onSelectRegion(region.id)}
              className={`relative group rounded-xl p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between border-2 ${
                isSelected
                  ? "bg-white border-black shadow-[0_4px_20px_rgba(0,0,0,0.12)] ring-2 ring-[#FF5500] ring-offset-1 -translate-y-0.5"
                  : "bg-white/80 hover:bg-white border-neutral-300 hover:border-neutral-500 shadow-sm hover:shadow"
              }`}
            >
              <div>
                {/* Header: Icon + Category Badge + Selected Pill */}
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-neutral-100 border border-neutral-200">
                    {icon}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                      {region.category}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-[#FF5500]" />
                    )}
                  </div>
                </div>

                {/* Region Name */}
                <h3 className="font-heading font-bold text-sm text-neutral-950 leading-tight">
                  {region.name}
                </h3>

                {/* Description */}
                <p className="mt-1 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                  {region.description}
                </p>
              </div>

              {/* Footer Meta: Elevation + Helipads */}
              <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between font-mono text-[11px] text-neutral-500">
                <span>
                  ALT: {region.elevationRange.min}–{region.elevationRange.max}m
                </span>
                <span className={`font-semibold ${helipadCount > 0 ? "text-[#FF5500]" : "text-neutral-400"}`}>
                  {helipadCount} {helipadCount === 1 ? "HELIPAD" : "HELIPADS"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
