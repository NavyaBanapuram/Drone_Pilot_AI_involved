// ==========================================================
// DRONE PILOT — SIMULATION DIAGNOSTICS & OBSERVABILITY OVERLAY (PHASE 7)
// Development & Engineering HUD for Physics Timesteps, Clock, Adapter Status & Network
// ==========================================================

import React from "react";
import { ClockSnapshot } from "@/lib/simulation/simulation-clock";
import { SimulationAdapterStatus } from "@/lib/simulation/adapters/simulation-adapter";
import { ConnectionStatus } from "@/lib/multiplayer/multiplayer-types";

interface SimulationDiagnosticsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  clockSnapshot: ClockSnapshot;
  adapterStatus: SimulationAdapterStatus;
  connectionStatus: ConnectionStatus;
  remotePlayerCount: number;
  eventCount: number;
  lastEventTitle?: string;
  fps: number;
}

export const SimulationDiagnosticsOverlay: React.FC<SimulationDiagnosticsOverlayProps> = ({
  isOpen,
  onClose,
  clockSnapshot,
  adapterStatus,
  connectionStatus,
  remotePlayerCount,
  eventCount,
  lastEventTitle,
  fps,
}) => {
  if (!isOpen) return null;

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case "CONNECTED":
        return "text-emerald-400 border-emerald-500/50 bg-emerald-950/30";
      case "LOCAL":
        return "text-cyan-400 border-cyan-500/50 bg-cyan-950/30";
      case "RECONNECTING":
        return "text-amber-400 border-amber-500/50 bg-amber-950/30";
      case "OFFLINE":
      default:
        return "text-rose-400 border-rose-500/50 bg-rose-950/30";
    }
  };

  return (
    <div className="fixed top-16 right-4 z-50 w-96 rounded-xl border border-white/10 bg-slate-950/90 backdrop-blur-md p-4 text-xs font-mono text-slate-300 shadow-2xl pointer-events-auto">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-bold text-slate-100 uppercase tracking-wider text-sm">
            Simulation Diagnostics
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* 1. Simulation Clock & Timesteps */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
            Canonical Simulation Clock
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-black/40 border border-white/5">
            <div>
              <span className="text-slate-400">State:</span>{" "}
              <span className="font-semibold text-cyan-300">{clockSnapshot.state}</span>
            </div>
            <div>
              <span className="text-slate-400">FPS:</span>{" "}
              <span className="font-semibold text-emerald-400">{Math.round(fps)}</span>
            </div>
            <div>
              <span className="text-slate-400">Sim Time:</span>{" "}
              <span className="font-semibold text-white">{clockSnapshot.simTimeSeconds.toFixed(2)}s</span>
            </div>
            <div>
              <span className="text-slate-400">Fixed dt:</span>{" "}
              <span className="font-semibold text-white">{(clockSnapshot.fixedDt * 1000).toFixed(1)}ms</span>
            </div>
            <div>
              <span className="text-slate-400">Physics Ticks:</span>{" "}
              <span className="font-semibold text-slate-200">{clockSnapshot.physicsTickCount}</span>
            </div>
            <div>
              <span className="text-slate-400">Time Scale:</span>{" "}
              <span className="font-semibold text-amber-300">{clockSnapshot.timeScale.toFixed(1)}x</span>
            </div>
          </div>
        </div>

        {/* 2. Simulation Adapter Architecture */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
            Simulation Backend Adapter
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Active Adapter:</span>
              <span className="font-semibold text-cyan-300 uppercase">{adapterStatus.type}</span>
            </div>
            <div className="text-slate-200 text-[11px] truncate">{adapterStatus.name}</div>
            <div className="text-[10px] text-amber-400/90 leading-tight pt-1">
              {adapterStatus.statusMessage}
            </div>
          </div>
        </div>

        {/* 3. Multiplayer & Shared State */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
            Network Airspace State
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Link Status:</span>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getStatusColor(connectionStatus)}`}>
                {connectionStatus}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <div>
                <span className="text-slate-400">Remote Pilots:</span>{" "}
                <span className="font-semibold text-white">{remotePlayerCount}</span>
              </div>
              <div>
                <span className="text-slate-400">Latency:</span>{" "}
                <span className="font-semibold text-white">{adapterStatus.latencyMs.toFixed(0)}ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Event Bus & Safety Engine */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
            Event Bus & Educational Engine
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Total Events Emitted:</span>
              <span className="font-semibold text-purple-300">{eventCount}</span>
            </div>
            {lastEventTitle && (
              <div className="text-[10px] text-slate-300 truncate">
                <span className="text-slate-400">Latest:</span> {lastEventTitle}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
