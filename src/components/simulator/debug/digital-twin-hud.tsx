"use client";

import React, { useState } from "react";
import {
  DroneDigitalTwinConfiguration,
  DroneDigitalTwinRuntimeState,
} from "@/types/drone-digital-twin";
import {
  Activity,
  Battery,
  Cpu,
  RotateCw,
  Scale,
  Zap,
  X,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface DigitalTwinHUDProps {
  config: DroneDigitalTwinConfiguration;
  runtimeState: DroneDigitalTwinRuntimeState;
  isOpen: boolean;
  onClose: () => void;
}

export function DigitalTwinHUD({
  config,
  runtimeState,
  isOpen,
  onClose,
}: DigitalTwinHUDProps) {
  const [activeTab, setActiveTab] = useState<"motors" | "battery" | "sensors" | "specs">("motors");

  if (!isOpen) return null;

  const { identity, airframe, battery: configBattery, propeller, performance } = config;
  const { motors, battery: liveBattery, sensors, kinematics } = runtimeState;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed bottom-20 left-4 sm:left-6 z-40 w-96 max-w-[calc(100vw-32px)] bg-neutral-950/92 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl text-white font-sans overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/60">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#FF5500]" />
          <div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#FF5500] block leading-none">
              AIRCRAFT DIGITAL TWIN
            </span>
            <span className="text-xs font-heading font-bold text-neutral-100 uppercase mt-0.5">
              {identity.name} ({airframe.motorCount}R)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Sub-nav Tabs */}
      <div className="flex items-center border-b border-neutral-800 bg-neutral-950/80 text-[11px] font-mono">
        <button
          type="button"
          onClick={() => setActiveTab("motors")}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === "motors"
              ? "border-[#FF5500] text-[#FF5500] font-bold"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Motors ({motors.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("battery")}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === "battery"
              ? "border-[#FF5500] text-[#FF5500] font-bold"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Battery
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sensors")}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === "sensors"
              ? "border-[#FF5500] text-[#FF5500] font-bold"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Sensors
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("specs")}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === "specs"
              ? "border-[#FF5500] text-[#FF5500] font-bold"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Specs
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 max-h-80 overflow-y-auto space-y-3 scrollbar-none text-xs">
        {/* MOTORS TAB */}
        {activeTab === "motors" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 border-b border-neutral-800 pb-1">
              <span>MOTOR ID</span>
              <span>LIVE RPM / CONFIGURED MAX</span>
              <span>THRUST</span>
            </div>

            {motors.map((m, idx) => {
              const maxRpm = config.motors[idx]?.maxRpm || 12000;
              const rpmPct = Math.min(100, Math.round((m.currentRpm / maxRpm) * 100));

              return (
                <div
                  key={m.motorId}
                  className="p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {m.motorId}
                    </span>

                    <span className="text-neutral-300">
                      <strong className="text-emerald-400">{m.currentRpm}</strong> / {maxRpm} RPM
                    </span>

                    <span className="text-amber-400 font-bold">{m.thrustNewtons} N</span>
                  </div>

                  {/* RPM Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-[#FF5500] transition-all duration-75"
                      style={{ width: `${rpmPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                    <span>Throttle: {m.throttlePercent}%</span>
                    <span>Current: {m.currentAmps}A</span>
                    <span>Temp: {m.temperatureC}°C</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BATTERY TAB */}
        {activeTab === "battery" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                <span className="text-[10px] font-mono text-neutral-400 uppercase">State of Charge</span>
                <p className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
                  {liveBattery.socPercent}%
                </p>
                <span className="text-[10px] text-neutral-500">
                  {liveBattery.remainingCapacityMah} / {configBattery.capacityMah} mAh
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                <span className="text-[10px] font-mono text-neutral-400 uppercase">Terminal Voltage</span>
                <p className="text-xl font-mono font-bold text-neutral-100 mt-0.5">
                  {liveBattery.voltageV} V
                </p>
                <span className="text-[10px] text-neutral-500">
                  Nominal: {configBattery.nominalVoltageV}V ({configBattery.cellCount}S)
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                <span className="text-[10px] font-mono text-neutral-400 uppercase">Discharge Current</span>
                <p className="text-xl font-mono font-bold text-amber-400 mt-0.5">
                  {liveBattery.currentAmps} A
                </p>
                <span className="text-[10px] text-neutral-500">
                  Power: {liveBattery.powerWatts} W
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                <span className="text-[10px] font-mono text-neutral-400 uppercase">Cell Temp</span>
                <p className="text-xl font-mono font-bold text-neutral-200 mt-0.5">
                  {liveBattery.temperatureC} °C
                </p>
                <span className="text-[10px] text-emerald-400">Health: {liveBattery.healthPercent}%</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-neutral-400">
                <span>Chemistry:</span>
                <span className="font-mono text-neutral-200">{configBattery.chemistry}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span>Total Stored Energy:</span>
                <span className="font-mono text-neutral-200">{configBattery.energyWh} Wh</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span>Max Continuous Discharge:</span>
                <span className="font-mono text-neutral-200">{configBattery.maxContinuousDischargeC}C</span>
              </div>
            </div>
          </div>
        )}

        {/* SENSORS TAB */}
        {activeTab === "sensors" && (
          <div className="space-y-2">
            {sensors.map((s) => (
              <div
                key={s.id}
                className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                      {s.type}
                    </span>
                    <span className="text-xs font-semibold text-neutral-100">{s.id}</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 block">
                    Val: {s.latestValue}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 block">
                    {s.status}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-500">
                    Cycles: {s.updateCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SPECS TAB */}
        {activeTab === "specs" && (
          <div className="space-y-2 font-mono text-xs">
            <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
              <div className="flex justify-between text-neutral-400">
                <span>Airframe Diagonal:</span>
                <span className="text-neutral-100">{airframe.frameDiagonalMm} mm</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Dry Mass:</span>
                <span className="text-neutral-100">{airframe.dryMassKg} kg</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Total AUW:</span>
                <span className="text-[#FF5500] font-bold">{config.massProperties.totalMassKg} kg</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>TWR:</span>
                <span className="text-emerald-400 font-bold">{performance.thrustToWeightRatio}:1</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Propeller:</span>
                <span className="text-neutral-100">
                  {propeller.diameterInches}&quot; × {propeller.pitchInches}&quot;
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Est. Hover Endurance:</span>
                <span className="text-neutral-100">~{performance.estimatedFlightTimeMinutes} min</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Attitude & Speed Bar */}
      <div className="px-4 py-2 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between text-[10px] font-mono text-neutral-400">
        <span>ALT: {kinematics.altitudeAglM.toFixed(1)}m</span>
        <span>SPD: {kinematics.groundSpeedKmh.toFixed(1)} km/h</span>
        <span>HDG: {Math.round(kinematics.headingDeg)}°</span>
        <span className="text-emerald-400 font-bold">{runtimeState.flightMode}</span>
      </div>
    </div>
  );
}
