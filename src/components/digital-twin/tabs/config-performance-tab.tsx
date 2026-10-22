"use client";

import React from "react";
import { DroneDigitalTwinConfiguration } from "@/types/drone-digital-twin";
import { ParameterField } from "../parameter-field";
import { Scale, Zap, Gauge, Compass, Timer } from "lucide-react";

interface ConfigPerformanceTabProps {
  config: DroneDigitalTwinConfiguration;
  onChange: (updated: DroneDigitalTwinConfiguration) => void;
}

export function ConfigPerformanceTab({ config, onChange }: ConfigPerformanceTabProps) {
  const { massProperties, performance } = config;

  const updatePerformance = (field: string, val: any) => {
    onChange({
      ...config,
      performance: {
        ...performance,
        [field]: val,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 mb-6">
        <h3 className="text-base font-heading font-bold text-white uppercase">
          MASS BREAKDOWN & FLIGHT PERFORMANCE ENVELOPE
        </h3>
        <p className="text-xs text-neutral-400">
          Observe mass distribution, estimated moments of inertia, and flight envelope boundaries.
        </p>
      </div>

      {/* SECTION 1: MASS PROPERTIES BREAKDOWN */}
      <div className="space-y-6 mb-12">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Scale className="h-4 w-4 text-[#FF5500]" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            TOTAL ALL-UP WEIGHT BREAKDOWN
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-transparent border border-white/5">
            <span className="text-[10px] font-mono uppercase text-neutral-400">Airframe Dry</span>
            <p className="text-base font-mono font-bold text-white mt-0.5">
              {massProperties.dryMassKg} kg
            </p>
          </div>

          <div className="p-3 rounded-xl bg-transparent border border-white/5">
            <span className="text-[10px] font-mono uppercase text-neutral-400">Battery Pack</span>
            <p className="text-base font-mono font-bold text-white mt-0.5">
              {massProperties.batteryMassKg} kg
            </p>
          </div>

          <div className="p-3 rounded-xl bg-transparent border border-white/5">
            <span className="text-[10px] font-mono uppercase text-neutral-400">Active Payload</span>
            <p className="text-base font-mono font-bold text-white mt-0.5">
              {massProperties.payloadMassKg} kg
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#FF5500]/10 border border-[#FF5500]/20">
            <span className="text-[10px] font-mono uppercase text-[#FF5500] font-bold">Total AUW</span>
            <p className="text-base font-mono font-bold text-[#FF5500] mt-0.5">
              {massProperties.totalMassKg} kg
            </p>
          </div>
        </div>

        {/* Inertia Estimates */}
        <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-neutral-400 font-medium">
            Estimated Moments of Inertia:
          </span>
          <div className="flex items-center gap-3 font-mono text-[11px] text-neutral-300">
            <span>I_xx (Roll): {massProperties.estimatedInertiaKgM2.roll} kg·m²</span>
            <span>I_yy (Pitch): {massProperties.estimatedInertiaKgM2.pitch} kg·m²</span>
            <span>I_zz (Yaw): {massProperties.estimatedInertiaKgM2.yaw} kg·m²</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: PERFORMANCE LIMITS CONFIGURATION */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-[#FF5500]" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF5500]">
            AERODYNAMIC FLIGHT BOUNDARIES
          </span>
        </div>

        <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-8">
          <ParameterField
            id="perf-speed"
            label="Max Horizontal Velocity"
            unit="m/s"
            value={performance.maxHorizontalSpeedMs}
            min={5}
            max={35}
            step={1}
            onChange={(v) => updatePerformance("maxHorizontalSpeedMs", v)}
            helperText="Level cruising speed limit."
          />

          <ParameterField
            id="perf-ascent"
            label="Max Vertical Climb Rate"
            unit="m/s"
            value={performance.maxAscentSpeedMs}
            min={1}
            max={12}
            step={0.5}
            onChange={(v) => updatePerformance("maxAscentSpeedMs", v)}
          />

          <ParameterField
            id="perf-tilt"
            label="Max Bank / Tilt Angle"
            unit="degrees"
            value={performance.maxTiltAngleDeg}
            min={10}
            max={50}
            step={1}
            onChange={(v) => updatePerformance("maxTiltAngleDeg", v)}
            helperText="Assisted attitude hold banking ceiling."
          />
        </div>
      </div>

      {/* SECTION 3: DERIVED PERFORMANCE INDICATORS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-transparent border border-white/10 flex flex-col">
          <span className="text-xs font-mono uppercase text-neutral-400 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-[#FF5500]" /> Thrust-to-Weight Ratio
          </span>
          <span className="text-2xl font-mono font-bold text-white mt-1">
            {performance.thrustToWeightRatio}:1
          </span>
          <span className="text-[11px] text-neutral-400 mt-1">
            Total Collective Lift: {performance.totalThrustNewtons} N
          </span>
        </div>

        <div className="p-4 rounded-xl bg-transparent border border-white/10 flex flex-col">
          <span className="text-xs font-mono uppercase text-neutral-400 flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-[#FF5500]" /> Hover Throttle Point
          </span>
          <span className="text-2xl font-mono font-bold text-white mt-1">
            {Math.round(performance.hoverThrottleEstimate * 100)}%
          </span>
          <span className="text-[11px] text-neutral-400 mt-1">
            Calculated equilibrium thrust output
          </span>
        </div>

        <div className="p-4 rounded-xl bg-transparent border border-white/10 flex flex-col">
          <span className="text-xs font-mono uppercase text-neutral-400 flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-[#FF5500]" /> Hover Endurance
          </span>
          <span className="text-2xl font-mono font-bold text-white mt-1">
            ~{performance.estimatedFlightTimeMinutes} min
          </span>
          <span className="text-[11px] text-neutral-400 mt-1">
            Calculated at 80% battery depth-of-discharge
          </span>
        </div>
      </div>
    </div>
  );
}
