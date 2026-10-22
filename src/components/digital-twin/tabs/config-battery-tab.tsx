"use client";

import React from "react";
import {
  DroneDigitalTwinConfiguration,
  BatteryChemistry,
} from "@/types/drone-digital-twin";
import { ParameterField } from "../parameter-field";
import {
  calculateMassProperties,
  calculatePerformanceEnvelope,
} from "@/lib/digital-twin/mass-calculator";
import { BatteryCharging, Zap, Gauge, Flame, ShieldCheck } from "lucide-react";

interface ConfigBatteryTabProps {
  config: DroneDigitalTwinConfiguration;
  onChange: (updated: DroneDigitalTwinConfiguration) => void;
}

export function ConfigBatteryTab({ config, onChange }: ConfigBatteryTabProps) {
  const { battery } = config;

  const updateBattery = (field: string, val: any) => {
    let updatedBattery = {
      ...battery,
      [field]: val,
    };

    // Keep nominal voltage and energy Wh strictly in sync with cell count & capacity
    if (field === "cellCount") {
      updatedBattery.nominalVoltageV = Math.round(Number(val) * 3.7 * 10) / 10;
      updatedBattery.energyWh =
        Math.round(((updatedBattery.nominalVoltageV * updatedBattery.capacityMah) / 1000) * 10) /
        10;
    } else if (field === "capacityMah") {
      updatedBattery.energyWh =
        Math.round(((updatedBattery.nominalVoltageV * Number(val)) / 1000) * 10) / 10;
    }

    const draft = {
      ...config,
      battery: updatedBattery,
    };

    const massProps = calculateMassProperties(draft);
    const perf = calculatePerformanceEnvelope(draft, massProps);

    onChange({
      ...draft,
      massProperties: massProps,
      performance: perf,
    });
  };

  const chemistries: Array<{ label: string; value: BatteryChemistry }> = [
    { label: "LiPo — Lithium Polymer (High Discharge / Standard Multirotor)", value: "LiPo (Lithium Polymer)" },
    { label: "Li-Ion — Lithium Ion 21700 (High Energy Density / Long Endurance)", value: "Li-Ion (Lithium Ion)" },
    { label: "Solid State Experimental (Ultra High Density)", value: "Solid State" },
  ];

  // Simulated live telemetry estimation for educational demonstration
  const simulatedHoverCurrentAmps = Math.round((config.massProperties.totalMassKg * 145) / battery.nominalVoltageV * 10) / 10;
  const simulatedHoverWatts = Math.round(battery.nominalVoltageV * simulatedHoverCurrentAmps);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 mb-6">
        <h3 className="text-base font-heading font-bold text-white uppercase">
          ELECTROCHEMICAL ENERGY STORAGE (BATTERY)
        </h3>
        <p className="text-xs text-neutral-400">
          Configure battery chemistry, series cell topology, discharge capability, and energy capacity.
        </p>
      </div>

      {/* DUAL LAYER ARCHITECTURE: CONFIGURATION VS LIVE TELEMETRY COMPARISON */}
      <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-4">
        {/* PANEL A: CONFIGURATION (Static Specifications) */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-white border-b border-white/5 pb-2">
            <Zap className="h-4 w-4 text-[#FF5500]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              AIRCRAFT CONFIGURATION SPECIFICATION
            </span>
          </div>

          <div className="space-y-3">
            <ParameterField
              id="bat-chemistry"
              label="Cell Chemistry"
              type="select"
              value={battery.chemistry}
              options={chemistries}
              onChange={(v) => updateBattery("chemistry", v)}
            />

            <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 gap-3">
              <ParameterField
                id="bat-cells"
                label="Series Cells (S)"
                unit="S"
                tooltipKey="cellCount"
                value={battery.cellCount}
                min={2}
                max={14}
                step={1}
                onChange={(v) => updateBattery("cellCount", v)}
                helperText="4S = 14.8V, 6S = 22.2V."
              />

              <ParameterField
                id="bat-capacity"
                label="Rated Capacity"
                unit="mAh"
                tooltipKey="batteryCapacity"
                value={battery.capacityMah}
                min={1000}
                max={32000}
                step={500}
                onChange={(v) => updateBattery("capacityMah", v)}
                helperText="Stored charge capacity."
              />
            </div>

            <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 gap-3">
              <ParameterField
                id="bat-discharge"
                label="Max Continuous C"
                unit="C"
                tooltipKey="dischargeC"
                value={battery.maxContinuousDischargeC}
                min={10}
                max={100}
                step={5}
                onChange={(v) => updateBattery("maxContinuousDischargeC", v)}
                helperText="Discharge multiplier."
              />

              <ParameterField
                id="bat-mass"
                label="Pack Mass"
                unit="kg"
                value={battery.massKg}
                min={0.2}
                max={10.0}
                step={0.05}
                onChange={(v) => updateBattery("massKg", v)}
                helperText="Physical weight of pack."
              />
            </div>
          </div>
        </div>

        {/* PANEL B: LIVE SIMULATION STATE (Dynamic Telemetry Preview) */}
        <div className="p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-800 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <BatteryCharging className="h-4 w-4" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                LIVE FLIGHT SIMULATION STATE
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/100/20 text-emerald-400 border border-emerald-500/30">
              TELEMETRY BUS
            </span>
          </div>

          <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-neutral-800/80 border border-neutral-700">
              <span className="text-[10px] font-mono uppercase text-neutral-400">State of Charge (SOC)</span>
              <p className="text-xl font-mono font-bold text-emerald-400 mt-0.5">100%</p>
              <span className="text-[10px] text-neutral-400">{battery.capacityMah} mAh remaining</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-800/80 border border-neutral-700">
              <span className="text-[10px] font-mono uppercase text-neutral-400">Terminal Voltage</span>
              <p className="text-xl font-mono font-bold text-neutral-100 mt-0.5">
                {(battery.cellCount * 4.2).toFixed(1)} V
              </p>
              <span className="text-[10px] text-neutral-400">4.20V per cell (Fully Charged)</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-800/80 border border-neutral-700">
              <span className="text-[10px] font-mono uppercase text-neutral-400">Estimated Hover Draw</span>
              <p className="text-xl font-mono font-bold text-amber-400 mt-0.5">
                {simulatedHoverCurrentAmps} A
              </p>
              <span className="text-[10px] text-neutral-400">Power: {simulatedHoverWatts} W</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-800/80 border border-neutral-700">
              <span className="text-[10px] font-mono uppercase text-neutral-400">Pack Temperature</span>
              <p className="text-xl font-mono font-bold text-neutral-200 mt-0.5">26.5 °C</p>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Nominal Thermal Range
              </span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed pt-2 border-t border-neutral-800">
            During flight, Phase 5 physics will dynamically deplete mAh capacity, apply $I^2R$ resistive voltage sag under high throttle, and warn of thermal runaway if discharge limits are exceeded.
          </p>
        </div>
      </div>

      {/* ENERGY CAPACITY SUMMARY */}
      <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-heading font-bold text-orange-950 uppercase">
            Total Usable Stored Energy: {battery.energyWh} Watt-Hours
          </span>
          <p className="text-orange-900 mt-0.5">
            Calculated as: Nominal {battery.nominalVoltageV}V × {battery.capacityMah}mAh ÷ 1000 = {battery.energyWh} Wh.
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="font-mono font-bold text-white">
            Internal Resistance: {battery.internalResistanceMilliOhm} mΩ
          </span>
          <p className="text-[10px] text-neutral-400">Pack Health: {battery.batteryHealthPercent}%</p>
        </div>
      </div>
    </div>
  );
}
