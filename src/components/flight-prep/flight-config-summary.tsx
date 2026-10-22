"use client";

import React from "react";
import { DroneModel } from "@/types/drone";
import { RegionDefinition, Helipad } from "@/lib/world/world-types";
import { WeatherPreset } from "@/lib/simulation/types";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  RotateCcw,
  Plane,
  Crosshair,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Package,
  CloudSun,
} from "lucide-react";

interface FlightConfigSummaryProps {
  selectedDrone: DroneModel;
  selectedRegion: RegionDefinition;
  selectedHelipad: Helipad;
  payloadKg: number;
  onChangePayload: (kg: number) => void;
  weatherPreset: WeatherPreset;
  onChangeWeather: (preset: WeatherPreset) => void;
  onStartFlight: () => void;
  onChangeAircraft: () => void;
  onResetToAcademy: () => void;
  isLoading?: boolean;
  className?: string;
}

export function FlightConfigSummary({
  selectedDrone,
  selectedRegion,
  selectedHelipad,
  payloadKg,
  onChangePayload,
  weatherPreset,
  onChangeWeather,
  onStartFlight,
  onChangeAircraft,
  onResetToAcademy,
  isLoading = false,
  className = "",
}: FlightConfigSummaryProps) {
  const spawnY = selectedHelipad.elevation + 0.245;

  const weatherPresets: Array<{ id: WeatherPreset; label: string }> = [
    { id: "normal", label: "Calm" },
    { id: "windy", label: "Windy" },
    { id: "hot", label: "Hot (38°C)" },
    { id: "rain", label: "Rain" },
    { id: "fog", label: "Fog (IFR)" },
    { id: "storm", label: "Gale Storm" },
  ];

  return (
    <div
      className={`bg-white border-2 border-black rounded-2xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)] flex flex-col justify-between font-sans ${className}`}
    >
      <div>
        {/* Title Bar */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-ping" />
            <h3 className="font-heading font-bold text-sm tracking-wider uppercase text-neutral-900">
              FLIGHT MANIFEST & CONFIGURATION
            </h3>
          </div>

          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> VERIFIED
          </span>
        </div>

        {/* Manifest Key-Value Parameters */}
        <div className="mt-4 space-y-2.5">
          {/* Aircraft */}
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white border border-neutral-300">
                <Plane className="h-4 w-4 text-[#FF5500]" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                  AIRCRAFT PLATFORM
                </span>
                <strong className="text-xs sm:text-sm font-heading font-bold text-neutral-900">
                  {selectedDrone.name}
                </strong>
              </div>
            </div>

            <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-50 text-[#FF5500] border border-orange-200">
              {selectedDrone.platformId === "quadcopter" ? 4 : selectedDrone.platformId === "hexacopter" ? 6 : 8} ROTORS • {selectedDrone.badge}
            </span>
          </div>

          {/* Region */}
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white border border-neutral-300">
                <Layers className="h-4 w-4 text-[#FF5500]" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                  DEPLOYMENT REGION
                </span>
                <strong className="text-xs sm:text-sm font-heading font-bold text-neutral-900">
                  {selectedRegion.name}
                </strong>
              </div>
            </div>

            <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-200 text-neutral-800">
              {selectedRegion.category}
            </span>
          </div>

          {/* Launch Site */}
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white border border-neutral-300">
                <Crosshair className="h-4 w-4 text-[#FF5500]" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                  LAUNCH HELIPAD
                </span>
                <strong className="text-xs sm:text-sm font-heading font-bold text-neutral-900">
                  {selectedHelipad.name}
                </strong>
              </div>
            </div>

            <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-200 text-neutral-800">
              {selectedHelipad.surfaceType}
            </span>
          </div>

          {/* Payload Configuration */}
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-[#FF5500]" />
                <span className="text-[10px] font-mono uppercase text-neutral-600 font-bold">
                  PAYLOAD WEIGHT
                </span>
              </div>
              <span className="text-xs font-mono font-black text-neutral-900">
                {payloadKg.toFixed(2)} kg
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2.5"
              step="0.25"
              value={payloadKg}
              onChange={(e) => onChangePayload(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#FF5500]"
            />
            <div className="flex justify-between text-[9px] text-neutral-400 font-mono">
              <span>0.0 kg (Dry)</span>
              <span>1.25 kg</span>
              <span>2.5 kg (Max Load)</span>
            </div>
          </div>

          {/* Meteorological Preset */}
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <div className="flex items-center gap-2">
              <CloudSun className="h-3.5 w-3.5 text-[#FF5500]" />
              <span className="text-[10px] font-mono uppercase text-neutral-600 font-bold">
                WEATHER SIMULATION
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {weatherPresets.map((wp) => {
                const active = weatherPreset === wp.id;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => onChangeWeather(wp.id)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                      active
                        ? "bg-neutral-950 text-white border-black shadow-xs"
                        : "bg-white text-neutral-700 border-neutral-300 hover:border-black"
                    }`}
                  >
                    {wp.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Telemetry Spawn Coordinates */}
          <div className="p-3 rounded-xl bg-neutral-950 text-white border border-black grid grid-cols-3 gap-2 text-center font-mono text-xs">
            <div>
              <span className="text-[10px] text-neutral-400 block uppercase">POS X</span>
              <strong className="text-white font-bold">{selectedHelipad.position.x}m</strong>
            </div>
            <div>
              <span className="text-[10px] text-[#FF5500] block uppercase">ALT Y (MSL)</span>
              <strong className="text-[#FF5500] font-bold">{spawnY.toFixed(2)}m</strong>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 block uppercase">POS Z</span>
              <strong className="text-white font-bold">{selectedHelipad.position.z}m</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 pt-4 border-t border-neutral-200 space-y-2.5">
        <Button
          variant="black"
          size="lg"
          className="w-full h-13 text-sm font-bold tracking-widest uppercase shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-black hover:-translate-y-0.5 transition-all"
          onClick={onStartFlight}
          isLoading={isLoading}
          rightIcon={<ArrowRight className="h-4 w-4 text-[#FF5500]" />}
        >
          START FLIGHT
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs border border-neutral-300 hover:border-black"
            onClick={onChangeAircraft}
            leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
          >
            Hangar
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = `/configure?drone=${selectedDrone.id}`;
              }
            }}
          >
            ⚙ Configure
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-neutral-600 hover:text-black px-2"
            onClick={onResetToAcademy}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
