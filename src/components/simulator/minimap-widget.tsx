// ==========================================================
// DRONE PILOT — REAL-TIME TACTICAL RADAR MINIMAP (AAA GAME SPEC)
// Centered on the drone with dynamic terrain scrolling, 180m radar range,
// heading radar cone, helipad beacons, and waypoint edge tracking.
// ==========================================================

"use client";

import React, { useMemo } from "react";
import { TelemetryState } from "@/lib/simulation/types";
import { generateCoastlinePolygon } from "@/lib/world/coastline-math";
import { HELIPAD_LIST } from "@/lib/world/helipad-definitions";
import { Navigation, Target, MapPin } from "lucide-react";

export interface NavigationWaypoint {
  id: string;
  name: string;
  x: number;
  z: number;
  elevation?: number;
}

interface MinimapWidgetProps {
  telemetry: TelemetryState;
  onClick: () => void;
  activeWaypoint?: NavigationWaypoint | null;
}

const RADAR_RANGE_METERS = 180; // 180m radar radius
const CANV_SIZE = 200;
const CENTER = 100;
const SCALE = CENTER / RADAR_RANGE_METERS; // ~0.555 px/m

export function MinimapWidget({ telemetry, onClick, activeWaypoint }: MinimapWidgetProps) {
  const droneX = telemetry.position.x;
  const droneZ = telemetry.position.z;
  const heading = telemetry.heading;

  // Pre-generate true physical coastline polygon in meters
  const baseCoastline = useMemo(() => generateCoastlinePolygon(96), []);

  // Project physical coastline relative to the drone's center
  const localCoastlinePath = useMemo(() => {
    if (baseCoastline.length === 0) return "";
    let d = "";
    baseCoastline.forEach((pt, i) => {
      const rx = CENTER + (pt.x - droneX) * SCALE;
      const ry = CENTER + (pt.z - droneZ) * SCALE;
      d += i === 0 ? `M ${rx.toFixed(1)} ${ry.toFixed(1)}` : ` L ${rx.toFixed(1)} ${ry.toFixed(1)}`;
    });
    return d + " Z";
  }, [baseCoastline, droneX, droneZ]);

  // Determine active or nearest waypoint target ("Where we want to go")
  const targetWaypoint = useMemo<NavigationWaypoint>(() => {
    if (activeWaypoint) return activeWaypoint;
    // Fallback: track nearest helipad
    let nearest = HELIPAD_LIST[0];
    let minDist = Infinity;
    HELIPAD_LIST.forEach((h) => {
      const d = Math.hypot(h.position.x - droneX, h.position.z - droneZ);
      if (d < minDist) {
        minDist = d;
        nearest = h;
      }
    });
    return {
      id: nearest.id,
      name: nearest.name.split(" ")[0] || "PAD",
      x: nearest.position.x,
      z: nearest.position.z,
    };
  }, [activeWaypoint, droneX, droneZ]);

  // Target relative math
  const targetRel = useMemo(() => {
    const dx = targetWaypoint.x - droneX;
    const dz = targetWaypoint.z - droneZ;
    const dist = Math.hypot(dx, dz);
    const angleRad = Math.atan2(dz, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Projected position on radar
    const rx = CENTER + dx * SCALE;
    const ry = CENTER + dz * SCALE;

    const isInside = dist <= RADAR_RANGE_METERS - 15;

    // Clamped edge position if outside radar radius
    const edgeRadius = CENTER - 14;
    const edgeX = CENTER + Math.cos(angleRad) * edgeRadius;
    const edgeY = CENTER + Math.sin(angleRad) * edgeRadius;

    return { dx, dz, dist, rx, ry, isInside, edgeX, edgeY, angleDeg };
  }, [targetWaypoint, droneX, droneZ]);

  // Nearby Helipads within 280m
  const nearbyHelipads = useMemo(() => {
    return HELIPAD_LIST.map((h) => {
      const dx = h.position.x - droneX;
      const dz = h.position.z - droneZ;
      const dist = Math.hypot(dx, dz);
      return {
        id: h.id,
        name: h.name,
        rx: CENTER + dx * SCALE,
        ry: CENTER + dz * SCALE,
        dist,
        elevation: h.elevation,
      };
    }).filter((h) => h.dist < RADAR_RANGE_METERS + 80);
  }, [droneX, droneZ]);

  // Current Sector Tag
  const sectorName = useMemo(() => {
    if (Math.hypot(droneX, droneZ) < 220) return "ACADEMY";
    if (droneX < -250 && droneZ < -250) return "MT APEX";
    if (droneX < -250 && droneZ >= -250 && droneZ <= 280) return "FOREST";
    if (droneX < -250 && droneZ > 280) return "PELICAN COVE";
    if (droneX > 350 && droneZ > 520) return "HARBOR DOCKS";
    if (droneX > 350 && droneZ <= 520) return "METROPOLIS";
    if (droneX >= -250 && droneX <= 80 && droneZ > 80) return "RIVER CANYON";
    return "ARCHIPELAGO";
  }, [droneX, droneZ]);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="Open Full Tactical Island Map"
      className="group relative cursor-pointer pointer-events-auto select-none transition-all duration-200 hover:scale-105 active:scale-95"
      title="Tactical Radar GPS — Click to open Full Island Map (M)"
    >
      {/* Outer Tactical Bezel Frame */}
      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/95 border-2 border-neutral-300 shadow-lg relative overflow-hidden flex items-center justify-center backdrop-blur-md">
        
        {/* Dynamic SVG Radar Canvas */}
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <clipPath id="radar-clip">
              <circle cx="100" cy="100" r="98" />
            </clipPath>

            {/* Tactical Radar Grid Gradient */}
            <radialGradient id="radar-dark-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#020617" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#000000" stopOpacity="1" />
            </radialGradient>

            {/* Vision Cone Gradient */}
            <radialGradient id="fov-cone" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.40" />
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Group clipped to circular radar bezel */}
          <g clipPath="url(#radar-clip)">
            {/* 1. Base Ocean Background (Deep Maritime Blue) */}
            <rect width="200" height="200" fill="#030712" />

            {/* 2. Shallow Turquoise Coral Shelf */}
            <path
              d={localCoastlinePath}
              fill="none"
              stroke="#0d4a6e"
              strokeWidth="14"
              strokeLinejoin="round"
              opacity="0.85"
            />

            {/* 3. Scrolling Island Coastline (Natural Golden Sand Beach) */}
            <path
              d={localCoastlinePath}
              fill="#0a0a0a"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* 4. Scrolling Island Turf Landmass (Solid Natural Green) */}
            <path
              d={localCoastlinePath}
              fill="#0a0a0a"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* 5. Local Academy Runway Strip (Centered at x: 25, z: -50 in World) */}
            <g transform={`translate(${CENTER + (25 - droneX) * SCALE}, ${CENTER + (-50 - droneZ) * SCALE})`}>
              {/* Asphalt Runway: 260m long x 32m wide */}
              <rect
                x={-16 * SCALE}
                y={-130 * SCALE}
                width={32 * SCALE}
                height={260 * SCALE}
                rx={2}
                fill="#0f172a"
                stroke="#94a3b8"
                strokeWidth="1"
              />
              {/* Threshold Marks */}
              <line
                x1={-12 * SCALE}
                y1={-125 * SCALE}
                x2={12 * SCALE}
                y2={-125 * SCALE}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <line
                x1={-12 * SCALE}
                y1={125 * SCALE}
                x2={12 * SCALE}
                y2={125 * SCALE}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              {/* White Centerline */}
              <line
                x1={0}
                y1={-120 * SCALE}
                x2={0}
                y2={120 * SCALE}
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.9"
              />
            </g>

            {/* 5. Concentric Tactical Range Rings (50m, 100m, 150m) */}
            <circle cx="100" cy="100" r={50 * SCALE} fill="none" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.40" />
            <circle cx="100" cy="100" r={100 * SCALE} fill="none" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.35" />
            <circle cx="100" cy="100" r={150 * SCALE} fill="none" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.30" />

            {/* Crosshair Axes */}
            <line x1="100" y1="4" x2="100" y2="196" stroke="#ffffff" strokeWidth="0.6" opacity="0.25" />
            <line x1="4" y1="100" x2="196" y2="100" stroke="#ffffff" strokeWidth="0.6" opacity="0.25" />

            {/* 6. Nearby Helipads Beacons */}
            {nearbyHelipads.map((pad) => (
              <g key={pad.id} transform={`translate(${pad.rx}, ${pad.ry})`}>
                <circle cx="0" cy="0" r="5.5" fill="#0f172a" stroke="#22c55e" strokeWidth="1.5" />
                <text x="0" y="2.5" fill="#22c55e" fontSize="5.5" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                  H
                </text>
              </g>
            ))}

            {/* 7. Active Navigation Waypoint Line & Beacon ("Where we want to go") */}
            {targetRel.isInside ? (
              <g transform={`translate(${targetRel.rx}, ${targetRel.ry})`}>
                {/* Dashed flight line from drone to waypoint */}
                <line
                  x1={-(targetRel.rx - CENTER)}
                  y1={-(targetRel.ry - CENTER)}
                  x2="0"
                  y2="0"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                  opacity="0.75"
                />
                <circle cx="0" cy="0" r="8" fill="none" stroke="#ffffff" strokeWidth="1.5" className="animate-ping" opacity="0.7" />
                <circle cx="0" cy="0" r="5" fill="#ffffff" stroke="#ffffff" strokeWidth="1.2" />
              </g>
            ) : (
              // Navigation Edge Arrow pointing toward off-screen waypoint
              <g transform={`translate(${targetRel.edgeX}, ${targetRel.edgeY}) rotate(${targetRel.angleDeg})`}>
                <polygon points="6,0 -4,-5 -1,0 -4,5" fill="#ffffff" stroke="#ffffff" strokeWidth="0.8" />
              </g>
            )}

            {/* 8. Drone Forward Radar Vision Cone */}
            <g transform={`translate(100, 100) rotate(${heading})`}>
              <path
                d="M 0 0 L -25 -70 A 70 70 0 0 1 25 -70 Z"
                fill="url(#fov-cone)"
              />
              <line x1="0" y1="0" x2="0" y2="-70" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.85" />
            </g>

            {/* 9. Center Aircraft Marker */}
            <g transform="translate(100, 100)">
              {/* Drone Center Pulse */}
              <circle cx="0" cy="0" r="8" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
              <circle cx="0" cy="0" r="3.5" fill="#000000" stroke="#ffffff" strokeWidth="1.2" />
              {/* Rotating Heading Chevron */}
              <g transform={`rotate(${heading})`}>
                <polygon points="0,-8 -4,-2 0,-4 4,-2" fill="#ffffff" stroke="#000000" strokeWidth="0.8" />
              </g>
            </g>
          </g>

          {/* 10. Outer Cardinal Compass Indicators */}
          <g>
            {/* North Indicator */}
            <polygon points="100,4 103,10 97,10" fill="#ffffff" />
            <text x="100" y="18" fill="#ffffff" fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="monospace">
              N
            </text>
            <text x="190" y="102" fill="#94a3b8" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              E
            </text>
            <text x="100" y="194" fill="#94a3b8" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              S
            </text>
            <text x="10" y="102" fill="#94a3b8" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              W
            </text>
          </g>
        </svg>

        {/* Top Radar Sector Header Pill */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white/95 border border-neutral-200 text-[8px] font-mono font-bold text-neutral-800 tracking-wider flex items-center gap-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{sectorName}</span>
        </div>

        {/* Bottom Distance to Target Pill ("Where we want to go") */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white/95 border border-[#ffffff]/60 text-[8px] font-mono font-bold text-neutral-800 tracking-tight flex items-center gap-1 shadow-sm whitespace-nowrap">
          <Target className="h-2.5 w-2.5 text-[#ffffff]" />
          <span>{targetWaypoint.name}: {targetRel.dist.toFixed(0)}m</span>
        </div>

        {/* Hover Expand Prompt */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/90 text-white border border-[#ffffff] text-[9px] font-bold px-2 py-1 rounded shadow-lg font-mono tracking-wider">
            EXPAND (M)
          </span>
        </div>
      </div>
    </div>
  );
}
