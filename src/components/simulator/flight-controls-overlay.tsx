import React from "react";
import { MinimapWidget } from "./minimap-widget";
import { Lock, NavigationOff, ArrowUp, ArrowDown, Target, Copy, Plus, Minus, Home, AlertTriangle, ShieldAlert } from "lucide-react";

export function FlightControlsOverlay({ telemetry, autoMoveLocked, onToggleMap, onToggleScenarios, sensorHealth, onExit, droneQuantity, onUpdateDroneQuantity, onToggleRtl }: { telemetry?: any, autoMoveLocked?: string, onToggleMap?: () => void, onToggleScenarios?: () => void, onExit?: () => void, sensorHealth?: Record<string, boolean>, droneQuantity?: number, onUpdateDroneQuantity?: (qty: number) => void, onToggleRtl?: () => void }) {
  const isGpsHealthy = sensorHealth ? sensorHealth['gps'] : true;

  const keyBtn = (label: string, isLocked: boolean, size: string = "w-12 h-12", textSize: string = "text-lg") => (
    <div className={`${size} rounded-lg ${isLocked ? 'bg-emerald-500/30 border-emerald-400/80' : 'bg-white/90 border-white/80'} border flex items-center justify-center font-mono ${textSize} font-bold shadow-lg relative transition-colors ${isLocked ? 'text-emerald-300' : 'text-black'}`}>
      {isLocked ? <Lock className="w-5 h-5 text-emerald-400 animate-pulse" /> : label}
    </div>
  );

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex items-end justify-center gap-10 px-6 py-3">
        
        {/* WASD Direction */}
        <div className="flex flex-col items-center gap-1 relative">
          <span className="text-[9px] font-bold text-white/50 tracking-widest uppercase mb-1">Direction</span>
          
          {telemetry && telemetry.maxThrustToWeightRatio < 1.0 && (
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-rose-500/90 text-white px-3 py-1.5 rounded-lg border border-rose-400 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap animate-bounce shadow-[0_0_15px_rgba(244,63,94,0.5)]">
              OVERLOADED
            </div>
          )}

          <div className={`flex flex-col items-center gap-1 ${telemetry && telemetry.maxThrustToWeightRatio < 1.0 ? 'opacity-30' : ''}`}>
            {keyBtn("W", autoMoveLocked === 'FWD')}
            <div className="flex gap-1">
              {keyBtn("A", autoMoveLocked === 'LEFT')}
              {keyBtn("S", autoMoveLocked === 'BWD')}
              {keyBtn("D", autoMoveLocked === 'RIGHT')}
            </div>
          </div>
        </div>

        {/* Throttle Up / Down */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-bold text-white/50 tracking-widest uppercase mb-1">Altitude</span>
          <div className="flex flex-col gap-1 items-center">
            <div className="w-16 h-12 rounded-lg bg-white/90 border border-white/80 flex items-center justify-center text-black font-mono text-[10px] font-bold shadow-lg gap-1">
              <ArrowUp className="w-3 h-3" />SPACE
            </div>
            <div className="w-16 h-12 rounded-lg bg-white/90 border border-white/80 flex items-center justify-center text-black font-mono text-[10px] font-bold shadow-lg gap-1">
              <ArrowDown className="w-3 h-3" />SHIFT
            </div>
          </div>
        </div>

        {/* Swarm Quantity */}
        <div className="flex flex-col items-center gap-1 pointer-events-auto">
          <span className="text-[9px] font-bold text-white/50 tracking-widest uppercase mb-1">Fleet Swarm</span>
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/20 px-2 py-2 rounded-xl h-24 shadow-lg">
            <button 
              type="button"
              onClick={() => onUpdateDroneQuantity && onUpdateDroneQuantity(Math.max(1, (droneQuantity || 1) - 1))}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white cursor-pointer transition-all border border-white/10"
              title="Decrease Drone Swarm Quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="flex flex-col items-center justify-center px-1 min-w-[44px]">
              <Copy className="w-4 h-4 text-[#FF5500] mb-0.5" />
              <span className="font-mono font-black text-xl text-white leading-none">{droneQuantity || 1}</span>
              <span className="text-[8px] font-mono text-white/50 uppercase mt-0.5">DRONES</span>
            </div>
            <button 
              type="button"
              onClick={() => onUpdateDroneQuantity && onUpdateDroneQuantity(Math.min(10, (droneQuantity || 1) + 1))}
              className="w-7 h-7 rounded-lg bg-[#FF5500]/80 hover:bg-[#FF5500] active:scale-95 flex items-center justify-center text-white cursor-pointer transition-all border border-orange-400/40 shadow-xs"
              title="Increase Drone Swarm Quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Radar Map */}
        <div className="flex flex-col items-center gap-1 pointer-events-auto">
          <span className={`text-[9px] font-bold ${isGpsHealthy ? 'text-white/50' : 'text-rose-500'} tracking-widest uppercase mb-1`}>
            {isGpsHealthy ? 'Radar Map' : 'GPS OFFLINE'}
          </span>
          {telemetry && isGpsHealthy ? (
            <MinimapWidget telemetry={telemetry} onClick={onToggleMap || (() => {})} />
          ) : (
            <div 
              className="w-24 h-24 rounded-full bg-black/50 border-2 border-rose-500/30 flex flex-col items-center justify-center cursor-pointer hover:bg-rose-900/20 transition-colors shadow-[inset_0_0_20px_rgba(244,63,94,0.2)]"
              onClick={() => alert("GPS Sensor is currently OFFLINE.")}
            >
              <NavigationOff className="w-6 h-6 text-rose-500/50 mb-1" />
              <span className="text-[8px] font-bold text-rose-500/70 tracking-widest text-center px-2">SIGNAL<br/>LOST</span>
            </div>
          )}
        </div>

      </div>

      <div className="flex gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={onToggleRtl}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl backdrop-blur-md text-xs font-black uppercase tracking-widest transition-all shadow-lg cursor-pointer hover:scale-105 active:scale-95 border ${
            telemetry?.isRtlActive
              ? "bg-amber-500 text-black border-amber-300 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.6)]"
              : "bg-neutral-900/80 hover:bg-neutral-800 text-white border-white/20"
          }`}
          title="Return-To-Home Fail-Safe [R]"
        >
          <Home className="w-4 h-4" /> {telemetry?.isRtlActive ? "RTL ACTIVE" : "RTL (HOME)"}
        </button>
        <button
          type="button"
          onClick={onToggleScenarios}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-500/90 hover:bg-orange-500 text-white backdrop-blur-md border border-orange-400/50 text-xs font-black uppercase tracking-widest transition-all shadow-lg cursor-pointer hover:scale-105 active:scale-95"
        >
          <Target className="w-4 h-4" /> Missions
        </button>
        <button
          type="button"
          onClick={onExit}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white backdrop-blur-md border border-rose-500 text-xs font-black uppercase tracking-widest transition-all shadow-lg cursor-pointer hover:scale-105 active:scale-95"
        >
          End Simulation
        </button>
      </div>

      {telemetry?.isRtlActive && (
        <div className="flex items-center gap-2 bg-amber-500/25 text-amber-300 px-4 py-1.5 rounded-full border border-amber-400/50 text-[10px] font-mono font-bold tracking-widest uppercase animate-pulse shadow-lg backdrop-blur-md">
          <Home className="w-3.5 h-3.5 text-amber-400" />
          <span>RETURN TO HOME [{telemetry.rtlStage || "TRANSIT"}] • DIST: {telemetry.distanceFromHome}M • PRESS [R] TO ABORT</span>
        </div>
      )}

      {telemetry?.isGeoFenceWarning && !telemetry?.isGeoFenceBreached && (
        <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 px-4 py-1.5 rounded-full border border-amber-400/50 text-[10px] font-mono font-bold tracking-widest uppercase animate-pulse shadow-md">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>GEO-FENCE PROXIMITY ADVISORY (&gt;880M FROM ORIGIN)</span>
        </div>
      )}

      {telemetry?.isGeoFenceBreached && (
        <div className="flex items-center gap-2 bg-rose-500/20 text-rose-300 px-4 py-1.5 rounded-full border border-rose-400/60 text-[10px] font-mono font-bold tracking-widest uppercase animate-bounce shadow-md">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>GEO-FENCE AIRSPACE CONTAINMENT ENFORCED (1000M MAX)</span>
        </div>
      )}

      {autoMoveLocked && (
        <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/30 text-[10px] font-bold tracking-widest uppercase animate-pulse mt-1">
          <Lock className="w-3 h-3" />
          Auto-Navigating {autoMoveLocked}
        </div>
      )}
    </div>
  );
}
