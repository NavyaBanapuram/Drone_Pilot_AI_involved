// ==========================================================
// DRONE PILOT — TELEMETRY HUD & AVIONICS CONTROLS
// Premium, Minimalist, Industry-Grade Flight Interface
// Features: 6-DoF Attitude Horizon, Motor Mix Gauges, Wind Vector,
// Tactical Map, Altitude Control, Direction Pad & Emergency Controls
// ==========================================================

"use client";

import React, { useState, useEffect, useRef } from "react";
import { TelemetryState, EnvironmentState } from "@/lib/simulation/types";
import { CameraMode } from "./chase-camera";
import { NavigationWaypoint } from "./minimap-widget";
import {
  Compass,
  Battery,
  Clock,
  Navigation,
  ShieldCheck,
  Eye,
  RotateCcw,
  RotateCw,
  ChevronDown,
  Keyboard,
  ChevronUp,
  Move,
  PlaneLanding,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  X,
  Wind,
  Activity,
  Play,
  FileText,
  CloudSun,
  HelpCircle,
  Zap,
  SlidersHorizontal,
  Sparkles,
  AlertTriangle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { MultiplayerRosterWidget } from "./multiplayer/multiplayer-roster-widget";
import { RemotePlayerState } from "@/lib/multiplayer/multiplayer-types";
import { BaseSwitcherHUD, FastTravelBase } from "./base-switcher-hud";

// ----------------------------------------------------------------
// 1. ARTIFICIAL HORIZON / ATTITUDE GYRO INSTRUMENT
// ----------------------------------------------------------------
interface AttitudeIndicatorProps {
  pitchRad: number;
  rollRad: number;
}

function AttitudeIndicator({ pitchRad, rollRad }: AttitudeIndicatorProps) {
  const pitchDeg = (pitchRad * 180) / Math.PI;
  const rollDeg = (rollRad * 180) / Math.PI;

  // Clamp visual pitch deflection to +/- 30 degrees for a clean display
  const clampedPitchDeg = Math.max(-30, Math.min(30, pitchDeg));
  const pitchOffsetY = clampedPitchDeg * 1.0; // 1 pixel per degree

  return (
    <div
      className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-black bg-neutral-900 shadow-md overflow-hidden shrink-0 select-none"
      title={`Attitude: Pitch ${pitchDeg.toFixed(1)}°, Roll ${rollDeg.toFixed(1)}°`}
    >
      {/* Moving Horizon Sphere */}
      <div
        className="absolute inset-[-40px] transition-transform duration-75 ease-out"
        style={{
          transform: `rotate(${-rollDeg}deg) translateY(${pitchOffsetY}px)`,
        }}
      >
        {/* Sky Half */}
        <div className="w-full h-1/2 bg-[#0284c7] relative">
          {/* Pitch Ladder Lines (+10, +20) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-[1px] bg-white/80" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-5 h-[1px] bg-white/70" />
        </div>

        {/* Horizon White Line */}
        <div className="w-full h-[2px] bg-white shadow-xs" />

        {/* Earth / Ground Half */}
        <div className="w-full h-1/2 bg-[#78350f] relative">
          {/* Pitch Ladder Lines (-10, -20) */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-[1px] bg-white/80" />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-5 h-[1px] bg-white/70" />
        </div>
      </div>

      {/* Fixed Aircraft Reticle Indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Left Wing */}
        <div className="w-4 h-[2px] bg-[#FF5500] shadow-xs mr-2" />
        {/* Center Target Dot */}
        <div className="w-1.5 h-1.5 rounded-full bg-[#FF5500] border border-black" />
        {/* Right Wing */}
        <div className="w-4 h-[2px] bg-[#FF5500] shadow-xs ml-2" />
      </div>

      {/* Attitude Numbers Pill */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.2 bg-black/75 rounded text-[8px] font-mono text-white font-bold tracking-tighter pointer-events-none">
        {pitchDeg >= 0 ? "+" : ""}{pitchDeg.toFixed(0)}° / {rollDeg.toFixed(0)}°
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// 2. PER-MOTOR MIXER OUTPUT BARS
// ----------------------------------------------------------------
interface MotorMixerGaugesProps {
  motorOutputs?: number[];
}

function MotorMixerGauges({ motorOutputs }: MotorMixerGaugesProps) {
  if (!motorOutputs || motorOutputs.length === 0) return null;

  return (
    <div
      className="hidden lg:flex flex-col items-center bg-white p-1.5 rounded-xl border-2 border-black shadow-sm shrink-0 select-none"
      title="Individual Motor Commanded Throttle (0-100%)"
    >
      <div className="flex items-center gap-1 text-[8px] font-black text-neutral-600 uppercase tracking-wider mb-1">
        <Zap className="h-2.5 w-2.5 text-[#FF5500]" />
        <span>MTR MIX ({motorOutputs.length})</span>
      </div>
      <div className="flex items-end gap-1 h-7 px-1">
        {motorOutputs.map((val, idx) => {
          const pct = Math.min(100, Math.max(0, Math.round(val * 100)));
          const colorClass =
            pct > 92 ? "bg-rose-500" : pct > 75 ? "bg-[#FF5500]" : "bg-emerald-500";
          return (
            <div key={idx} className="flex flex-col items-center gap-0.5">
              <div className="w-2.5 h-6 bg-neutral-100 rounded-xs overflow-hidden border border-neutral-300 flex items-end">
                <div
                  className={`w-full ${colorClass} transition-all duration-100`}
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="text-[7px] text-neutral-400 font-mono font-bold">M{idx + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// 3. DIRECTIONAL JOYSTICK (WASD TOUCH/CLICK & DRAG)
// ----------------------------------------------------------------
interface DirectionalJoystickProps {
  onMove: (pitch: number, roll: number) => void;
  className?: string;
}

function DirectionalJoystick({ onMove, className = "" }: DirectionalJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  const maxRadius = 22;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;

    el.setPointerCapture(e.pointerId);
    setIsActive(true);

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setStickPos({ x: clampedX, y: clampedY });
    onMove(-clampedY / maxRadius, clampedX / maxRadius);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isActive) return;
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setStickPos({ x: clampedX, y: clampedY });
    onMove(-clampedY / maxRadius, clampedX / maxRadius);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isActive) return;
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (el) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // pointer already released
      }
    }
    setIsActive(false);
    setStickPos({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const isUpActive = stickPos.y < -5;
  const isDownActive = stickPos.y > 5;
  const isLeftActive = stickPos.x < -5;
  const isRightActive = stickPos.x > 5;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-24 h-24 sm:w-26 sm:h-26 rounded-full bg-black/50 border border-white/[0.08] shadow-xl backdrop-blur-md relative flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        style={{ touchAction: "none" }}
        title="Flight Direction Pad (WASD)"
      >
        {/* Cardinal Key Indicators */}
        <span
          className={`absolute top-1.5 text-[10px] font-extrabold font-mono transition-colors pointer-events-none ${
            isUpActive ? "text-[#FF5500]" : "text-neutral-600"
          }`}
        >
          W
        </span>
        <span
          className={`absolute bottom-1.5 text-[10px] font-extrabold font-mono transition-colors pointer-events-none ${
            isDownActive ? "text-[#FF5500]" : "text-neutral-600"
          }`}
        >
          S
        </span>
        <span
          className={`absolute left-2 text-[10px] font-extrabold font-mono transition-colors pointer-events-none ${
            isLeftActive ? "text-[#FF5500]" : "text-neutral-600"
          }`}
        >
          A
        </span>
        <span
          className={`absolute right-2 text-[10px] font-extrabold font-mono transition-colors pointer-events-none ${
            isRightActive ? "text-[#FF5500]" : "text-neutral-600"
          }`}
        >
          D
        </span>

        {/* Guide ring */}
        <div className="w-14 h-14 rounded-full border border-dashed border-white/10 pointer-events-none" />

        {/* Thumbstick Puck */}
        <div
          className="absolute w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-md pointer-events-none"
          style={{
            transform: `translate3d(${stickPos.x}px, ${stickPos.y}px, 0)`,
            transition: isActive ? "none" : "transform 0.12s ease-out",
          }}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isActive ? "bg-[#FF5500] shadow-[0_0_8px_#FF5500] scale-110" : "bg-[#FF5500]"
            }`}
          />
        </div>
      </div>
    </div>
  );

}

// ----------------------------------------------------------------
// 4. MAIN TELEMETRY HUD PROPS
// ----------------------------------------------------------------
interface TelemetryHUDProps {
  telemetry: TelemetryState;
  droneName: string;
  cameraMode: CameraMode;
  onSelectCameraMode: (mode: CameraMode) => void;
  onReset: () => void;
  onExit: () => void;
  isHoverMode: boolean;
  isAutopilot?: boolean;
  onToggleAutopilot?: () => void;
  onToggleHover: () => void;
  onToggleMap: () => void;
  onMoveDirection: (pitch: number, roll: number) => void;
  onYaw: (yaw: number) => void;
  onThrottle: (throttle: number) => void;
  onAutoLand: () => void;
  // Platform additions
  onOpenEnvironment?: () => void;
  onOpenReplay?: () => void;
  onOpenAnalysis?: () => void;
  onToggleDebug?: () => void;
  onToggleTutorial?: () => void;
  environment?: EnvironmentState;
  remotePlayers?: RemotePlayerState[];
  callsign?: string;
  activeWaypoint?: NavigationWaypoint | null;
  onTeleportBase?: (base: FastTravelBase) => void;
  autoMoveLocked?: string;
  onCancelAutoMove?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export function TelemetryHUD({
  telemetry,
  droneName,
  cameraMode,
  onSelectCameraMode,
  onReset,
  onExit,
  isHoverMode,
  onToggleHover,
  isAutopilot,
  onToggleAutopilot,
  onToggleMap,
  onMoveDirection,
  onYaw,
  onThrottle,
  onAutoLand,
  onOpenEnvironment,
  onOpenReplay,
  onOpenAnalysis,
  onToggleDebug,
  onToggleTutorial,
  environment,
  remotePlayers,
  callsign,
  activeWaypoint,
  onTeleportBase,
  autoMoveLocked,
  onCancelAutoMove,
  isMuted,
  onToggleMute,
}: TelemetryHUDProps) {
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const controlsRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  // Click outside to dismiss popups automatically
  useEffect(() => {
    if (!isControlsOpen && !isToolsOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isControlsOpen && controlsRef.current && !controlsRef.current.contains(target)) {
        setIsControlsOpen(false);
      }
      if (isToolsOpen && toolsRef.current && !toolsRef.current.contains(target)) {
        setIsToolsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isControlsOpen, isToolsOpen]);

  // Keyboard shortcut: 'M' toggles tactical island map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "m" || e.key === "M") {
        onToggleMap();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleMap]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const cameraModeLabels: Record<CameraMode, string> = {
    chase: "Chase",
    fpv: "FPV Nose",
    topdown: "Top-Down",
  };

  // Calculate relative wind direction for arrow
  const windDir = environment?.windDirection ?? 0;
  const relWindAngle = windDir - telemetry.heading;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 select-none flex flex-col p-3 sm:p-5 font-mono text-neutral-900">
      {/* Top Bar removed in favor of Left/Right Glass Panels */}

      {/* ---------------------------------------------------- */}
      {/* ALTITUDE RESTRICTION & SURFACE CONTACT POPUP NOTICES  */}
      {/* ---------------------------------------------------- */}
      {telemetry.isCeilingLimitReached && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200 select-none">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/75 backdrop-blur-md text-white/90 font-mono text-[11px] tracking-widest border border-white/10 shadow-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF5500] shrink-0" />
            <span>CEILING LIMIT — 250 M</span>
          </div>
        </div>
      )}

      {telemetry.isGroundLimitReached && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200 select-none">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/75 backdrop-blur-md text-white/90 font-mono text-[11px] tracking-widest border border-white/10 shadow-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
            <span>SURFACE CONTACT</span>
          </div>
        </div>
      )}


      {/* ---------------------------------------------------- */}
      {/* CENTER CROSSHAIR (SUBTLE, NON-INTRUSIVE)             */}
      {/* ---------------------------------------------------- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-2.5 h-0.5 bg-white/60" />
          <div className="w-0.5 h-2.5 bg-white/60 absolute" />
          <div className="w-6 h-6 rounded-full border border-white/50 absolute" />
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* BOTTOM BAR: OPPOSITE CORNERS (ZERO VIEW INTERRUPTION)*/}
      {/* Left: Direction Pad + Altitude Controls              */}
      {/* Right: Compact Utility Dock + Tactical Map Circle    */}
      {/* ---------------------------------------------------- */}
      
    </div>
  );
}



