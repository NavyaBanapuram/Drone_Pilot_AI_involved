"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Zap,
  Gauge,
  Compass,
  Radio,
  Sliders,
  RotateCcw,
  X,
  ShieldAlert,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface FaultInjectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  motorCount: number;
  motorHealths: number[];
  onSetMotorHealth: (index: number, health: number) => void;
  sensorHealth: {
    gps: boolean;
    imu: boolean;
    baro: boolean;
    compass: boolean;
  };
  onToggleSensor: (sensor: "gps" | "imu" | "baro" | "compass") => void;
  payloadMassKg: number;
  maxPayloadKg: number;
  onSetPayloadMass: (kg: number) => void;
  onResetAllFaults: () => void;
}

export function FaultInjectionPanel({
  isOpen,
  onClose,
  motorCount,
  motorHealths,
  onSetMotorHealth,
  sensorHealth,
  onToggleSensor,
  payloadMassKg,
  maxPayloadKg,
  onSetPayloadMass,
  onResetAllFaults,
}: FaultInjectionPanelProps) {
  const [activeTab, setActiveTab] = useState<"motors" | "avionics" | "payload">("motors");

  if (!isOpen) return null;

  return (
    <div className="fixed top-14 right-4 z-40 w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-4rem)] flex flex-col bg-neutral-950/95 text-white border border-neutral-800 rounded-2xl shadow-2xl backdrop-blur-xl font-mono text-xs select-none animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-neutral-800 shrink-0 bg-neutral-900/60 rounded-t-2xl">
        <div className="flex items-center gap-2 text-rose-400">
          <ShieldAlert className="h-4 w-4" />
          <span className="font-bold tracking-wider text-[11px] uppercase">
            FAULT INJECTION & BENCHMARK
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetAllFaults}
            title="Reset all systems to 100% nominal"
            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 shrink-0 bg-neutral-900/40 text-[11px]">
        <button
          type="button"
          onClick={() => setActiveTab("motors")}
          className={`flex-1 py-2 font-bold tracking-wider transition-colors border-b-2 ${
            activeTab === "motors"
              ? "border-rose-500 text-rose-400 bg-rose-500/10"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          MOTORS ({motorCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("avionics")}
          className={`flex-1 py-2 font-bold tracking-wider transition-colors border-b-2 ${
            activeTab === "avionics"
              ? "border-rose-500 text-rose-400 bg-rose-500/10"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          SENSORS
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("payload")}
          className={`flex-1 py-2 font-bold tracking-wider transition-colors border-b-2 ${
            activeTab === "payload"
              ? "border-rose-500 text-rose-400 bg-rose-500/10"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          PAYLOAD
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
        {/* TAB 1: INDIVIDUAL MOTORS */}
        {activeTab === "motors" && (
          <div className="space-y-3">
            <div className="text-[10px] text-neutral-400 bg-neutral-900 p-2 rounded-lg border border-neutral-800/80 leading-relaxed">
              Degrading an individual motor produces <span className="text-amber-300 font-bold">asymmetric thrust</span>. The flight controller will increase RPM on opposite motors to counteract frame tilt, driving up electrical consumption.
            </div>

            <div className="space-y-3">
              {Array.from({ length: motorCount }).map((_, idx) => {
                const health = motorHealths[idx] !== undefined ? motorHealths[idx] : 1.0;
                const percent = Math.round(health * 100);
                const isFailed = percent <= 10;
                const isDegraded = percent < 80;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isFailed
                        ? "bg-rose-950/40 border-rose-600/70"
                        : isDegraded
                        ? "bg-amber-950/30 border-amber-600/50"
                        : "bg-neutral-900/60 border-neutral-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white tracking-wider">MOTOR {idx + 1}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            isFailed
                              ? "bg-rose-500/20 text-rose-400"
                              : isDegraded
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {isFailed ? "FAILED" : isDegraded ? "DEGRADED" : "NOMINAL"}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-white text-xs">{percent}%</span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={percent}
                      onChange={(e) => onSetMotorHealth(idx, Number(e.target.value) / 100)}
                      className="w-full accent-rose-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />

                    <div className="flex justify-between items-center mt-1.5 text-[9px] text-neutral-500">
                      <button
                        type="button"
                        onClick={() => onSetMotorHealth(idx, 0)}
                        className="hover:text-rose-400 transition-colors"
                      >
                        CUT (0%)
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetMotorHealth(idx, 0.5)}
                        className="hover:text-amber-400 transition-colors"
                      >
                        HALF (50%)
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetMotorHealth(idx, 1.0)}
                        className="hover:text-emerald-400 transition-colors"
                      >
                        RESET (100%)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: AVIONICS & SENSORS */}
        {activeTab === "avionics" && (
          <div className="space-y-3">
            <div className="text-[10px] text-neutral-400 bg-neutral-900 p-2 rounded-lg border border-neutral-800/80 leading-relaxed">
              Disabling sensors degrades autonomous flight-controller modes into manual backup states.
            </div>

            {/* GPS Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center gap-2.5">
                <Radio className={`h-4 w-4 ${sensorHealth.gps ? "text-emerald-400" : "text-neutral-500"}`} />
                <div>
                  <div className="font-bold text-white">GPS NAVIGATION</div>
                  <div className="text-[10px] text-neutral-400">
                    {sensorHealth.gps ? "Position Hold Auto-Braking" : "ATTI Mode (Drifts with wind)"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleSensor("gps")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                  sensorHealth.gps
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {sensorHealth.gps ? "ONLINE" : "OFFLINE"}
              </button>
            </div>

            {/* IMU Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center gap-2.5">
                <Gauge className={`h-4 w-4 ${sensorHealth.imu ? "text-emerald-400" : "text-neutral-500"}`} />
                <div>
                  <div className="font-bold text-white">IMU / GYROSCOPE</div>
                  <div className="text-[10px] text-neutral-400">
                    {sensorHealth.imu ? "Precise Attitude Control" : "Simulated Gyro Noise & Wobble"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleSensor("imu")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                  sensorHealth.imu
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {sensorHealth.imu ? "ONLINE" : "DEGRADED"}
              </button>
            </div>

            {/* Barometer Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center gap-2.5">
                <Layers className={`h-4 w-4 ${sensorHealth.baro ? "text-emerald-400" : "text-neutral-500"}`} />
                <div>
                  <div className="font-bold text-white">BAROMETRIC ALTIMETER</div>
                  <div className="text-[10px] text-neutral-400">
                    {sensorHealth.baro ? "Altitude Lock Reference" : "Altitude Hunting & Vertical Drift"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleSensor("baro")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                  sensorHealth.baro
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {sensorHealth.baro ? "ONLINE" : "OFFLINE"}
              </button>
            </div>

            {/* Compass Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center gap-2.5">
                <Compass className={`h-4 w-4 ${sensorHealth.compass ? "text-emerald-400" : "text-neutral-500"}`} />
                <div>
                  <div className="font-bold text-white">MAGNETIC COMPASS</div>
                  <div className="text-[10px] text-neutral-400">
                    {sensorHealth.compass ? "Accurate Heading Reference" : "Uncalibrated Heading Reference"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleSensor("compass")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                  sensorHealth.compass
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {sensorHealth.compass ? "ONLINE" : "OFFLINE"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: PAYLOAD MASS */}
        {activeTab === "payload" && (
          <div className="space-y-4">
            <div className="text-[10px] text-neutral-400 bg-neutral-900 p-2 rounded-lg border border-neutral-800/80 leading-relaxed">
              Equipping heavy payloads shifts the <span className="text-amber-300 font-bold">hover throttle equilibrium</span>, decreases climb authority, and increases electrical discharge rates.
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">EQUIPPED PAYLOAD</span>
                <span className="font-bold text-cyan-400 text-sm">{payloadMassKg.toFixed(1)} kg</span>
              </div>

              <input
                type="range"
                min={0}
                max={Math.max(8.0, maxPayloadKg * 1.5)}
                step={0.5}
                value={payloadMassKg}
                onChange={(e) => onSetPayloadMass(Number(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>0.0 kg (Empty)</span>
                <span>Max Airframe: {maxPayloadKg.toFixed(1)} kg</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <button
                type="button"
                onClick={() => onSetPayloadMass(0)}
                className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-cyan-500/50 text-center font-bold text-neutral-300 hover:text-white"
              >
                0 kg<br /><span className="text-[9px] text-neutral-500">Unloaded</span>
              </button>
              <button
                type="button"
                onClick={() => onSetPayloadMass(2.5)}
                className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-cyan-500/50 text-center font-bold text-neutral-300 hover:text-white"
              >
                2.5 kg<br /><span className="text-[9px] text-neutral-500">Gimbal Cam</span>
              </button>
              <button
                type="button"
                onClick={() => onSetPayloadMass(6.5)}
                className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-cyan-500/50 text-center font-bold text-neutral-300 hover:text-white"
              >
                6.5 kg<br /><span className="text-[9px] text-neutral-500">Spray Tank</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Reset */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-900/40 shrink-0 flex items-center justify-between">
        <span className="text-[10px] text-neutral-500">AEROSPACE TESTBENCH</span>
        <button
          type="button"
          onClick={onResetAllFaults}
          className="px-3 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600/30 text-rose-300 font-bold text-[10px] tracking-wider transition-all"
        >
          RESTORE ALL NOMINAL
        </button>
      </div>
    </div>
  );
}
