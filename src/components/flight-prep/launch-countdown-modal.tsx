"use client";

import React, { useEffect, useState } from "react";
import { DroneModel } from "@/types/drone";
import { RegionDefinition, Helipad } from "@/lib/world/world-types";
import { CheckCircle2, Loader2, Radio, ShieldCheck, Zap } from "lucide-react";

interface LaunchCountdownModalProps {
  isOpen: boolean;
  drone: DroneModel;
  region: RegionDefinition;
  helipad: Helipad;
  onComplete: () => void;
}

const CHECKLIST_STEPS = [
  "INITIALIZING DIGITAL AVIONICS & IMU",
  "ACQUIRING RTK SATELLITE TELEMETRY (18 SATS)",
  "CALCULATING GROUND ELEVATION & CONTACT DATUM",
  "ARMING ROTOR MOTORS • TAKEOFF CLEARANCE GRANTED",
];

export function LaunchCountdownModal({
  isOpen,
  drone,
  region,
  helipad,
  onComplete,
}: LaunchCountdownModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < CHECKLIST_STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 300);
          return prev;
        }
      });
    }, 280);

    return () => clearInterval(interval);
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans select-none">
      <div className="w-full max-w-md bg-white border-3 border-black rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-150">
        {/* Radar Icon & Title */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-orange-50 border-2 border-black flex items-center justify-center text-[#FF5500]">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>

          <h2 className="font-heading font-bold text-xl uppercase tracking-wider text-neutral-950">
            PRE-FLIGHT TELEMETRY CHECKS
          </h2>

          <p className="font-mono text-xs text-neutral-500">
            {drone.name.toUpperCase()} • {region.name.toUpperCase()}
          </p>
        </div>

        {/* Step-by-Step Aviation Checklist */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-left font-mono text-xs space-y-2.5">
          {CHECKLIST_STEPS.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={idx}
                className={`flex items-center gap-2.5 transition-opacity ${
                  isDone
                    ? "text-emerald-700 font-bold"
                    : isCurrent
                    ? "text-neutral-900 font-bold"
                    : "text-neutral-400 opacity-40"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 text-[#FF5500] animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-neutral-300 shrink-0" />
                )}
                <span className="truncate">{step}</span>
              </div>
            );
          })}
        </div>

        {/* Telemetry Lock Data */}
        <div className="p-3 rounded-xl bg-neutral-950 text-white font-mono text-[11px] flex items-center justify-between border border-black">
          <span>SPAWN: {helipad.id.toUpperCase()}</span>
          <span className="text-[#FF5500]">
            [{helipad.position.x}m, {(helipad.elevation + 0.245).toFixed(2)}m, {helipad.position.z}m]
          </span>
        </div>

        {/* Skip Button */}
        <button
          type="button"
          onClick={onComplete}
          className="text-xs font-mono font-bold text-neutral-500 hover:text-neutral-900 underline uppercase tracking-wider"
        >
          SKIP TO COCKPIT →
        </button>
      </div>
    </div>
  );
}
