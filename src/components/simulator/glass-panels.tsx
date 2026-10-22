"use client";

import React, { useState } from "react";
import { TelemetryState, EnvironmentState } from "@/lib/simulation/types";
import { DroneModel } from "@/types/drone";
import { Battery, ShieldAlert, Wind, CloudSun, Map as MapIcon, Settings2, Plane, Thermometer, Droplets, RotateCcw, Info, CloudRain, AlertTriangle, Activity, Eye } from "lucide-react";
import { MinimapWidget, NavigationWaypoint } from "./minimap-widget";
import { FlightCoachInsight } from "@/lib/simulation/flight-coach-types";

interface LeftGlassPanelProps {
  telemetry: TelemetryState;
  drone: DroneModel;
  motorCount: number;
  motorHealths: number[];
  onSetMotorHealth: (idx: number, health: number) => void;
  payloadMassKg: number;
  onUpdatePayload: (mass: number) => void;
  droneQuantity?: number;
  onUpdateDroneQuantity?: (qty: number) => void;
  sensorHealth: Record<string, boolean>;
  onToggleSensor: (sensor: string) => void;
  onExit: () => void;
}

export function LeftGlassPanel({
  telemetry,
  drone,
  motorCount,
  motorHealths,
  onSetMotorHealth,
  payloadMassKg,
  onUpdatePayload,
  droneQuantity = 1,
  onUpdateDroneQuantity,
  sensorHealth,
  onToggleSensor,
  onExit,
}: LeftGlassPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"status" | "motors">("status"); const avgMotorOutput = telemetry.motorOutputs ? telemetry.motorOutputs.reduce((a,b)=>a+b,0) / Math.max(1, telemetry.motorOutputs.length) : 0;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-20 left-4 z-40 bg-neutral-900/80 backdrop-blur border border-white/5 p-3 rounded-2xl text-white shadow-xl"
      >
        <Settings2 className="w-6 h-6 text-white/80" />
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Premium Glassmorphism Card */}
      <div className={`fixed top-20 bottom-4 left-4 md:w-[380px] w-[calc(100vw-32px)] p-6 flex flex-col gap-6 z-40 text-white font-sans pointer-events-auto transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${
        isOpen ? "translate-x-0" : "-translate-x-[120%] md:translate-x-0"
      }`}>
        
        {/* Header & Exit */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="space-y-1">
            <h2 className="font-bold text-xl uppercase tracking-wider flex items-center gap-2">
              <Plane className="w-6 h-6 text-white/80" />
              {drone.name}
            </h2>
            <p className="text-xs text-white/60 tracking-widest uppercase">{motorCount} MOTORS • {drone.platformCategory}</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden p-2 bg-white/10 rounded-full hover:bg-white/20"><Settings2 className="w-5 h-5 text-white" /></button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-black/30 p-1 rounded-2xl shrink-0">
          <button 
            onClick={() => setActiveTab("status")} 
            className={`flex-1 py-2 text-xs font-bold tracking-widest uppercase rounded-xl transition-all ${activeTab === "status" ? "bg-white/20 text-white shadow-lg" : "text-white/50 hover:text-white/80"}`}
          >
            Status
          </button>
          <button 
            onClick={() => setActiveTab("motors")} 
            className={`flex-1 py-2 text-xs font-bold tracking-widest uppercase rounded-xl transition-all ${activeTab === "motors" ? "bg-white/20 text-white shadow-lg" : "text-white/50 hover:text-white/80"}`}
          >
            Motors
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-black/40 [&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/50 [&::-webkit-scrollbar-thumb]:rounded-full">
          {activeTab === "status" && (
            <div className="space-y-6">
              <div className="bg-[#080808]/90 backdrop-blur-md shadow-xl rounded-2xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Battery className="w-5 h-5 text-white/80" />
                    <span className="text-xs font-bold tracking-widest uppercase text-white/80">Battery Level</span>
                  </div>
                  <span className="text-xl font-bold">{telemetry.batteryLevel.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden shadow-inner">
                  <div className={`h-full transition-all duration-500 rounded-full ${telemetry.batteryLevel > 20 ? 'bg-white' : 'bg-rose-500'}`} style={{ width: `${telemetry.batteryLevel}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#080808]/90 backdrop-blur-md shadow-xl rounded-2xl p-4 border border-white/10">
                  <span className="text-[10px] text-white/50 block uppercase tracking-widest mb-1">Altitude</span>
                  <span className="text-xl font-bold">{telemetry.altitude.toFixed(1)}<span className="text-xs text-white/50 ml-1">m</span></span>
                </div>
                <div className="bg-[#080808]/90 backdrop-blur-md shadow-xl rounded-2xl p-4 border border-white/10">
                  <span className="text-[10px] text-white/50 block uppercase tracking-widest mb-1">Speed</span>
                  <span className="text-xl font-bold">{telemetry.groundSpeed.toFixed(1)}<span className="text-xs text-white/50 ml-1">km/h</span></span>
                </div>
                <div className="bg-[#080808]/90 backdrop-blur-md shadow-xl rounded-2xl p-4 border border-white/10 col-span-2 flex flex-col justify-center">
                  <span className="text-[10px] text-white/50 block uppercase tracking-widest mb-1">Attitude (Pitch / Roll)</span>
                  {sensorHealth['imu'] !== false ? (
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold">{((telemetry.rotation?.pitch || 0) * (180/Math.PI)).toFixed(1)}° <span className="text-xs font-normal text-white/50">P</span></span>
                      <span className="text-lg font-bold">{((telemetry.rotation?.roll || 0) * (180/Math.PI)).toFixed(1)}° <span className="text-xs font-normal text-white/50">R</span></span>
                    </div>
                  ) : (
                    <div className="text-rose-500 font-bold text-sm tracking-widest uppercase animate-pulse">IMU SENSOR OFFLINE</div>
                  )}
                </div>
              </div>

              {/* PAYLOAD CONFIG */}
              <div className="bg-[#080808]/90 backdrop-blur-md shadow-xl rounded-2xl p-5 border border-white/10 space-y-4">
                <h3 className="text-xs font-bold text-white/80 tracking-widest uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4 text-white/80" /> Payload Mass
                </h3>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2 uppercase">
                    <span className="text-white/60">Additional Weight</span>
                    <span className="text-white/80">{payloadMassKg.toFixed(1)} kg</span>
                  </div>
                  <input type="range" min="0" max="25" step="0.5" value={payloadMassKg}
                    onChange={(e) => onUpdatePayload(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-black/50 rounded-lg appearance-none cursor-pointer accent-[#facc15]" />
                </div>
                
                {onUpdateDroneQuantity && (
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2 uppercase mt-4">
                    <span className="text-white/60">Drone Quantity (Swarm)</span>
                    <span className="text-orange-400">{droneQuantity} Units</span>
                  </div>
                  <input type="range" min="1" max="10" step="1" value={droneQuantity}
                    onChange={(e) => onUpdateDroneQuantity(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#FF5500] [&::-webkit-slider-thumb]:rounded-full" />
                </div>
                )}
              </div>

              {/* SENSOR DIAGNOSTICS */}
              <div className="bg-[#080808]/90 backdrop-blur-md shadow-xl rounded-2xl p-5 border border-white/10 space-y-4">
                <h3 className="text-xs font-bold text-white/80 tracking-widest uppercase flex items-center gap-2">
                  <Eye className="w-4 h-4 text-white/80" /> Sensor Diagnostics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(sensorHealth).map(([key, isHealthy]) => (
                    <button
                      key={key}
                      onClick={() => onToggleSensor(key)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isHealthy ? 'bg-[#080808]/90 backdrop-blur-md shadow-xl border-white/10 hover:bg-white/10' : 'bg-neutral-900 border-rose-900/50 hover:bg-neutral-800'}`}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] uppercase tracking-widest text-white/50 mb-1">{key}</span>
                        <span className={`text-[10px] font-bold tracking-widest uppercase ${isHealthy ? 'text-white' : 'text-rose-500'}`}>
                          {isHealthy ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                      <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isHealthy ? 'bg-white/80' : 'bg-white/10 border border-white/10'}`}>
                        <div className={`w-3 h-3 rounded-full transition-transform ${isHealthy ? 'bg-black translate-x-4' : 'bg-[#080808]/90 backdrop-blur-md shadow-xl0 translate-x-0'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "motors" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs font-bold text-white/80 tracking-widest uppercase">Motor Diagnostics</h3>
              </div>

              {/* SVG Diagram — colors driven by live motor outputs */}
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative w-48 h-48 mb-4">
                  <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-2xl">
                    <rect x="50" y="45" width="20" height="30" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="2" />
                    <circle cx="60" cy="60" r="4" fill="#f59e0b" className="animate-pulse" />
                    {Array.from({ length: motorCount }).map((_, i) => {
                      const angle = (i * (360 / motorCount) + (motorCount === 4 ? 45 : 0)) * (Math.PI / 180);
                      const x = 60 + Math.cos(angle) * 45;
                      const y = 60 + Math.sin(angle) * 45;
                      const output = (telemetry.motorOutputs && telemetry.motorOutputs[i] !== undefined)
                        ? telemetry.motorOutputs[i]
                        : 0;
                      
                      let color = '#6b7280'; // Disarmed / Idle (Grey)
                      if (telemetry.isArmed && output > 0.05) {
                        if (output > avgMotorOutput + 0.01) color = '#f59e0b';
                        else if (output < avgMotorOutput - 0.01) color = '#ef4444';
                        else color = '#10b981'; // Normal Hover Range (Green)
                      }
                      return (
                        <g key={i}>
                          <line x1="60" y1="60" x2={x} y2={y} stroke="#374151" strokeWidth="3" />
                          <circle cx={x} cy={y} r={motorCount > 4 ? "8" : "12"} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
                          <circle cx={x} cy={y} r="4" fill={color} />
                          <text x={x} y={y + 1} textAnchor="middle" alignmentBaseline="middle" fill="#fff" fontSize={motorCount > 4 ? "4" : "5"} fontWeight="bold" className="pointer-events-none">M{i+1}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Motor Cards */}
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: motorCount }).map((_, i) => {
                  const liveOutput = (telemetry.motorOutputs && telemetry.motorOutputs[i] !== undefined)
                    ? telemetry.motorOutputs[i]
                    : 0;
                  const outputPct = Math.round(liveOutput * 100);
                  
                  let outputColorClass = 'text-neutral-500';
                  let barColorClass = 'bg-neutral-600';
                  if (telemetry.isArmed && liveOutput > 0.05) {
                    if (liveOutput > avgMotorOutput + 0.01) {
                      outputColorClass = 'text-amber-400';
                      barColorClass = 'bg-amber-500';
                    } else if (liveOutput < avgMotorOutput - 0.01) {
                      outputColorClass = 'text-rose-400';
                      barColorClass = 'bg-rose-500';
                    } else {
                      outputColorClass = 'text-emerald-400';
                      barColorClass = 'bg-emerald-500';
                    }
                  }
                  return (
                    <div key={i} className="bg-[#080808]/90 backdrop-blur-md shadow-xl rounded-2xl p-4 border border-white/10">
                      {/* M label + live output % */}
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-white/80 uppercase">M{i + 1}</span>
                        <span className={outputColorClass}>{outputPct}%</span>
                      </div>
                      {/* Live output progress bar (read-only) */}
                      <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all duration-100 ${barColorClass}`}
                          style={{ width: `${outputPct}%` }}
                        />
                      </div>
                      {/* HEALTH setter slider */}
                      <div className="border-t border-white/10 pt-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">
                          Health {Math.round(motorHealths[i] * 100)}%
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={motorHealths[i]}
                          onChange={(e) => onSetMotorHealth(i, parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-black/50 rounded-lg appearance-none cursor-pointer accent-[#FF5500]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Reset Drone Button */}
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              window.location.href = url.toString();
            }
          }}
          className="w-full shrink-0 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 border border-amber-500 text-base font-black text-white shadow-lg shadow-amber-600/20 transition-all mt-auto"
        >
          <RotateCcw className="w-5 h-5 text-white" />
          <span className="uppercase tracking-widest text-white">Reset Drone</span>
        </button>
      </div>
    </>
  );
}



interface RightGlassPanelProps {
  environment: EnvironmentState;
  onUpdateEnvironment: (updates: Partial<EnvironmentState>) => void;
  telemetry: TelemetryState;
  activeWaypoint: NavigationWaypoint | null;
  onToggleMap: () => void;
  onResetEnvironment: () => void;
  currentInsight: FlightCoachInsight | null;
}

export function RightGlassPanel({
  environment,
  onUpdateEnvironment,
  telemetry,
  activeWaypoint,
  onToggleMap,
  onResetEnvironment,
  currentInsight
}: RightGlassPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-20 right-4 z-40 bg-neutral-900/80 backdrop-blur border border-white/5 p-3 rounded-2xl text-white shadow-xl"
      >
        <CloudSun className="w-6 h-6 text-white/80" />
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Premium Glassmorphism Card */}
      <div className={`fixed top-20 bottom-4 right-4 md:w-[380px] w-[calc(100vw-32px)] p-6 flex flex-col gap-6 z-40 text-white font-sans pointer-events-auto transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${isOpen ? "translate-x-0" : "translate-x-[120%] md:translate-x-0"}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="space-y-1">
            <h2 className="font-bold text-xl uppercase tracking-wider flex items-center gap-2">
              <CloudSun className="w-6 h-6 text-white/80" />
              Environment
            </h2>
            <p className="text-xs text-white/60 tracking-widest uppercase">Atmospheric Digital Twin</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden p-2 bg-white/10 rounded-full hover:bg-white/20"><CloudSun className="w-5 h-5 text-white" /></button>
        </div>

        {/* Location Selector */}
        <div className="bg-black/30 p-3 rounded-2xl shrink-0">
          <h3 className="text-[10px] font-bold text-white/60 tracking-widest uppercase mb-2">Location / Region</h3>
          <select
            className="w-full bg-[#080808]/90 backdrop-blur-md shadow-xl border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none uppercase tracking-widest"
            onChange={(e) => {
              const url = new URL(window.location.href);
              url.searchParams.set("region", e.target.value);
              window.location.href = url.toString();
            }}
            defaultValue={typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("region") || "training" : "training"}
          >
            <option className="bg-neutral-900 text-white" value="training">Training Center</option>
            <option className="bg-neutral-900 text-white" value="city">Urban City</option>
            <option className="bg-neutral-900 text-white" value="mountain">Mountain Range</option>
            <option className="bg-neutral-900 text-white" value="forest">Forest Valley</option>
            <option className="bg-neutral-900 text-white" value="river">River &amp; Lake</option>
            <option className="bg-neutral-900 text-white" value="coast">Coastal Area</option>
            <option className="bg-neutral-900 text-white" value="industrial">Industrial Harbor</option>
          </select>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-black/40 [&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/50 [&::-webkit-scrollbar-thumb]:rounded-full">
            
          {/* WIND */}
          <div className="bg-[#080808]/90 backdrop-blur-md shadow-xl rounded-2xl p-5 border border-white/10 space-y-5">
            <h3 className="text-xs font-bold text-white/80 tracking-widest uppercase flex items-center gap-2">
              <Wind className="w-4 h-4 text-white/80" /> Wind Physics
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2 uppercase">
                  <span className="text-white/60">Speed</span>
                  <span className="text-white/80">{environment.windSpeed.toFixed(1)} m/s</span>
                </div>
                <input type="range" min="0" max="25" step="0.5" value={environment.windSpeed}
                  onChange={(e) => {
                  const speed = parseFloat(e.target.value);
                  const autoTurbulence = Math.min(1.0, speed * 0.04);
                  onUpdateEnvironment({ windSpeed: speed, turbulence: autoTurbulence });
                }}
                  className="w-full h-1.5 bg-black/50 rounded-lg appearance-none cursor-pointer accent-[#FF5500]" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-2 uppercase">
                  <span className="text-white/60">Direction</span>
                  <span className="text-white/80">{environment.windDirection}</span>
                </div>
                <input type="range" min="0" max="359" step="5" value={environment.windDirection}
                  onChange={(e) => onUpdateEnvironment({ windDirection: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-black/50 rounded-lg appearance-none cursor-pointer accent-[#FF5500]" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-2 uppercase mt-4">
                  <span className="text-white/60">Turbulence Intensity</span>
                  <span className="text-white/80">{(environment.turbulence || 0).toFixed(1)}</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={environment.turbulence || 0}
                  onChange={(e) => onUpdateEnvironment({ turbulence: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#FF5500] [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>
            </div>
          </div>

          {/* PRECIPITATION & VISIBILITY */}
          <div className="bg-[#080808]/90 backdrop-blur-md shadow-xl rounded-2xl p-5 border border-white/10 space-y-5">
            <h3 className="text-xs font-bold text-white/80 tracking-widest uppercase flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-orange-400" /> Precipitation &amp; Visibility
            </h3>
            <div className="space-y-4">
              {/* Rain intensity */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2 uppercase">
                  <span className="text-white/60">Rain Intensity</span>
                  <span className="text-orange-400">{Math.round((environment.rainIntensity || 0) * 100)}%</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={environment.rainIntensity || 0}
                  onChange={(e) => onUpdateEnvironment({ rainIntensity: parseFloat(e.target.value) })}
                  className="w-full accent-orange-500"
                />
              </div>
              {/* Fog / visibility */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2 uppercase">
                  <span className="text-white/60 flex items-center gap-1"><Eye className="w-3 h-3" /> Clearness</span>
                  <span className="text-white font-bold">{Math.round((environment.visibility || 0) * 100)}%</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={environment.visibility || 0}
                  onChange={(e) => onUpdateEnvironment({ visibility: parseFloat(e.target.value) })}
                  className="w-full accent-white"
                />
              </div>
            </div>
          </div>

          {/* ATMOSPHERE */}
          <div className="bg-[#080808]/90 backdrop-blur-md shadow-xl rounded-2xl p-5 border border-white/10 space-y-5">
            <h3 className="text-xs font-bold text-white/80 tracking-widest uppercase flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-rose-400" /> Atmosphere
            </h3>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2 uppercase">
                  <span className="text-white/60">Temperature</span>
                  <span className="text-rose-400">{environment.temperature}</span>
                </div>
                <input type="range" min="-15" max="45" step="1" value={environment.temperature}
                  onChange={(e) => onUpdateEnvironment({ temperature: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-black/50 rounded-lg appearance-none cursor-pointer accent-rose-400" />
              </div>
            </div>
          </div>

          {/* WHAT'S HAPPENING */}
          <div className="bg-[#FF5500]/10 rounded-2xl p-5 border border-[#FF5500]/30 space-y-2">
            <h3 className="text-xs font-bold text-white/80 tracking-widest uppercase flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-black" /> Environmental Impact
            </h3>
            <p className="text-sm text-white/90 leading-relaxed font-medium">
              {currentInsight ? currentInsight.explanation.what : "Adjust environment sliders to observe real-time aerodynamic and visual effects on the simulation. High winds will induce lateral drift, while temperature affects air density."}
            </p>
          </div>
        </div>

        {/* Reset Environment */}
        <button onClick={onResetEnvironment} className="w-full mt-auto shrink-0 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/90 hover:bg-white border border-white text-base font-black text-black shadow-lg shadow-white/20 uppercase transition-all">
          <RotateCcw className="w-5 h-5 text-black" />
          <span>Reset Environment</span>
        </button>

      </div>
    </>
  );
}
