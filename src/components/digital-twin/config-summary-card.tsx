"use client";

import React from "react";
import {
  DroneDigitalTwinConfiguration,
  DigitalTwinValidationResult,
} from "@/types/drone-digital-twin";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Plane,
  Battery,
  Scale,
  Zap,
  Radio,
  Gauge,
} from "lucide-react";

interface ConfigSummaryCardProps {
  config: DroneDigitalTwinConfiguration;
  validation: DigitalTwinValidationResult;
  onEnterSimulation: () => void;
  onSaveConfig: () => void;
}

export function ConfigSummaryCard({
  config,
  validation,
  onEnterSimulation,
  onSaveConfig,
}: ConfigSummaryCardProps) {
  const { identity, airframe, battery, propeller, massProperties, performance, payload } = config;

  return (
    <div className="bg-white rounded-2xl border border-neutral-300 p-5 shadow-sm sticky top-24 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-neutral-200 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF5500]">
            DIGITAL TWIN MANIFEST
          </span>
          <h3 className="text-lg font-heading font-bold text-neutral-950 uppercase leading-tight">
            {identity.name}
          </h3>
          <span className="text-xs text-neutral-500 font-medium">
            {identity.application} • {airframe.motorCount} Rotors • {identity.modelName}
          </span>
        </div>

        {/* Validation Status Badge */}
        {validation.valid ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-bold tracking-wide">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>VALID</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold tracking-wide animate-pulse">
            <XCircle className="h-4 w-4 text-rose-600" />
            <span>INVALID ({validation.errors.length})</span>
          </div>
        )}
      </div>

      {/* Aeronautical Metric Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col">
          <span className="text-[10px] font-mono uppercase text-neutral-500 flex items-center gap-1">
            <Scale className="h-3 w-3 text-[#FF5500]" /> All-Up Weight
          </span>
          <span className="text-sm font-mono font-bold text-neutral-900 mt-0.5">
            {massProperties.totalMassKg} kg
          </span>
          <span className="text-[10px] text-neutral-400">
            Dry: {massProperties.dryMassKg}kg • Bat: {massProperties.batteryMassKg}kg
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col">
          <span className="text-[10px] font-mono uppercase text-neutral-500 flex items-center gap-1">
            <Zap className="h-3 w-3 text-[#FF5500]" /> Thrust-to-Weight
          </span>
          <span className="text-sm font-mono font-bold text-neutral-900 mt-0.5">
            {performance.thrustToWeightRatio}:1
          </span>
          <span className="text-[10px] text-neutral-400">
            Total Thrust: {performance.totalThrustNewtons} N
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col">
          <span className="text-[10px] font-mono uppercase text-neutral-500 flex items-center gap-1">
            <Battery className="h-3 w-3 text-[#FF5500]" /> Energy Pack
          </span>
          <span className="text-sm font-mono font-bold text-neutral-900 mt-0.5">
            {battery.cellCount}S • {battery.capacityMah} mAh
          </span>
          <span className="text-[10px] text-neutral-400">
            {battery.nominalVoltageV}V • {battery.energyWh} Wh
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col">
          <span className="text-[10px] font-mono uppercase text-neutral-500 flex items-center gap-1">
            <Gauge className="h-3 w-3 text-[#FF5500]" /> Endurance
          </span>
          <span className="text-sm font-mono font-bold text-neutral-900 mt-0.5">
            ~{performance.estimatedFlightTimeMinutes} min
          </span>
          <span className="text-[10px] text-neutral-400">
            Hover throttle: {Math.round(performance.hoverThrottleEstimate * 100)}%
          </span>
        </div>
      </div>

      {/* Configuration Details Summary */}
      <div className="border border-neutral-200 rounded-xl p-3 bg-white space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Airframe:</span>
          <span className="font-mono font-semibold text-neutral-900">
            {airframe.frameDiagonalMm}mm ({airframe.frameMaterial})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Propellers:</span>
          <span className="font-mono font-semibold text-neutral-900">
            {propeller.diameterInches}&quot; × {propeller.pitchInches}&quot; ({propeller.bladeCount}-blade)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Payload:</span>
          <span className="font-mono font-semibold text-neutral-900">
            {payload.enabled ? `${payload.name} (${payload.massKg}kg)` : "None (0.0kg)"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Active Sensors:</span>
          <span className="font-mono font-semibold text-emerald-700">
            {config.sensors.filter((s) => s.enabled).map((s) => s.type).join(", ")}
          </span>
        </div>
      </div>

      {/* Validation Errors & Warnings Container */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
          {validation.errors.map((err) => (
            <div
              key={err.code}
              className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
            >
              <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{err.message}</p>
                {err.educationalFixAdvice && (
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Fix: {err.educationalFixAdvice}
                  </p>
                )}
              </div>
            </div>
          ))}

          {validation.warnings.map((warn) => (
            <div
              key={warn.code}
              className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{warn.message}</p>
                {warn.educationalFixAdvice && (
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Advice: {warn.educationalFixAdvice}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-2 border-t border-neutral-200">
        <button
          type="button"
          disabled={!validation.valid}
          onClick={async () => {
            await onSaveConfig();
            setTimeout(() => onEnterSimulation(), 1000);
          }}
          className={`h-12 w-full rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${
            validation.valid
              ? "bg-[#FF5500] hover:bg-[#e04b00] text-white hover:-translate-y-0.5"
              : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
          }`}
        >
          <span>SAVE CONFIGURATION</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
