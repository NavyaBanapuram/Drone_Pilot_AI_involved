"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, Check } from "lucide-react";

interface SimulationLoadingScreenProps {
  onReady: () => void;
}

const PHASES = [
  "INITIALIZING THREE.JS WEBGL CONTEXT",
  "GENERATING 2000m x 1800m TERRAIN HEIGHTFIELD",
  "LOADING PROCEDURAL WATER & OCEAN WAVES",
  "SPAWNING REGIONAL BIOMES & RUNWAY ASSETS",
  "CALIBRATING 6-DoF FLIGHT CONTROLLER & IMU",
  "ACQUIRING RTK GNSS SATELLITE LOCK",
  "READY FOR TAKEOFF",
];

export function SimulationLoadingScreen({ onReady }: SimulationLoadingScreenProps) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPhase((prev) => {
        if (prev >= PHASES.length - 1) {
          clearInterval(timer);
          setTimeout(() => onReadyRef.current(), 250);
          return prev;
        }
        return prev + 1;
      });
    }, 140);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030712] font-mono select-none p-12">
      <div className="w-full max-w-2xl space-y-12 text-center">
        <div className="flex flex-col items-center justify-center gap-8">
          <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center text-white/90">
            <Loader2 className="h-12 w-12 animate-spin" />
          </div>
          <div>
            <h2 className="font-sans text-4xl md:text-5xl font-black text-white uppercase tracking-[0.2em]">
              DRONE PILOT SIMULATOR
            </h2>
            <p className="text-sm md:text-base text-white/60 font-bold tracking-[0.3em] mt-4 uppercase">
              Aeronautical Environment Initialization
            </p>
          </div>
        </div>

        <div className="space-y-4 text-left max-w-lg mx-auto pt-8">
          {PHASES.map((phase, idx) => {
            const isDone = idx < currentPhase;
            const isCurrent = idx === currentPhase;
            return (
              <div
                key={idx}
                className={"flex items-center gap-4 text-xs md:text-sm font-bold tracking-[0.15em] uppercase transition-colors duration-300 " + (
                  isDone
                    ? "text-emerald-400"
                    : isCurrent
                    ? "text-white scale-105 transform origin-left"
                    : "text-neutral-700"
                )}
              >
                {isDone ? (
                  <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <span className={`h-2 w-2 rounded-full shrink-0 ml-1.5 ${isCurrent ? "bg-white animate-pulse" : "bg-neutral-800"}`} />
                )}
                <span className="truncate">{phase}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
