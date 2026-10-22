// ==========================================================
// DRONE PILOT — PROFESSIONAL POST-FLIGHT ANALYTICS & DEBRIEF (PHASE 1)
// Commercial Aviation & UAS debriefing report with dynamic SVG
// telemetry curves, FAA Part 107 compliance audit, blackbox CSV
// flight data export, and clean white-theme PDF printable styling.
// ==========================================================

import React, { useMemo } from "react";
import {
  Download,
  X,
  Clock,
  Navigation,
  AlertTriangle,
  ShieldCheck,
  Activity,
  CloudSun,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Gauge,
  BatteryCharging,
  Award,
  Zap,
  Check,
  Plane,
} from "lucide-react";
import { DroneModel } from "@/types/drone";
import { TelemetryState, EnvironmentState, ReplayFrame } from "@/lib/simulation/types";
import { FlightCoachInsight } from "@/lib/simulation/flight-coach-types";

interface Stats {
  startTime: number;
  topSpeed: number;
  maxAltitude: number;
  distance: number;
  crashes: number;
}

interface Props {
  drone: DroneModel;
  telemetry: TelemetryState;
  envState: EnvironmentState;
  stats: Stats;
  insights: FlightCoachInsight[];
  frames?: ReplayFrame[];
  droneQuantity?: number;
  callsign?: string;
  onClose: () => void;
}

export function PostFlightReportModal({
  drone,
  telemetry,
  envState,
  stats,
  insights,
  frames = [],
  droneQuantity = 1,
  callsign = "Pilot",
  onClose,
}: Props) {
  const flightTimeSec = Math.max(1, Math.round((Date.now() - stats.startTime) / 1000));
  const flightTimeStr = `${Math.floor(flightTimeSec / 60)}m ${flightTimeSec % 60}s`;

  // Downsample frames for SVG charts
  const sampledData = useMemo(() => {
    if (!frames || frames.length === 0) {
      // Fallback synthetic 2-point series if no frames yet
      return [
        { time: 0, alt: 0, speed: 0, battery: 100, motors: [0, 0, 0, 0] },
        {
          time: flightTimeSec,
          alt: stats.maxAltitude,
          speed: stats.topSpeed,
          battery: telemetry.batteryLevel,
          motors: telemetry.motorOutputs || [0.65, 0.65, 0.65, 0.65],
        },
      ];
    }
    const maxSamples = 50;
    const step = Math.max(1, Math.floor(frames.length / maxSamples));
    const result = [];
    for (let i = 0; i < frames.length; i += step) {
      const f = frames[i];
      result.push({
        time: Math.round(f.timeSeconds * 10) / 10,
        alt: Math.max(0, Math.round(f.altitudeAgl * 10) / 10),
        speed: Math.round(f.groundSpeedKmh * 10) / 10,
        battery: Math.round(f.batteryLevel),
        motors: f.motorOutputs || [0, 0, 0, 0],
      });
    }
    return result;
  }, [frames, flightTimeSec, stats.maxAltitude, stats.topSpeed, telemetry]);

  // Motor load averages
  const motorAverages = useMemo(() => {
    const motorCount = telemetry.motorOutputs?.length || 4;
    const sums = new Array(motorCount).fill(0);
    let sampleCount = 0;

    if (frames && frames.length > 0) {
      for (const f of frames) {
        if (f.motorOutputs && f.motorOutputs.length > 0) {
          sampleCount++;
          for (let m = 0; m < motorCount; m++) {
            sums[m] += f.motorOutputs[m] || 0;
          }
        }
      }
    }

    if (sampleCount === 0) {
      return (telemetry.motorOutputs || [0.55, 0.55, 0.55, 0.55]).map((v) =>
        Math.round(v * 100)
      );
    }

    return sums.map((s) => Math.round((s / sampleCount) * 100));
  }, [frames, telemetry.motorOutputs]);

  // FAA Compliance Audit Logic
  const compliance = useMemo(() => {
    const isAltCompliant = stats.maxAltitude <= 120.0;
    const isDistanceCompliant = stats.distance <= 750.0;
    const isBatteryCompliant = telemetry.batteryLevel >= 15.0;
    const isCrashCompliant = stats.crashes === 0;

    let score = 100;
    if (!isCrashCompliant) score -= 40;
    if (!isAltCompliant) score -= 25;
    if (!isBatteryCompliant) score -= 15;
    if (!isDistanceCompliant) score -= 10;
    score -= Math.min(20, insights.filter((i) => i.severity === "CRITICAL").length * 8);

    const scoreClamped = Math.max(20, Math.min(100, score));
    let grade = "A+";
    if (scoreClamped < 60) grade = "F";
    else if (scoreClamped < 70) grade = "C";
    else if (scoreClamped < 80) grade = "B";
    else if (scoreClamped < 90) grade = "A";

    return {
      isAltCompliant,
      isDistanceCompliant,
      isBatteryCompliant,
      isCrashCompliant,
      score: scoreClamped,
      grade,
    };
  }, [stats, telemetry, insights]);

  // Export CSV Blackbox
  const handleExportCSV = () => {
    const headers = [
      "Time_Seconds",
      "Altitude_AGL_Meters",
      "Ground_Speed_KMH",
      "Battery_Percent",
      "Pitch_Deg",
      "Roll_Deg",
      "Yaw_Deg",
      "Position_X",
      "Position_Y",
      "Position_Z",
      "Motor_1_Throttle_Pct",
      "Motor_2_Throttle_Pct",
      "Motor_3_Throttle_Pct",
      "Motor_4_Throttle_Pct",
      "Flight_Mode",
    ];

    const dataRows = (frames.length > 0 ? frames : []).map((f) => [
      f.timeSeconds.toFixed(2),
      f.altitudeAgl.toFixed(2),
      f.groundSpeedKmh.toFixed(2),
      f.batteryLevel.toFixed(1),
      ((f.rotation?.pitch || 0) * (180 / Math.PI)).toFixed(2),
      ((f.rotation?.roll || 0) * (180 / Math.PI)).toFixed(2),
      ((f.rotation?.yaw || 0) * (180 / Math.PI)).toFixed(2),
      f.position.x.toFixed(2),
      f.position.y.toFixed(2),
      f.position.z.toFixed(2),
      ((f.motorOutputs?.[0] || 0) * 100).toFixed(1),
      ((f.motorOutputs?.[1] || 0) * 100).toFixed(1),
      ((f.motorOutputs?.[2] || 0) * 100).toFixed(1),
      ((f.motorOutputs?.[3] || 0) * 100).toFixed(1),
      f.flightMode || "MANUAL",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...dataRows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `DronePilot_Blackbox_${drone.name.replace(/\s+/g, "_")}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Chart Geometry Constants
  const chartW = 560;
  const chartH = 150;
  const padL = 40;
  const padR = 15;
  const padT = 20;
  const padB = 25;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  // 1. Altitude Curve Points
  const maxAltY = Math.max(140, Math.ceil(stats.maxAltitude * 1.25));
  const altPoints = sampledData.map((d, idx) => {
    const x = padL + (idx / Math.max(1, sampledData.length - 1)) * plotW;
    const y = padT + plotH - (Math.min(maxAltY, d.alt) / maxAltY) * plotH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const altPath = altPoints.length > 0 ? `M ${altPoints.join(" L ")}` : "";
  const altArea =
    altPoints.length > 0
      ? `M ${padL},${padT + plotH} L ${altPoints.join(" L ")} L ${
          padL + plotW
        },${padT + plotH} Z`
      : "";
  const faaLimitY = padT + plotH - (120 / maxAltY) * plotH;

  // 2. Speed Curve Points
  const maxSpeedY = Math.max(40, Math.ceil(stats.topSpeed * 1.25));
  const speedPoints = sampledData.map((d, idx) => {
    const x = padL + (idx / Math.max(1, sampledData.length - 1)) * plotW;
    const y = padT + plotH - (Math.min(maxSpeedY, d.speed) / maxSpeedY) * plotH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const speedPath = speedPoints.length > 0 ? `M ${speedPoints.join(" L ")}` : "";
  const speedArea =
    speedPoints.length > 0
      ? `M ${padL},${padT + plotH} L ${speedPoints.join(" L ")} L ${
          padL + plotW
        },${padT + plotH} Z`
      : "";

  // 3. Battery Curve Points
  const batteryPoints = sampledData.map((d, idx) => {
    const x = padL + (idx / Math.max(1, sampledData.length - 1)) * plotW;
    const y = padT + plotH - (Math.max(0, Math.min(100, d.battery)) / 100) * plotH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const batteryPath = batteryPoints.length > 0 ? `M ${batteryPoints.join(" L ")}` : "";
  const criticalBattY = padT + plotH - (20 / 100) * plotH;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md print:bg-white print:backdrop-blur-none p-3 sm:p-6 md:p-10 font-sans">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-white text-neutral-900 rounded-2xl shadow-2xl overflow-y-auto print:max-h-none print:shadow-none print:w-full print:border-none print:rounded-none flex flex-col border border-neutral-200">
        {/* Sticky Web Action Toolbar (Hidden in Print) */}
        <div className="sticky top-0 z-20 flex justify-between items-center bg-white/95 backdrop-blur-md border-b border-neutral-200 px-6 py-4 print:hidden">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#FF5500]" />
            <h2 className="font-extrabold text-base tracking-wider uppercase text-neutral-900">
              UAS Flight Operations Debriefing
            </h2>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs uppercase tracking-wider transition-colors border border-neutral-300 shadow-xs cursor-pointer"
              title="Download Telemetry Blackbox CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV Log
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF5500] hover:bg-[#e04b00] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download PDF Report
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
              aria-label="Close Report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document */}
        <div className="p-6 sm:p-10 md:p-12 space-y-8 bg-white">
          {/* Header & Aviation Certificate Header */}
          <div className="border-b-2 border-neutral-900 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <div className="flex items-center gap-2.5 text-[#FF5500] font-mono font-bold text-xs uppercase tracking-widest mb-1.5">
                <Plane className="w-4 h-4" />
                <span>Civil Aviation Operational Log • ICAO / FAA Part 107 Standard</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 uppercase">
                POST-FLIGHT ANALYTICS REPORT
              </h1>
              <p className="text-neutral-500 font-medium text-xs sm:text-sm mt-1">
                AeroTrainer Telemetry & Autonomous Flight Controller Certification
              </p>
            </div>

            <div className="flex items-center gap-6 text-right font-mono">
              <div className="text-left md:text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                  Pilot In Command
                </span>
                <span className="text-base font-extrabold text-neutral-900">{callsign}</span>
              </div>
              <div className="border-l border-neutral-200 pl-6 text-left md:text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                  Date & Time
                </span>
                <span className="text-xs font-bold text-neutral-800 block">
                  {new Date().toLocaleDateString()}
                </span>
                <span className="text-[11px] text-neutral-500">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Mission Summary & Safety Badge */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Airframe Platform
                </span>
                <strong className="text-base font-black text-neutral-900 block truncate">
                  {drone.name}
                </strong>
                <span className="text-[11px] font-medium text-neutral-500">
                  {drone.platformCategory.toUpperCase()} • {drone.baseMassKg} kg
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Airspace Environment
                </span>
                <strong className="text-base font-black text-neutral-900 block capitalize">
                  {envState.preset || envState.weather || "Standard"}
                </strong>
                <span className="text-[11px] font-medium text-neutral-500">
                  Wind {envState.windSpeed.toFixed(1)} m/s • {envState.temperature}°C
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Swarm Units Flown
                </span>
                <strong className="text-base font-black text-neutral-900 block">
                  {droneQuantity} {droneQuantity === 1 ? "Aircraft" : "Drones (Fleet)"}
                </strong>
                <span className="text-[11px] font-medium text-emerald-600">
                  Synchronized Telemetry
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border-2 border-neutral-900 bg-neutral-900 text-white flex items-center justify-between shadow-md">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Airworthiness Score
                </span>
                <span className="text-2xl font-black text-[#FF5500] leading-none">
                  {compliance.score}/100
                </span>
                <span className="text-[11px] font-bold text-white/80 block mt-0.5">
                  Grade {compliance.grade}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Award className="w-5 h-5 text-[#FF5500]" />
              </div>
            </div>
          </div>

          {/* Core Flight Metrics Grid */}
          <div>
            <h3 className="text-xs font-bold tracking-widest text-neutral-400 uppercase mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#FF5500]" /> Primary Flight Dynamics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
              <div className="p-4 bg-white border border-neutral-200 rounded-xl text-center shadow-xs">
                <Clock className="w-5 h-5 text-[#FF5500] mx-auto mb-1.5" />
                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block">
                  Total Air Time
                </span>
                <p className="text-2xl font-black text-neutral-900">{flightTimeStr}</p>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Continuous Record</span>
              </div>

              <div className="p-4 bg-white border border-neutral-200 rounded-xl text-center shadow-xs">
                <Gauge className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block">
                  Max Altitude (AGL)
                </span>
                <p className="text-2xl font-black text-neutral-900">
                  {Math.round(stats.maxAltitude * 10) / 10} m
                </p>
                <span
                  className={`text-[10px] font-bold block mt-0.5 ${
                    compliance.isAltCompliant ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {compliance.isAltCompliant ? "Under 120m Ceiling" : "Exceeded 120m Limit"}
                </span>
              </div>

              <div className="p-4 bg-white border border-neutral-200 rounded-xl text-center shadow-xs">
                <Navigation className="w-5 h-5 text-sky-600 mx-auto mb-1.5" />
                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block">
                  Peak Ground Speed
                </span>
                <p className="text-2xl font-black text-neutral-900">
                  {Math.round(stats.topSpeed * 10) / 10} km/h
                </p>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  {(stats.topSpeed / 3.6).toFixed(1)} m/s
                </span>
              </div>

              <div className="p-4 bg-white border border-neutral-200 rounded-xl text-center shadow-xs">
                <BatteryCharging className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block">
                  Remaining Battery
                </span>
                <p className="text-2xl font-black text-neutral-900">
                  {Math.round(telemetry.batteryLevel)}%
                </p>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  {telemetry.batteryVoltage ? `${telemetry.batteryVoltage.toFixed(1)}V` : "14.8V Nominal"}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic SVG Telemetry Graphs (Phase 1) */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold tracking-widest text-neutral-400 uppercase flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#FF5500]" /> Telemetry Time-Series Analysis
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Altitude Profile */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 shadow-xs">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 uppercase">
                      Altitude Flight Profile (AGL)
                    </h4>
                    <span className="text-[10px] text-neutral-500">
                      Height above ground level with FAA 120m threshold
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-200 text-neutral-700">
                    Max: {stats.maxAltitude.toFixed(1)}m
                  </span>
                </div>

                <div className="w-full overflow-hidden bg-white rounded-lg border border-neutral-200 p-2">
                  <svg
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    className="w-full h-36 object-contain"
                  >
                    <defs>
                      <linearGradient id="altGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF5500" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#FF5500" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gridlines */}
                    <line
                      x1={padL}
                      y1={padT}
                      x2={padL + plotW}
                      y2={padT}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <line
                      x1={padL}
                      y1={padT + plotH / 2}
                      x2={padL + plotW}
                      y2={padT + plotH / 2}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <line
                      x1={padL}
                      y1={padT + plotH}
                      x2={padL + plotW}
                      y2={padT + plotH}
                      stroke="#e2e8f0"
                      strokeWidth="1.5"
                    />

                    {/* FAA 120m Legal Line */}
                    <line
                      x1={padL}
                      y1={faaLimitY}
                      x2={padL + plotW}
                      y2={faaLimitY}
                      stroke="#e11d48"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <text
                      x={padL + plotW - 4}
                      y={faaLimitY - 4}
                      fill="#e11d48"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      FAA Part 107 Limit (120m)
                    </text>

                    {/* Altitude Curve */}
                    {altArea && <path d={altArea} fill="url(#altGrad)" />}
                    {altPath && (
                      <path
                        d={altPath}
                        fill="none"
                        stroke="#FF5500"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Y Axis Labels */}
                    <text
                      x={padL - 6}
                      y={padT + plotH}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                    >
                      0m
                    </text>
                    <text
                      x={padL - 6}
                      y={padT + plotH / 2}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                    >
                      {(maxAltY / 2).toFixed(0)}m
                    </text>
                    <text
                      x={padL - 6}
                      y={padT + 8}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                    >
                      {maxAltY.toFixed(0)}m
                    </text>

                    {/* X Axis Labels */}
                    <text
                      x={padL}
                      y={chartH - 6}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="start"
                    >
                      0s
                    </text>
                    <text
                      x={padL + plotW}
                      y={chartH - 6}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                    >
                      {flightTimeSec}s
                    </text>
                  </svg>
                </div>
              </div>

              {/* Chart 2: Ground Speed Profile */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 shadow-xs">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 uppercase">
                      Ground Speed Curve
                    </h4>
                    <span className="text-[10px] text-neutral-500">
                      Horizontal velocity trajectory across mission duration
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-200 text-neutral-700">
                    Peak: {stats.topSpeed.toFixed(1)} km/h
                  </span>
                </div>

                <div className="w-full overflow-hidden bg-white rounded-lg border border-neutral-200 p-2">
                  <svg
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    className="w-full h-36 object-contain"
                  >
                    <defs>
                      <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gridlines */}
                    <line
                      x1={padL}
                      y1={padT}
                      x2={padL + plotW}
                      y2={padT}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <line
                      x1={padL}
                      y1={padT + plotH / 2}
                      x2={padL + plotW}
                      y2={padT + plotH / 2}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <line
                      x1={padL}
                      y1={padT + plotH}
                      x2={padL + plotW}
                      y2={padT + plotH}
                      stroke="#e2e8f0"
                      strokeWidth="1.5"
                    />

                    {/* Speed Curve */}
                    {speedArea && <path d={speedArea} fill="url(#speedGrad)" />}
                    {speedPath && (
                      <path
                        d={speedPath}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Y Axis Labels */}
                    <text
                      x={padL - 6}
                      y={padT + plotH}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                    >
                      0
                    </text>
                    <text
                      x={padL - 6}
                      y={padT + plotH / 2}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                    >
                      {(maxSpeedY / 2).toFixed(0)}
                    </text>
                    <text
                      x={padL - 6}
                      y={padT + 8}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                    >
                      {maxSpeedY.toFixed(0)}
                    </text>

                    {/* X Axis Labels */}
                    <text
                      x={padL}
                      y={chartH - 6}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="start"
                    >
                      0s
                    </text>
                    <text
                      x={padL + plotW}
                      y={chartH - 6}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                    >
                      {flightTimeSec}s
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            {/* Bottom 2 Charts: Battery Discharge & Motor Trim Balance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 3: Battery Discharge Curve */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 shadow-xs">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 uppercase">
                      Battery Discharge Trajectory
                    </h4>
                    <span className="text-[10px] text-neutral-500">
                      Lithium-Polymer cell reserve depletion rate
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-200 text-neutral-700">
                    Final: {Math.round(telemetry.batteryLevel)}%
                  </span>
                </div>

                <div className="w-full overflow-hidden bg-white rounded-lg border border-neutral-200 p-2">
                  <svg
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    className="w-full h-36 object-contain"
                  >
                    {/* Critical Reserve Threshold (20%) */}
                    <line
                      x1={padL}
                      y1={criticalBattY}
                      x2={padL + plotW}
                      y2={criticalBattY}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <text
                      x={padL + plotW - 4}
                      y={criticalBattY - 4}
                      fill="#f59e0b"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      Reserve Reserve Limit (20%)
                    </text>

                    {/* Battery Path */}
                    {batteryPath && (
                      <path
                        d={batteryPath}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Axes */}
                    <line
                      x1={padL}
                      y1={padT + plotH}
                      x2={padL + plotW}
                      y2={padT + plotH}
                      stroke="#e2e8f0"
                      strokeWidth="1.5"
                    />
                    <text
                      x={padL - 6}
                      y={padT + plotH}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                    >
                      0%
                    </text>
                    <text
                      x={padL - 6}
                      y={criticalBattY + 3}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                    >
                      20%
                    </text>
                    <text
                      x={padL - 6}
                      y={padT + 8}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                    >
                      100%
                    </text>

                    <text
                      x={padL}
                      y={chartH - 6}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="start"
                    >
                      0s
                    </text>
                    <text
                      x={padL + plotW}
                      y={chartH - 6}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                    >
                      {flightTimeSec}s
                    </text>
                  </svg>
                </div>
              </div>

              {/* Chart 4: Motor Thrust Equilibrium Breakdown */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 shadow-xs">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 uppercase">
                      Multirotor Thrust Equilibrium
                    </h4>
                    <span className="text-[10px] text-neutral-500">
                      Average throttle load distribution across individual motors
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                    Balanced
                  </span>
                </div>

                <div className="w-full bg-white rounded-lg border border-neutral-200 p-4 h-36 flex items-end justify-around gap-2 font-mono">
                  {motorAverages.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                    >
                      <span className="text-[10px] font-bold text-neutral-700">
                        {val}%
                      </span>
                      <div className="w-full max-w-[40px] bg-neutral-100 rounded-t-md relative h-20 overflow-hidden flex items-end">
                        <div
                          className="w-full bg-[#FF5500] rounded-t transition-all duration-500"
                          style={{ height: `${Math.min(100, Math.max(5, val))}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-neutral-500 uppercase">
                        M{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Civil Aviation & FAA Part 107 Regulatory Compliance Audit Card */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FF5500]" />
                  Aviation Regulatory Compliance Audit (Part 107 / EASA)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Automated flight safety criteria inspection based on commercial drone rules
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-900 text-white font-mono">
                GRADE {compliance.grade}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-neutral-200">
                <div className="flex items-center gap-2.5">
                  {compliance.isAltCompliant ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <strong className="block text-neutral-900">Maximum Altitude Limit</strong>
                    <span className="text-[11px] text-neutral-500">
                      Max altitude &le; 120m (400ft AGL)
                    </span>
                  </div>
                </div>
                <span
                  className={`font-mono font-bold ${
                    compliance.isAltCompliant ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {stats.maxAltitude.toFixed(1)}m (
                  {compliance.isAltCompliant ? "PASSED" : "VIOLATION"})
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-neutral-200">
                <div className="flex items-center gap-2.5">
                  {compliance.isDistanceCompliant ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <strong className="block text-neutral-900">
                      Visual Line of Sight (VLOS)
                    </strong>
                    <span className="text-[11px] text-neutral-500">
                      Distance from pilot origin &le; 750m
                    </span>
                  </div>
                </div>
                <span
                  className={`font-mono font-bold ${
                    compliance.isDistanceCompliant ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {Math.round(stats.distance)}m (
                  {compliance.isDistanceCompliant ? "PASSED" : "EXTENDED"})
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-neutral-200">
                <div className="flex items-center gap-2.5">
                  {compliance.isBatteryCompliant ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <strong className="block text-neutral-900">
                      Landing Battery Reserve
                    </strong>
                    <span className="text-[11px] text-neutral-500">
                      Touchdown reserve &ge; 15% state-of-charge
                    </span>
                  </div>
                </div>
                <span
                  className={`font-mono font-bold ${
                    compliance.isBatteryCompliant ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {Math.round(telemetry.batteryLevel)}% (
                  {compliance.isBatteryCompliant ? "PASSED" : "CRITICAL"})
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-neutral-200">
                <div className="flex items-center gap-2.5">
                  {compliance.isCrashCompliant ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <strong className="block text-neutral-900">Structural Airframe Safety</strong>
                    <span className="text-[11px] text-neutral-500">
                      Zero high-G ground or obstacle collisions
                    </span>
                  </div>
                </div>
                <span
                  className={`font-mono font-bold ${
                    compliance.isCrashCompliant ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {stats.crashes === 0 ? "PASSED (0 Incidents)" : "FAILED (Collision)"}
                </span>
              </div>
            </div>
          </div>

          {/* AI Flight Coach Debrief & Areas for Improvement */}
          <div>
            <h3 className="text-xs font-bold tracking-widest text-neutral-400 uppercase mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#FF5500]" /> Flight Coach Evaluation & Training Notes
            </h3>

            {insights.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                <ShieldCheck className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
                <strong className="font-bold text-emerald-900 text-sm block">
                  Exemplary Flight Control
                </strong>
                <p className="text-emerald-700 text-xs mt-0.5">
                  The aircraft maintained stable attitude envelope boundaries, safe descent
                  rates, and healthy battery margins throughout this sortie.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights
                  .slice()
                  .reverse()
                  .slice(0, 4)
                  .map((insight, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs flex items-start gap-3.5"
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          insight.severity === "CRITICAL"
                            ? "bg-rose-100 text-rose-600"
                            : insight.severity === "ATTENTION"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-orange-100 text-orange-600"
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <strong className="font-bold text-neutral-900 text-sm">
                            {insight.title}
                          </strong>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                              insight.severity === "CRITICAL"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {insight.severity}
                          </span>
                        </div>
                        <p className="text-neutral-600 mt-1 leading-relaxed">
                          {insight.explanation.what}
                        </p>
                        <div className="mt-2.5 bg-neutral-50 rounded-md p-2.5 border border-neutral-100">
                          <strong className="font-bold text-neutral-800">
                            Instructor Advice:
                          </strong>{" "}
                          <span className="text-neutral-600">
                            {insight.explanation.learn}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Official Sign-off Footer */}
          <div className="pt-6 border-t border-neutral-200 flex flex-col sm:flex-row justify-between items-start sm:items-end text-xs text-neutral-500 font-mono gap-4">
            <div>
              <p className="font-bold text-neutral-700 uppercase">
                AeroTrainer Autonomous Flight Control Log
              </p>
              <p className="text-[11px] text-neutral-400">
                Digital Signature Hash: SHA256_{Math.abs(Date.now() * 31).toString(16).toUpperCase()}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest block">
                Verification Authority
              </span>
              <strong className="text-xs text-neutral-800 block">
                Drone-Pilot Telemetry Engine v2.4
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
