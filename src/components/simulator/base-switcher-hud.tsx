"use client";

import React, { useState } from "react";
import {
  MapPin,
  ChevronDown,
  Mountain,
  Building2,
  Trees,
  Waves,
  Compass,
  Plane,
  Anchor,
  Wheat,
  X,
  Sparkles,
} from "lucide-react";

export interface FastTravelBase {
  id: string;
  name: string;
  region: string;
  category: string;
  position: { x: number; y: number; z: number };
  headingDeg: number;
  elevationMsl: number;
  description: string;
  iconType: "mountain" | "city" | "forest" | "lake" | "river" | "grassland" | "harbor" | "runway";
}

export const ISLAND_BASES: FastTravelBase[] = [
  {
    id: "training-alpha",
    name: "Helipad Alpha (Main Academy)",
    region: "Central Proving Grounds",
    category: "Airfield",
    position: { x: 0, y: 2.0, z: 0 },
    headingDeg: 0,
    elevationMsl: 1.2,
    description: "Primary flight training runway and high-visibility student apron.",
    iconType: "runway",
  },
  {
    id: "mountain-summit",
    name: "Mount Apex Summit Peak",
    region: "Alpine Highlands",
    category: "Mountain Base",
    position: { x: -620, y: 147.0, z: -720 },
    headingDeg: 180,
    elevationMsl: 145.0,
    description: "The highest crag on the island with communications mast and alpine thermals.",
    iconType: "mountain",
  },
  {
    id: "city-vertiport",
    name: "Apex Tower Rooftop Vertiport",
    region: "Downtown Metropolis",
    category: "Urban High-Rise",
    position: { x: 760, y: 70.0, z: 360 },
    headingDeg: 90,
    elevationMsl: 68.0,
    description: "Skyscraper vertiport overlooking city skyline, avenues, and traffic.",
    iconType: "city",
  },
  {
    id: "forest-outpost",
    name: "Whispering Pines Ranger Station",
    region: "Dense Pine Forest",
    category: "Forest Base",
    position: { x: -620, y: 7.2, z: -40 },
    headingDeg: 45,
    elevationMsl: 5.5,
    description: "Deep pine forest watchtower clearing with grazing deer and slalom courses.",
    iconType: "forest",
  },
  {
    id: "lake-dock",
    name: "Crystal Mountain Lake Overlook",
    region: "Alpine Lake Basin",
    category: "Freshwater Lake",
    position: { x: -250, y: 16.0, z: -120 },
    headingDeg: 210,
    elevationMsl: 14.0,
    description: "Scenic high ridge campsite overlooking pristine reservoir basin and mountain peaks.",
    iconType: "lake",
  },
  {
    id: "river-bridge",
    name: "Grand Valley Canyon Overlook",
    region: "River Canyon",
    category: "Canyon Overlook",
    position: { x: -85, y: 12.0, z: 195 },
    headingDeg: 120,
    elevationMsl: 10.0,
    description: "Panoramic cliff observation station perched high above the river canyon and suspension bridge.",
    iconType: "river",
  },
  {
    id: "grassland-farm",
    name: "Emerald Foothills Homestead",
    region: "Grasslands & Pastures",
    category: "Rural Meadow",
    position: { x: 210, y: 4.6, z: 80 },
    headingDeg: 270,
    elevationMsl: 2.8,
    description: "Cozy rural farmhouse, traditional red barn, rotating windmill & pastures.",
    iconType: "grassland",
  },
  {
    id: "harbor-piers",
    name: "Coastal Cove Lookout & Pier",
    region: "Scenic Coastline",
    category: "Coastal Cove",
    position: { x: 420, y: 3.2, z: 860 },
    headingDeg: 180,
    elevationMsl: 1.5,
    description: "Scenic coastal cove with lighthouse, timber boardwalk pier, and stone lookout terrace.",
    iconType: "harbor",
  },
];

interface BaseSwitcherHUDProps {
  onTeleport: (base: FastTravelBase) => void;
}

export function BaseSwitcherHUD({ onTeleport }: BaseSwitcherHUDProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBase, setSelectedBase] = useState<FastTravelBase>(ISLAND_BASES[0]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSelect = (base: FastTravelBase) => {
    setSelectedBase(base);
    setIsOpen(false);
    onTeleport(base);

    setToastMessage(`BASE: ${base.name.toUpperCase()}`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const getBaseIcon = (type: FastTravelBase["iconType"]) => {
    switch (type) {
      case "mountain":
        return <Mountain className="h-4 w-4 text-neutral-700" />;
      case "city":
        return <Building2 className="h-4 w-4 text-neutral-700" />;
      case "forest":
        return <Trees className="h-4 w-4 text-neutral-700" />;
      case "lake":
        return <Waves className="h-4 w-4 text-neutral-700" />;
      case "river":
        return <Compass className="h-4 w-4 text-neutral-700" />;
      case "grassland":
        return <Wheat className="h-4 w-4 text-neutral-700" />;
      case "harbor":
        return <Anchor className="h-4 w-4 text-neutral-700" />;
      case "runway":
      default:
        return <Plane className="h-4 w-4 text-neutral-700" />;
    }
  };

  return (
    <>
      {/* Trigger Button in Top Header */}
      <div className="relative pointer-events-auto">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-50 text-neutral-900 font-mono text-xs font-bold border-2 border-black shadow-sm transition-all cursor-pointer active:scale-95"
          title="Switch flight bases"
        >
          <MapPin className="h-3.5 w-3.5 text-[#FF5500]" />
          <span className="hidden sm:inline text-neutral-600">Base:</span>
          <span className="text-neutral-900 font-extrabold truncate max-w-[110px] sm:max-w-[140px]">
            {selectedBase.category}
          </span>
          <ChevronDown className={`h-3 w-3 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown Menu Modal — Minimalist Clean White Card */}
        {isOpen && (
          <div className="absolute top-9 left-0 sm:left-auto sm:right-0 w-72 sm:w-80 rounded-xl bg-white border-2 border-black shadow-lg p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 font-sans text-neutral-900 select-none">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-200">
              <div className="flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-[#FF5500]" />
                <span className="text-xs font-bold tracking-wide uppercase text-neutral-900">
                  Flight Bases
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-neutral-500 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-1 max-h-[260px] overflow-y-auto pr-0.5">
              {ISLAND_BASES.map((b) => {
                const isCurrent = selectedBase.id === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelect(b)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                      isCurrent
                        ? "bg-orange-50/90 border-[#FF5500] shadow-sm"
                        : "bg-neutral-50/70 hover:bg-neutral-100/90 border-neutral-200/60 text-neutral-800"
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-white border border-neutral-200/80 shrink-0 text-[#FF5500] shadow-2xs">
                      {getBaseIcon(b.iconType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs truncate text-neutral-900">{b.name}</span>
                        <span className="text-[10px] font-mono font-bold text-[#FF5500] shrink-0 ml-1">
                          {b.elevationMsl}m
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-500 font-normal truncate mt-0.5">
                        {b.region}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Tactical Teleport Confirmation Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300 font-sans">
          <div className="px-3.5 py-1.5 rounded-lg bg-white border-2 border-black text-neutral-900 text-xs font-bold shadow-md flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-[#FF5500]" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}
