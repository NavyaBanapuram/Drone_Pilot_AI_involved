"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { TelemetryState } from "@/lib/simulation/types";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  Award,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  Crosshair,
  RotateCw,
  Compass,
  EyeOff,
} from "lucide-react";

interface TutorialOverlayProps {
  telemetry: TelemetryState;
  onDismiss: () => void;
}

interface CoachStep {
  id: string;
  stepNum: number;
  title: string;
  badge: string;
  instruction: string;
  keys: string[];
  successMessage: string;
}

const COACH_STEPS: CoachStep[] = [
  {
    id: "takeoff",
    stepNum: 1,
    title: "ENGINE IGNITION & LIFTOFF",
    badge: "TAKEOFF",
    instruction: "Hold SPACE (or tap CLIMB) to spin up the 4 brushless motors and ascend to 4 meters altitude.",
    keys: ["SPACE", "CLIMB"],
    successMessage: "LIFTOFF CONFIRMED! (+4.0m)",
  },
  {
    id: "hover",
    stepNum: 2,
    title: "GPS POSITION & ALTITUDE HOLD",
    badge: "HOVER LOCK",
    instruction: "Release all controls! The flight computer automatically compensates for wind and locks altitude in mid-air.",
    keys: ["HANDS OFF"],
    successMessage: "ALTITUDE & GPS LOCKED WITH ZERO DRIFT!",
  },
  {
    id: "forward",
    stepNum: 3,
    title: "FORWARD TRANSLATION & CRUISE",
    badge: "PITCH FORWARD",
    instruction: "Press W (or push the Flight Pad forward) to tilt into forward cruise across the island terrain.",
    keys: ["W"],
    successMessage: "FORWARD CRUISE VELOCITY ACHIEVED!",
  },
  {
    id: "bank_turn",
    stepNum: 4,
    title: "COORDINATED BANKING & YAW",
    badge: "TURNING DRILLS",
    instruction: "Use A / D to bank roll into turns, and Q / E to rotate your compass heading 360° toward the mountain ridges.",
    keys: ["A", "D", "Q", "E"],
    successMessage: "TURNING MANEUVER MASTERED!",
  },
  {
    id: "high_speed",
    stepNum: 5,
    title: "HIGH-SPEED SPORT CRUISE",
    badge: "SPORT SPEED",
    instruction: "Full throttle forward! Push past 40 km/h and slalom between the trees without colliding.",
    keys: ["W + SPACE"],
    successMessage: "SPORT CRUISE REACHED (40+ KM/H)!",
  },
  {
    id: "tactical_recon",
    stepNum: 6,
    title: "AVIONICS & TACTICAL RECON",
    badge: "RECON MAP",
    instruction: "Press M to open the full Tactical Island Map, or tap V to cycle camera views.",
    keys: ["M", "V"],
    successMessage: "TACTICAL AVIONICS VERIFIED!",
  },
  {
    id: "landing",
    stepNum: 7,
    title: "PRECISION HELIPAD TOUCHDOWN",
    badge: "TOUCHDOWN",
    instruction: "Navigate over any helipad and tap L (Auto-Land) or hold SHIFT/C to gently touch down on the tarmac.",
    keys: ["L", "SHIFT"],
    successMessage: "TOUCHDOWN CONFIRMED! SAFE LANDING!",
  },
];

function StepVisualIndicator({ stepId }: { stepId: string }) {
  switch (stepId) {
    case "takeoff":
      return (
        <div className="relative flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 shrink-0 shadow-sm">
          <ArrowUp className="h-6 w-6 animate-bounce" />
          <div className="absolute -bottom-0.5 w-5 h-0.5 bg-orange-400 rounded-full animate-pulse" />
        </div>
      );
    case "hover":
      return (
        <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
          <Crosshair className="h-6 w-6 animate-pulse" />
          <div className="absolute inset-1.5 border border-cyan-400/40 rounded-full animate-ping" />
        </div>
      );
    case "forward":
      return (
        <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
          <div className="flex items-center -space-x-1.5 animate-pulse">
            <ChevronRight className="h-5 w-5 opacity-60" />
            <ChevronRight className="h-6 w-6" />
          </div>
        </div>
      );
    case "bank_turn":
      return (
        <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
          <RotateCw className="h-6 w-6 animate-spin" style={{ animationDuration: "5s" }} />
        </div>
      );
    case "high_speed":
      return (
        <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
          <ChevronsRight className="h-7 w-7 animate-pulse" />
        </div>
      );
    case "tactical_recon":
      return (
        <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.25)]">
          <Compass className="h-6 w-6 animate-spin" style={{ animationDuration: "8s" }} />
        </div>
      );
    case "landing":
      return (
        <div className="relative flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.25)]">
          <ArrowDown className="h-6 w-6 animate-bounce" />
          <div className="absolute -bottom-0.5 w-6 h-1 bg-rose-400 rounded-full" />
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-orange-500/20 text-orange-400 shrink-0">
          <Sparkles className="h-6 w-6 animate-pulse" />
        </div>
      );
  }
}

export function TutorialOverlay({ telemetry, onDismiss }: TutorialOverlayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isStepSuccess, setIsStepSuccess] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const initialYawRef = useRef<number | null>(null);
  const hoverStartTimeRef = useRef<number | null>(null);

  const step = COACH_STEPS[currentStepIndex];

  const handlePermanentDismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("drone_pilot_flight_coach_completed", "true");
    }
    onDismiss();
  }, [onDismiss]);

  // Initialize initial yaw for turn detection
  useEffect(() => {
    if (initialYawRef.current === null && telemetry.rotation) {
      initialYawRef.current = telemetry.rotation.yaw;
    }
  }, [telemetry.rotation]);

  // Handle auto-advancement with fading success cues
  const advanceStep = useCallback((stepIdx: number) => {
    setIsStepSuccess(true);
    const timer = setTimeout(() => {
      setIsStepSuccess(false);
      if (stepIdx + 1 < COACH_STEPS.length) {
        setCurrentStepIndex(stepIdx + 1);
      } else {
        setIsCompleted(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("drone_pilot_flight_coach_completed", "true");
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Step trigger conditions
  useEffect(() => {
    if (isStepSuccess || isCompleted) return;

    // STEP 1: Takeoff to > 2.8m
    if (currentStepIndex === 0) {
      if (telemetry.altitude > 2.8) {
        advanceStep(0);
      }
    }
    // STEP 2: Hover hold for 2.2 seconds
    else if (currentStepIndex === 1) {
      const isStill = Math.abs(telemetry.verticalSpeed) < 0.35 && telemetry.groundSpeed < 1.4;
      if (isStill && telemetry.altitude > 2.0) {
        if (!hoverStartTimeRef.current) {
          hoverStartTimeRef.current = Date.now();
        } else if (Date.now() - hoverStartTimeRef.current >= 2200) {
          advanceStep(1);
        }
      } else {
        hoverStartTimeRef.current = null;
      }
    }
    // STEP 3: Forward Translation
    else if (currentStepIndex === 2) {
      if (telemetry.groundSpeed >= 3.2 || telemetry.distanceFromHome >= 16) {
        advanceStep(2);
      }
    }
    // STEP 4: Banking / Yaw rotation
    else if (currentStepIndex === 3) {
      const curYaw = telemetry.rotation?.yaw ?? 0;
      const initialYaw = initialYawRef.current ?? 0;
      const yawDelta = Math.abs(curYaw - initialYaw);
      const isBanking = Math.abs(telemetry.rotation?.roll ?? 0) > 0.12;

      if (yawDelta > 0.4 || isBanking) {
        advanceStep(3);
      }
    }
    // STEP 5: High speed sport cruise (> 10 m/s = 36 km/h)
    else if (currentStepIndex === 4) {
      if (telemetry.groundSpeed >= 9.0) {
        advanceStep(4);
      }
    }
    // STEP 6: Recon Map or Distance
    else if (currentStepIndex === 5) {
      if (telemetry.distanceFromHome > 40) {
        advanceStep(5);
      }
    }
    // STEP 7: Landing
    else if (currentStepIndex === 6) {
      if (telemetry.flightMode === "LANDED" || (telemetry.altitude < 0.4 && telemetry.groundSpeed < 0.4)) {
        advanceStep(6);
      }
    }
  }, [telemetry, currentStepIndex, isStepSuccess, isCompleted, advanceStep]);

  // Graduation Wings Banner (Transparent Tactical Glass)
  if (isCompleted) {
    return (
      <div className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 font-mono select-none pointer-events-auto animate-in fade-in zoom-in-95 duration-400">
        <div className="bg-neutral-950/85 backdrop-blur-xl text-white border border-[#FF5500]/60 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] p-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-orange-500/10 pointer-events-none" />
          <button
            onClick={handlePermanentDismiss}
            className="absolute top-3 right-3 text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="w-10 h-10 rounded-full bg-[#FF5500]/20 border border-[#FF5500] flex items-center justify-center mx-auto mb-2 text-[#FF5500]">
            <Award className="h-5 w-5" />
          </div>

          <div className="text-[10px] font-bold text-[#FF5500] tracking-widest uppercase">
            FLIGHT ACADEMY CERTIFIED
          </div>
          <h3 className="font-heading text-sm font-black uppercase text-white mt-0.5">
            PILOT WINGS EARNED
          </h3>
          <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">
            All 7 flight drills mastered. Cleared for unrestricted solo flight across the island.
          </p>

          <button
            onClick={handlePermanentDismiss}
            className="mt-3 px-5 py-1.5 rounded-xl bg-[#FF5500] text-black font-extrabold text-xs tracking-wider uppercase hover:bg-orange-400 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            Continue Free Flight
          </button>
        </div>
      </div>
    );
  }

  // Minimized floating pill (Transparent Glass HUD)
  if (isMinimized) {
    return (
      <div className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 font-mono select-none pointer-events-auto animate-in fade-in duration-200">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-950/80 backdrop-blur-md border border-white/20 shadow-xl text-xs font-bold text-white hover:bg-neutral-900 active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#FF5500] animate-spin" />
          <span>COACH: STEP {step.stepNum}/7</span>
          <ChevronUp className="h-3.5 w-3.5 text-neutral-400" />
        </button>
      </div>
    );
  }

  // Active Game-Style Transparent HUD Coach
  return (
    <div className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 font-mono select-none pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.65)] p-3 sm:p-3.5 relative transition-all text-white">
        {/* Step Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5500] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5500]" />
            </span>
            <span className="text-[10px] font-extrabold text-white/90 tracking-wider">
              FLIGHT COACH • {step.stepNum}/7
            </span>
            <span className="text-[9px] font-bold bg-[#FF5500]/20 text-[#FF5500] px-1.5 py-0.5 rounded border border-[#FF5500]/40">
              {step.badge}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Step Navigation Arrows (Browse 1 by 1) */}
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="text-neutral-400 hover:text-white p-1 rounded transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title="Previous step"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.min(COACH_STEPS.length - 1, prev + 1))}
              disabled={currentStepIndex === COACH_STEPS.length - 1}
              className="text-neutral-400 hover:text-white p-1 rounded transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title="Next step"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-neutral-400 hover:text-white p-1 rounded transition-colors cursor-pointer ml-1"
              title="Minimize"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handlePermanentDismiss}
              className="text-neutral-400 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
              title="Close and don't show again"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Step Body with Animated Arrow Indicator */}
        {isStepSuccess ? (
          <div className="py-2.5 flex items-center gap-3 animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 animate-bounce" />
            <div>
              <div className="text-xs font-black text-emerald-400 tracking-wide">
                STEP COMPLETE!
              </div>
              <div className="text-[11px] font-bold text-white/90 mt-0.5">
                {step.successMessage}
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-2.5 flex items-center gap-3">
            {/* Visual Animated Directional Arrow / Target Indicator */}
            <StepVisualIndicator stepId={step.id} />

            {/* Instruction Text & Keys */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-heading text-xs font-black text-white uppercase tracking-wide truncate">
                  {step.title}
                </h4>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed mt-0.5">
                {step.instruction}
              </p>

              {/* Action Keys & Progress */}
              <div className="mt-2 flex items-center justify-between flex-wrap gap-2 pt-1.5 border-t border-white/10">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                    INPUT:
                  </span>
                  {step.keys.map((k) => (
                    <kbd
                      key={k}
                      className="px-1.5 py-0.5 rounded bg-white/10 text-[#FF5500] font-mono text-[10px] font-extrabold border border-white/20 shadow-xs"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>

                {/* Progress Dots */}
                <div className="flex items-center gap-1 shrink-0">
                  {COACH_STEPS.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => setCurrentStepIndex(idx)}
                      className={"h-1.5 rounded-full transition-all cursor-pointer " + (
                        idx === currentStepIndex
                          ? "w-4 bg-[#FF5500]"
                          : idx < currentStepIndex
                          ? "w-2 bg-emerald-400"
                          : "w-1.5 bg-white/20 hover:bg-white/40"
                      )}
                      title={"Step " + (idx + 1) + ": " + s.badge}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dismiss Hint */}
        <div className="mt-1.5 pt-1 border-t border-white/5 flex items-center justify-between text-[9px] text-neutral-400">
          <div className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Telemetry verified in real-time</span>
          </div>
          <button
            onClick={handlePermanentDismiss}
            className="text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <EyeOff className="h-2.5 w-2.5" />
            <span>Don&apos;t show again</span>
          </button>
        </div>
      </div>
    </div>
  );
}

