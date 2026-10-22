"use client";

import React, { useState } from "react";
import { EnvironmentState, WeatherPreset, TelemetryState } from "@/lib/simulation/types";
import { Wind, Thermometer, X, CloudRain, Eye, RotateCcw, ChevronDown, ChevronUp, Activity } from "lucide-react";

interface EnvironmentControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  environment: EnvironmentState;
  onUpdateEnvironment: (updates: Partial<EnvironmentState>) => void;
  onApplyPreset: (preset: WeatherPreset) => void;
  telemetry?: TelemetryState;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section className="border-b border-white/10 py-3">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full justify-between text-[10px] font-bold tracking-[.14em] text-white/50">
        {title}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && <div className="mt-2">{children}</div>}
    </section>
  );
}

export function EnvironmentControlPanel({
  isOpen,
  onClose,
  environment,
  onUpdateEnvironment,
  onApplyPreset,
  telemetry,
}: EnvironmentControlPanelProps) {
  if (!isOpen) return null;

  const presets: Array<{ id: WeatherPreset; label: string }> = [
    { id: "normal", label: "Calm / Standard" },
    { id: "windy", label: "High Crosswinds" },
    { id: "hot", label: "Extreme Heat" },
    { id: "rain", label: "Driving Rain" },
    { id: "fog", label: "Dense Fog" },
    { id: "storm", label: "Storm Training" },
  ];

  const handleReset = () => {
    onApplyPreset("normal");
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={onClose} />
      <aside className={`fixed inset-y-0 right-0 z-50 w-80 max-w-[86vw] bg-neutral-950/95 p-4 text-white font-mono overflow-y-auto shadow-2xl transition-transform ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <p className="text-[10px] tracking-[.2em] text-white/45">ENVIRONMENT</p>
            <h2 className="font-bold text-sm">ATMOSPHERIC DIGITAL TWIN</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <Section title="ATMOSPHERE">
          <div className="grid grid-cols-2 gap-2">
            {presets.map((p) => {
              const active = environment.preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onApplyPreset(p.id)}
                  className={`py-1.5 px-2 text-[9px] text-left rounded font-bold uppercase transition-colors ${
                    active ? "bg-[#FF5500] text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="WIND">
          <div className="mb-3 rounded-lg bg-black/20 p-2">
            <div className="flex justify-between text-[10px] mb-1 text-white/70">
              <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-[#FF5500]"/> SPEED</span>
              <span className="text-white">{environment.windSpeed.toFixed(1)} m/s ({(environment.windSpeed * 3.6).toFixed(0)} km/h)</span>
            </div>
            <input
              type="range" min="0" max="22" step="0.5"
              value={environment.windSpeed}
              onChange={(e) => onUpdateEnvironment({ windSpeed: parseFloat(e.target.value) })}
              className="w-full accent-[#FF5500]"
            />
          </div>

          <div className="mb-3 rounded-lg bg-black/20 p-2">
            <div className="flex justify-between text-[10px] mb-1 text-white/70">
              <span className="flex items-center gap-1">DIRECTION</span>
              <span className="text-white">{environment.windDirection}°</span>
            </div>
            <input
              type="range" min="0" max="359" step="5"
              value={environment.windDirection}
              onChange={(e) => onUpdateEnvironment({ windDirection: parseInt(e.target.value) })}
              className="w-full accent-[#FF5500]"
            />
          </div>
          
          <div className="rounded-lg bg-black/20 p-2">
            <div className="flex justify-between text-[10px] mb-1 text-white/70">
              <span className="flex items-center gap-1">TURBULENCE</span>
              <span className="text-white">{Math.round((environment.turbulence || 0) * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05"
              value={environment.turbulence || 0}
              onChange={(e) => onUpdateEnvironment({ turbulence: parseFloat(e.target.value) })}
              className="w-full accent-[#FF5500]"
            />
          </div>
        </Section>

        <Section title="TEMPERATURE">
          <div className="rounded-lg bg-black/20 p-2">
            <div className="flex justify-between text-[10px] mb-1 text-white/70">
              <span className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-rose-400"/> AMBIENT</span>
              <span className="text-rose-400">{environment.temperature.toFixed(0)}°C</span>
            </div>
            <input
              type="range" min="-10" max="45" step="1"
              value={environment.temperature}
              onChange={(e) => onUpdateEnvironment({ temperature: parseInt(e.target.value) })}
              className="w-full accent-rose-400"
            />
          </div>
        </Section>

        <Section title="PRECIPITATION">
          <div className="rounded-lg bg-black/20 p-2">
            <div className="flex justify-between text-[10px] mb-1 text-white/70">
              <span className="flex items-center gap-1">RAIN INTENSITY</span>
              <span className="text-[#FF5500] font-bold">{Math.round((environment.rainIntensity || 0) * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05"
              value={environment.rainIntensity || 0}
              onChange={(e) => onUpdateEnvironment({ rainIntensity: parseFloat(e.target.value) })}
              className="w-full accent-[#FF5500]"
            />
          </div>
        </Section>

        <Section title="VISIBILITY">
          <div className="rounded-lg bg-black/20 p-2">
            <div className="flex justify-between text-[10px] mb-1 text-white/70">
              <span className="flex items-center gap-1">CLEARNESS</span>
              <span className="text-white font-bold">{Math.round((environment.visibility || 0) * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05"
              value={environment.visibility || 0}
              onChange={(e) => onUpdateEnvironment({ visibility: parseFloat(e.target.value) })}
              className="w-full accent-white"
            />
          </div>
        </Section>

        <Section title="TELEMETRY">
          <div className="rounded-lg bg-black/20 p-2 text-[10px] text-white/70 space-y-1">
            <div className="flex justify-between">
              <span>AIR RELATIVE VELOCITY</span>
              <span className="text-white font-bold">{telemetry ? Math.round(Math.hypot(telemetry.velocity.x - (telemetry.windVector?.speedMs || 0) * Math.sin((telemetry.windVector?.directionDeg || 0) * Math.PI / 180), telemetry.velocity.z - (telemetry.windVector?.speedMs || 0) * Math.cos((telemetry.windVector?.directionDeg || 0) * Math.PI / 180)) * 3.6) : 0} km/h</span>
            </div>
            <div className="flex justify-between">
              <span>GROUND VELOCITY</span>
              <span className="text-white font-bold">{telemetry?.groundSpeed.toFixed(0) || 0} km/h</span>
            </div>
            <div className="flex justify-between">
              <span>POWER DEMAND</span>
              <span className="text-white font-bold">{telemetry?.batteryPowerWatts?.toFixed(0) || 0} W</span>
            </div>
            <div className="flex justify-between">
              <span>PITCH CORRECTION</span>
              <span className="text-white font-bold">{telemetry ? (telemetry.rotation.pitch * 180 / Math.PI).toFixed(1) : 0}°</span>
            </div>
            <div className="flex justify-between">
              <span>ROLL CORRECTION</span>
              <span className="text-white font-bold">{telemetry ? (telemetry.rotation.roll * 180 / Math.PI).toFixed(1) : 0}°</span>
            </div>
          </div>
        </Section>

        <button onClick={handleReset} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 py-2 text-[10px] font-bold hover:bg-white/5 text-white/80">
          <RotateCcw className="h-3 w-3"/>RESET ENVIRONMENT
        </button>

      </aside>
    </>
  );
}
