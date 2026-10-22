// ==========================================================
// DRONE PILOT - TACTICAL ISLAND RECONNAISSANCE MAP
// Sleek, minimal, ultra-clean radar map UI.
// ==========================================================

"use client";

import React, { useEffect, useMemo } from "react";
import { TelemetryState } from "@/lib/simulation/types";
import { X, Crosshair } from "lucide-react";
import { getTacticalMapData, worldToRadarCoords } from "@/lib/world/map-data";
import { NavigationWaypoint } from "./minimap-widget";

interface IslandMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryState;
  droneName: string;
  activeWaypoint?: NavigationWaypoint | null;
  onSelectWaypoint?: (waypoint: NavigationWaypoint | null) => void;
}

const SVG_CANVAS_SIZE = 1200;

export function IslandMapModal({
  isOpen,
  onClose,
  telemetry,
  droneName,
  activeWaypoint,
  onSelectWaypoint,
}: IslandMapModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const mapData = useMemo(() => getTacticalMapData(SVG_CANVAS_SIZE, 1400), []);

  const worldToSvg = (x: number, z: number) => {
    return worldToRadarCoords(x, z, SVG_CANVAS_SIZE, 1400);
  };

  const droneSvg = worldToSvg(telemetry.position.x, telemetry.position.z);

  const svgToWorld = (svgX: number, svgY: number) => {
    const center = SVG_CANVAS_SIZE / 2;
    const scale = (SVG_CANVAS_SIZE * 0.46) / 1400;
    return { x: (svgX - center) / scale, z: (svgY - center) / scale };
  };

  const flightPathPoints = useMemo(() => {
    if (!telemetry.flightPath || telemetry.flightPath.length === 0) return "";
    return telemetry.flightPath
      .map((wp) => {
        const pt = worldToSvg(wp.x, wp.z);
        return `${pt.x},${pt.y}`;
      })
      .join(" ");
  }, [telemetry.flightPath]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-mono select-none">
      <div
        className="absolute inset-0 cursor-pointer pointer-events-auto"
        onClick={onClose}
        aria-label="Close Map Backdrop"
      />

      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-[#050505] border border-white/10 rounded-2xl shadow-[0_0_80px_rgba(0,180,255,0.1)] flex flex-col overflow-hidden text-white pointer-events-auto">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#080808]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center border border-cyan-500/30">
              <Crosshair className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-xs tracking-[0.2em] text-cyan-400">
                TACTICAL RADAR LINK
              </h2>
              <span className="text-[10px] text-white/40 tracking-wider">
                COORDINATES: X:{telemetry.position.x.toFixed(0)} Z:{telemetry.position.z.toFixed(0)} | ALT: {telemetry.altitude.toFixed(1)}M
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-rose-500/20 hover:text-rose-400 transition-colors text-white/50 text-[10px] font-bold tracking-widest border border-transparent hover:border-rose-500/30"
          >
            <X className="w-4 h-4" /> CLOSE
          </button>
        </header>

        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 bg-[#020202]">
          <svg
            viewBox={`0 0 ${SVG_CANVAS_SIZE} ${SVG_CANVAS_SIZE}`}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const rx = (e.clientX - rect.left) / rect.width;
              const ry = (e.clientY - rect.top) / rect.height;
              const svgX = rx * SVG_CANVAS_SIZE;
              const svgY = ry * SVG_CANVAS_SIZE;
              const w = svgToWorld(svgX, svgY);
              if (onSelectWaypoint) {
                 onSelectWaypoint({
                    id: `custom-wp-${Date.now()}`,
                    name: `TARGET-${Math.abs(Math.round(w.x))}`,
                    x: w.x,
                    z: w.z,
                    elevation: 10
                 });
              }
            }}
            className="w-full h-full max-h-[75vh] object-contain cursor-crosshair rounded-xl border border-white/[0.03]"
          >
            <defs>
              <pattern id="radar-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect width="40" height="40" fill="none" stroke="#00e5ff" strokeWidth="0.5" strokeOpacity="0.1" />
              </pattern>
              <radialGradient id="drone-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect width={SVG_CANVAS_SIZE} height={SVG_CANVAS_SIZE} fill="#050505" />
            <rect width={SVG_CANVAS_SIZE} height={SVG_CANVAS_SIZE} fill="url(#radar-grid)" />

            <path
              d={mapData.coastlinePath}
              fill="#080808"
              stroke="#00e5ff"
              strokeWidth="2"
              strokeOpacity="0.3"
            />

            <path
              d={mapData.waterways.riverPath}
              fill="none"
              stroke="#00e5ff"
              strokeWidth="4"
              strokeOpacity="0.2"
            />

            <g fill="none" strokeOpacity="0.4" strokeLinecap="round" strokeLinejoin="round">
              {mapData.roads.highways.map((h) => (
                <path key={h.id} d={h.path} strokeWidth={h.width} stroke="#ffffff" />
              ))}
              {mapData.roads.connectors.map((c) => (
                <path key={c.id} d={c.path} strokeWidth={c.width * 0.8} stroke="#ffffff" strokeOpacity="0.2" />
              ))}
            </g>

            {flightPathPoints && (
              <polyline
                points={flightPathPoints}
                fill="none"
                stroke="#00e5ff"
                strokeWidth="2"
                strokeOpacity="0.4"
                strokeDasharray="4 4"
              />
            )}

            {activeWaypoint && (
              <g transform={`translate(${worldToSvg(activeWaypoint.x, activeWaypoint.z).x}, ${worldToSvg(activeWaypoint.x, activeWaypoint.z).y})`}>
                <circle cx="0" cy="0" r="15" fill="none" stroke="#f43f5e" strokeWidth="2" className="animate-ping" opacity="0.6" />
                <circle cx="0" cy="0" r="4" fill="#f43f5e" />
                <line x1="-10" y1="0" x2="10" y2="0" stroke="#f43f5e" strokeWidth="1.5" />
                <line x1="0" y1="-10" x2="0" y2="10" stroke="#f43f5e" strokeWidth="1.5" />
                <text x="0" y="24" fill="#f43f5e" fontSize="14" fontWeight="bold" textAnchor="middle" opacity="0.9">
                  {activeWaypoint.name}
                </text>
              </g>
            )}

            <g transform={`translate(${droneSvg.x}, ${droneSvg.y})`}>
              <circle cx="0" cy="0" r="40" fill="url(#drone-glow)" />
              <g transform={`rotate(${telemetry.heading})`}>
                <path d="M 0 -10 L -6 6 L 0 3 L 6 6 Z" fill="#ffffff" />
              </g>
              <text x="0" y="20" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" opacity="0.8">
                {droneName}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
