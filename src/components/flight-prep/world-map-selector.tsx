"use client";

import React, { useMemo, useState } from "react";
import { RegionId } from "@/lib/world/world-types";
import { getTacticalMapData } from "@/lib/world/map-data";
import { REGIONS } from "@/lib/world/region-definitions";
import { HELIPADS } from "@/lib/world/helipad-definitions";
import { Radio, Crosshair, Layers, Navigation } from "lucide-react";

interface WorldMapSelectorProps {
  selectedRegionId: RegionId;
  selectedHelipadId: string;
  onSelectRegion: (regionId: RegionId) => void;
  onSelectHelipad: (helipadId: string) => void;
  className?: string;
}

const MAP_SIZE = 720;

export function WorldMapSelector({
  selectedRegionId,
  selectedHelipadId,
  onSelectRegion,
  onSelectHelipad,
  className = "",
}: WorldMapSelectorProps) {
  const [hoveredRegionId, setHoveredRegionId] = useState<RegionId | null>(null);
  const [hoveredHelipadId, setHoveredHelipadId] = useState<string | null>(null);

  // Derive all tactical map features directly from canonical WORLD_DEFINITION
  const mapData = useMemo(() => getTacticalMapData(MAP_SIZE), []);

  const selectedHelipad = HELIPADS[selectedHelipadId];
  const selectedRegion = REGIONS[selectedRegionId];

  return (
    <div
      className={`relative flex flex-col bg-neutral-950 border-2 border-neutral-700/80 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.7)] overflow-hidden font-mono select-none ${className}`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/90 text-white border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <Radio className="h-4 w-4 text-[#ff5500] animate-pulse" />
          <span className="font-heading font-extrabold text-xs uppercase tracking-wider">
            ARCHIPELAGO WORLD RECONNAISSANCE
          </span>
          <span className="text-[10px] bg-black/60 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
            2.4km × 2.2km
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[11px] text-neutral-400">
          <span>DATUM: MSL 0.0m</span>
          <span className="text-neutral-600">•</span>
          <span className="text-[#ff5500] font-semibold">
            SECTOR: {selectedRegion?.name.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Map SVG Viewport */}
      <div className="relative w-full aspect-square bg-[#081726] overflow-hidden group">
        <svg
          viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}
          className="w-full h-full cursor-crosshair"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Maritime Radar Grid */}
            <pattern id="recon-ocean-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth="1"
              />
            </pattern>

            {/* Lush Island Landmass Gradient */}
            <linearGradient id="island-surface-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3e2b" />
              <stop offset="50%" stopColor="#254d37" />
              <stop offset="100%" stopColor="#1b3d2b" />
            </linearGradient>
          </defs>

          {/* 1. Deep Ocean Background */}
          <rect width={MAP_SIZE} height={MAP_SIZE} fill="#081726" />
          <rect width={MAP_SIZE} height={MAP_SIZE} fill="url(#recon-ocean-grid)" />

          {/* 2. Concentric Distance Radar Rings (400m, 800m, 1200m) */}
          {[400, 800, 1200].map((distMeters, i) => {
            const r = (distMeters * (MAP_SIZE * 0.46)) / 1400;
            return (
              <circle
                key={i}
                cx={MAP_SIZE / 2}
                cy={MAP_SIZE / 2}
                r={r}
                fill="none"
                stroke="rgba(255, 255, 255, 0.07)"
                strokeDasharray="4 6"
                strokeWidth="1"
              />
            );
          })}

          {/* Crosshair Center Axes */}
          <line
            x1={MAP_SIZE / 2}
            y1={0}
            x2={MAP_SIZE / 2}
            y2={MAP_SIZE}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="1"
          />
          <line
            x1={0}
            y1={MAP_SIZE / 2}
            x2={MAP_SIZE}
            y2={MAP_SIZE / 2}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="1"
          />

          {/* 3. Turquoise Coastal Shallow Reef Shelf */}
          <path
            d={mapData.coastlinePath}
            fill="none"
            stroke="#0d4a6e"
            strokeWidth="22"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* 4. Natural Golden Sand Beach Perimeter */}
          <path
            d={mapData.coastlinePath}
            fill="none"
            stroke="#dfc086"
            strokeWidth="8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* 5. Natural Island Landmass Body */}
          <path
            d={mapData.coastlinePath}
            fill="url(#island-surface-grad)"
            stroke="#2d5e3f"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* 6. Geographic Biomes & Relief */}
          {/* North/NW Mount Apex Massif Topography Shading */}
          <g opacity="0.85">
            <ellipse cx="230" cy="210" rx="125" ry="95" fill="#2d3748" stroke="#4a5568" strokeWidth="1.5" />
            <ellipse cx="215" cy="195" rx="85" ry="65" fill="#3b4b5e" stroke="#64748b" strokeWidth="1.2" />
            <ellipse cx="205" cy="185" rx="45" ry="35" fill="#4d5f75" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="200" cy="175" r="14" fill="#e2e8f0" opacity="0.9" />
            <text x="200" y="179" fill="#0f172a" fontSize="8" fontWeight="900" textAnchor="middle">
              145m
            </text>
            <text x="235" y="240" fill="#cbd5e1" fontSize="8" fontWeight="bold" textAnchor="middle" letterSpacing="1">
              ▲ MT. APEX MASSIF
            </text>
          </g>

          {/* West Whispering Pines Continuous Woodland Footprint */}
          <g opacity="0.8">
            <ellipse cx="225" cy="370" rx="105" ry="85" fill="#133621" stroke="#1b4d2e" strokeWidth="1.5" />
            <circle cx="185" cy="350" r="28" fill="#0f2919" opacity="0.7" />
            <circle cx="255" cy="340" r="32" fill="#0f2919" opacity="0.7" />
            <circle cx="215" cy="400" r="30" fill="#0f2919" opacity="0.7" />
            <text x="225" y="315" fill="#86efac" fontSize="8" fontWeight="bold" textAnchor="middle" opacity="0.9" letterSpacing="1">
              WHISPERING PINES FOREST
            </text>
          </g>

          {/* East Downtown Metropolis Urban Footprint */}
          <g opacity="0.9">
            <rect x="520" y="380" width="130" height="110" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            <line x1="520" y1="425" x2="650" y2="425" stroke="#334155" strokeWidth="4" />
            <line x1="520" y1="460" x2="650" y2="460" stroke="#334155" strokeWidth="4" />
            <line x1="565" y1="380" x2="565" y2="490" stroke="#334155" strokeWidth="4" />
            <line x1="610" y1="380" x2="610" y2="490" stroke="#334155" strokeWidth="4" />
            {/* Apex Tower */}
            <rect x="590" y="430" width="30" height="30" rx="2" fill="#020617" stroke="#ff5500" strokeWidth="2" />
            <text x="605" y="448" fill="#ff5500" fontSize="7" fontWeight="900" textAnchor="middle">
              APEX
            </text>
            <text x="585" y="372" fill="#93c5fd" fontSize="8" fontWeight="bold" textAnchor="middle" letterSpacing="1">
              METROPOLIS
            </text>
          </g>

          {/* South/SE Harbor Industrial Park Footprint */}
          <g opacity="0.85">
            <rect x="420" y="520" width="105" height="75" rx="6" fill="#2d3748" stroke="#4a5568" strokeWidth="1.5" />
            <text x="472" y="512" fill="#fcd34d" fontSize="7.5" fontWeight="bold" textAnchor="middle" letterSpacing="1">
              HARBOR LOGISTICS
            </text>
            {/* Harbor Pier */}
            <rect x="480" y="585" width="14" height="35" fill="#334155" stroke="#475569" strokeWidth="1" />
          </g>

          {/* 7. Waterways: Alpine Lake & Carved River Canyon */}
          {/* Alpine Mountain Lake */}
          <circle
            cx={mapData.waterways.lake.cx}
            cy={mapData.waterways.lake.cy}
            r={mapData.waterways.lake.r}
            fill="#0284c7"
            stroke="#38bdf8"
            strokeWidth="1.8"
          />
          <text
            x={mapData.waterways.lake.cx}
            y={mapData.waterways.lake.cy + 3}
            fill="#ffffff"
            fontSize="7"
            fontWeight="bold"
            textAnchor="middle"
          >
            LAKE
          </text>

          {/* Valley River Corridor */}
          <path
            d={mapData.waterways.riverPath}
            fill="none"
            stroke="#0c4a6e"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={mapData.waterways.riverPath}
            fill="none"
            stroke="#0284c7"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 8. Master Road Network */}
          {/* Highways & Connectors Casing */}
          <g fill="none" stroke="#0f172a" strokeLinecap="round" strokeLinejoin="round">
            {mapData.roads.highways.map((h) => (
              <path key={h.id} d={h.path} strokeWidth={h.width + 3} />
            ))}
            {mapData.roads.connectors.map((c) => (
              <path key={c.id} d={c.path} strokeWidth={c.width + 2} />
            ))}
            {mapData.roads.mountainPasses.map((m) => (
              <path key={m.id} d={m.path} strokeWidth={m.width + 2} />
            ))}
          </g>

          {/* Highways & Connectors Surface (High-Visibility Yellow) */}
          <g fill="none" stroke="#f59e0b" strokeLinecap="round" strokeLinejoin="round">
            {mapData.roads.highways.map((h) => (
              <path key={h.id} d={h.path} strokeWidth={h.width} />
            ))}
            {mapData.roads.connectors.map((c) => (
              <path key={c.id} d={c.path} strokeWidth={c.width} />
            ))}
            {mapData.roads.mountainPasses.map((m) => (
              <path key={m.id} d={m.path} strokeWidth={m.width} strokeDasharray="5 3" />
            ))}
          </g>

          {/* Valley Highway Bridge */}
          {mapData.roads.bridges.map((b) => (
            <path
              key={b.id}
              d={b.path}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={b.width + 2}
              strokeLinecap="butt"
            />
          ))}

          {/* 9. Central Flight Academy Runway Complex */}
          <g transform={`translate(${MAP_SIZE / 2}, ${MAP_SIZE / 2})`}>
            {/* Airfield Apron */}
            <polygon points="-50,-15 50,-15 60,15 -60,15" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            {/* Runway */}
            <rect x="-65" y="-9" width="130" height="18" rx="2" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.2" />
            <line x1="-55" y1="0" x2="55" y2="0" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="4 3" />
            <text x="0" y="-12" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle">
              ACADEMY RUNWAY
            </text>
          </g>

          {/* 10. Region Clickable Boundary Highlights */}
          {mapData.regionMarkers.map((region) => {
            const isSelected = region.id === selectedRegionId;
            const isHovered = region.id === hoveredRegionId;

            return (
              <g
                key={region.id}
                className="cursor-pointer transition-all duration-200"
                onClick={() => onSelectRegion(region.id as RegionId)}
                onMouseEnter={() => setHoveredRegionId(region.id as RegionId)}
                onMouseLeave={() => setHoveredRegionId(null)}
              >
                <rect
                  x={region.bounds.x}
                  y={region.bounds.y}
                  width={region.bounds.width}
                  height={region.bounds.height}
                  rx="14"
                  fill={isSelected ? region.color : isHovered ? "rgba(255,255,255,0.12)" : "transparent"}
                  fillOpacity={isSelected ? 0.24 : isHovered ? 0.12 : 0}
                  stroke={isSelected ? region.color : isHovered ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}
                  strokeWidth={isSelected ? 2.5 : 1}
                  strokeDasharray={isSelected ? "none" : "4 4"}
                />

                {/* Region Center Label Pin */}
                <g transform={`translate(${region.x}, ${region.y})`}>
                  <rect
                    x="-42"
                    y="-11"
                    width="84"
                    height="22"
                    rx="11"
                    fill={isSelected ? "#000000" : "rgba(15, 23, 42, 0.88)"}
                    stroke={isSelected ? "#ff5500" : "rgba(255,255,255,0.3)"}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill={isSelected ? "#ff5500" : "#ffffff"}
                    fontSize="9"
                    fontWeight="bold"
                    letterSpacing="0.5"
                  >
                    {region.name.toUpperCase()}
                  </text>
                </g>
              </g>
            );
          })}

          {/* 11. Helipad Launch Stations */}
          {mapData.helipadMarkers.map((helipad) => {
            const isSelected = helipad.id === selectedHelipadId;
            const isParentRegion = helipad.regionId === selectedRegionId;
            const isHovered = helipad.id === hoveredHelipadId;

            return (
              <g
                key={helipad.id}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRegion(helipad.regionId as RegionId);
                  onSelectHelipad(helipad.id);
                }}
                onMouseEnter={() => setHoveredHelipadId(helipad.id)}
                onMouseLeave={() => setHoveredHelipadId(null)}
              >
                {/* Selection Reticle */}
                {isSelected && (
                  <g transform={`translate(${helipad.x}, ${helipad.y})`}>
                    <circle
                      r="20"
                      fill="none"
                      stroke="#ff5500"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className="animate-spin"
                      style={{ animationDuration: "8s" }}
                    />
                    <circle r="14" fill="none" stroke="#ff5500" strokeWidth="1.5" opacity="0.8" />
                    <line x1="-24" y1="0" x2="24" y2="0" stroke="#ff5500" strokeWidth="1.5" />
                    <line x1="0" y1="-24" x2="0" y2="24" stroke="#ff5500" strokeWidth="1.5" />
                  </g>
                )}

                {/* Helipad Base */}
                <circle
                  cx={helipad.x}
                  cy={helipad.y}
                  r={isSelected ? 8.5 : isParentRegion ? 7 : 5.5}
                  fill={isSelected ? "#ff5500" : isParentRegion ? "#ffffff" : "rgba(255, 255, 255, 0.75)"}
                  stroke="#000000"
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />

                {/* 'H' Symbol */}
                <text
                  x={helipad.x}
                  y={helipad.y + 3.2}
                  textAnchor="middle"
                  fill={isSelected ? "#ffffff" : "#000000"}
                  fontSize={isSelected ? "8.5" : "7"}
                  fontWeight="bold"
                >
                  H
                </text>

                {/* Hover Tooltip */}
                {(isHovered || (isSelected && isParentRegion)) && (
                  <g transform={`translate(${helipad.x}, ${helipad.y - 18})`}>
                    <rect
                      x="-65"
                      y="-15"
                      width="130"
                      height="18"
                      rx="4"
                      fill="#000000"
                      stroke="#ff5500"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="-3"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="8.5"
                      fontWeight="bold"
                    >
                      {helipad.name.split(" ")[0]} ({helipad.elevation}m)
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 12. Compass Rose (Top Right) */}
          <g transform={`translate(${MAP_SIZE - 45}, 45)`}>
            <circle r="20" fill="rgba(10, 15, 25, 0.7)" stroke="#ffffff" strokeWidth="1" />
            <polygon points="0,-14 4,0 0,2 -4,0" fill="#ff5500" />
            <polygon points="0,14 4,0 0,-2 -4,0" fill="#ffffff" opacity="0.6" />
            <text x="0" y="-5" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
              N
            </text>
          </g>

          {/* 13. Scale Bar (Bottom Left) */}
          <g transform={`translate(24, ${MAP_SIZE - 28})`}>
            <rect x="0" y="0" width="88" height="14" fill="rgba(0,0,0,0.7)" rx="3" />
            <line x1="8" y1="7" x2="80" y2="7" stroke="#ffffff" strokeWidth="2" />
            <line x1="8" y1="4" x2="8" y2="10" stroke="#ffffff" strokeWidth="2" />
            <line x1="80" y1="4" x2="80" y2="10" stroke="#ffffff" strokeWidth="2" />
            <text x="44" y="-3" textAnchor="middle" fill="#ffffff" fontSize="7.5">
              300 METERS
            </text>
          </g>
        </svg>

        {/* Selected Helipad Status Badge */}
        {selectedHelipad && (
          <div className="absolute bottom-3 right-3 bg-neutral-950/90 backdrop-blur-md border border-neutral-700/80 rounded-xl p-2.5 shadow-xl flex items-center gap-2.5 max-w-[280px]">
            <div className="p-2 rounded-lg bg-orange-950/60 border border-[#ff5500]/60 shrink-0">
              <Crosshair className="h-4 w-4 text-[#ff5500]" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-neutral-400 uppercase tracking-wider block">
                TARGET SPAWN STATION
              </span>
              <strong className="text-xs font-bold text-white truncate block">
                {selectedHelipad.name}
              </strong>
              <span className="text-[10px] text-neutral-300 block">
                ALT: {selectedHelipad.elevation.toFixed(1)}m MSL • {selectedHelipad.surfaceType.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sector Filter Tabs */}
      <div className="p-2.5 bg-neutral-900/95 border-t border-neutral-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-[#ff5500]" /> SECTORS:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {mapData.regionMarkers.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRegion(r.id as RegionId)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide whitespace-nowrap transition-all cursor-pointer ${
                r.id === selectedRegionId
                  ? "bg-[#ff5500] text-black shadow-md"
                  : "bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 border border-neutral-700"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
