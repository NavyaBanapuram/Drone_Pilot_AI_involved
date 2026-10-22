"use client";

import React from "react";
import { PhysicsDebugTelemetry } from "@/lib/simulation/types";
import { X, Activity } from "lucide-react";

interface PhysicsDebugHUDProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: PhysicsDebugTelemetry | null;
}

export function PhysicsDebugHUD({ isOpen, onClose, telemetry }: PhysicsDebugHUDProps) {
  if (!isOpen || !telemetry) return null;

  return (
    <div className="fixed bottom-24 right-4 z-40 w-80 bg-neutral-950/90 text-neutral-100 border border-neutral-700 rounded-2xl shadow-2xl p-4 font-mono text-xs backdrop-blur-md select-none pointer-events-auto">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-1.5 text-[#FF5500] font-bold">
          <Activity className="h-3.5 w-3.5" />
          <span>6-DoF PROPULSION TELEMETRY</span>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2.5 space-y-1.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-neutral-400">Total Mass / Weight:</span>
          <span className="font-bold text-neutral-200">{telemetry.totalMass} kg / {telemetry.weightNewtons} N</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400">Thrust / T:W Ratio:</span>
          <span className="font-bold text-[#FF5500]">{telemetry.totalThrustNewtons} N ({telemetry.thrustToWeightRatio}:1)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400">Battery Power:</span>
          <span className="font-bold text-amber-400">{telemetry.batteryPowerWatts} W</span>
        </div>

        <div className="pt-1.5 border-t border-neutral-800">
          <span className="text-neutral-400 block mb-1 text-[10px]">MOTOR OUTPUTS:</span>
          <div className="grid grid-cols-4 gap-1">
            {telemetry.motorOutputs.map((out, idx) => (
              <div key={idx} className="bg-neutral-900 p-1 rounded text-center border border-neutral-800">
                <span className="text-[9px] text-neutral-500 block">M{idx + 1}</span>
                <span className="font-bold text-xs text-neutral-200">{Math.round(out * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-1.5 border-t border-neutral-800 space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-neutral-400">Wind Force:</span>
            <span className="text-neutral-300">[{telemetry.windForce.x}, {telemetry.windForce.z}] N</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Aero Drag:</span>
            <span className="text-neutral-300">[{telemetry.dragForce.x}, {telemetry.dragForce.z}] N</span>
          </div>
        </div>
      </div>
    </div>
  );
}
