import React from "react";
import { FlightAnalysisReport } from "@/lib/simulation/types";
import { FlightSessionSummary } from "@/lib/simulation/flight-coach-types";
import { Award, AlertTriangle, RotateCcw, Home, Play, CheckCircle2, ChevronRight, Activity, Zap, Wind } from "lucide-react";

interface FlightAnalysisModalProps {
  isOpen: boolean;
  report: FlightAnalysisReport;
  coachSummary?: FlightSessionSummary | null;
  onFlyAgain: () => void;
  onOpenReplay: () => void;
  onExitToDashboard: () => void;
}

export function FlightAnalysisModal({
  isOpen,
  report,
  coachSummary,
  onFlyAgain,
  onOpenReplay,
  onExitToDashboard,
}: FlightAnalysisModalProps) {
  if (!isOpen) return null;

  const isCrash = report.landingQuality === "CRASH";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono select-none">
      <div className="relative w-full max-w-4xl max-h-[90dvh] overflow-y-auto custom-scrollbar bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl p-6 text-white animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div
              className={`h-14 w-14 rounded-xl flex items-center justify-center border ${
                isCrash
                  ? "bg-rose-500/10 border-rose-500/50 text-rose-500"
                  : "bg-emerald-500/10 border-emerald-500/50 text-emerald-500"
              }`}
            >
              {isCrash ? <AlertTriangle className="h-7 w-7" /> : <Award className="h-7 w-7" />}
            </div>
            <div>
              <p className="text-[10px] tracking-[.2em] text-white/50 uppercase">POST-FLIGHT DEBRIEF</p>
              <h2 className="text-xl font-bold tracking-wide uppercase">
                {isCrash ? "CATASTROPHIC HULL LOSS" : "FLIGHT COMPLETED SUCCESSFULLY"}
              </h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          
          {/* Column 1: Core Stats */}
          <div className="space-y-4">
            <h3 className="text-[10px] tracking-[.15em] text-[#FF5500] font-bold uppercase border-b border-white/5 pb-2">FLIGHT METRICS</h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="DURATION" value={`${Math.floor(report.flightDurationSeconds / 60)}m ${Math.floor(report.flightDurationSeconds % 60)}s`} />
              <StatCard label="MAX ALTITUDE" value={`${report.maxAltitudeMeters.toFixed(1)}m`} />
              <StatCard label="MAX SPEED" value={`${report.maxSpeedKmh.toFixed(1)}km/h`} />
              {coachSummary && (
                <>
                  <StatCard label="MAX TILT" value={`${coachSummary.maxAttitudeExcursion.toFixed(1)}°`} />
                  <StatCard label="AVG POWER" value={`${Math.round(coachSummary.averagePowerWatts)}W`} />
                  <StatCard label="PEAK POWER" value={`${Math.round(coachSummary.peakPowerWatts)}W`} />
                </>
              )}
            </div>
            {coachSummary && (
              <>
                <h3 className="text-[10px] tracking-[.15em] text-[#FF5500] font-bold uppercase border-b border-white/5 pb-2 mt-4">ENVIRONMENTAL CONDITIONS</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="WIND" value={`${coachSummary.environmentalConditions.wind.toFixed(1)} m/s`} icon={<Wind className="w-3 h-3 text-white/50"/>} />
                  <StatCard label="TEMPERATURE" value={`${coachSummary.environmentalConditions.temperature.toFixed(0)}°C`} />
                </div>
              </>
            )}
          </div>

          {/* Column 2: Flight Coach Insights */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-[10px] tracking-[.15em] text-[#FF5500] font-bold uppercase border-b border-white/5 pb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" /> FLIGHT COACH ANALYSIS
            </h3>
            
            <div className="space-y-3">
              {coachSummary?.insights.length === 0 ? (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-[11px] text-white/50 uppercase tracking-widest">No coaching insights generated during this flight.</p>
                </div>
              ) : (
                coachSummary?.insights.map((insight, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        insight.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                        insight.severity === 'ATTENTION' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {insight.severity}
                      </span>
                      <h4 className="font-bold text-sm uppercase">{insight.title}</h4>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed"><span className="text-[#FF5500] font-bold">WHAT:</span> {insight.explanation.what}</p>
                    <p className="text-xs text-white/80 leading-relaxed"><span className="text-[#FF5500] font-bold">WHY:</span> {insight.explanation.why}</p>
                    <div className="bg-white/5 p-2 rounded mt-2">
                      <p className="text-xs text-emerald-400 leading-relaxed"><span className="font-bold uppercase">Learning Objective:</span> {insight.explanation.learn}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-wrap gap-3 pt-6 border-t border-white/10">
          <button
            onClick={onFlyAgain}
            className="flex-1 min-w-[200px] flex items-center justify-center gap-2 bg-[#FF5500] hover:bg-[#ff7733] text-white py-3 px-6 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Fly Again
          </button>
          
          <button
            onClick={onOpenReplay}
            className="flex-1 min-w-[200px] flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors"
          >
            <Play className="w-4 h-4" /> Watch Replay
          </button>
          
          <button
            onClick={onExitToDashboard}
            className="flex-1 min-w-[200px] flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white/70 hover:text-white py-3 px-6 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors"
          >
            <Home className="w-4 h-4" /> Exit
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10 flex flex-col justify-center">
      <span className="text-[9px] font-bold text-white/50 tracking-widest uppercase flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="text-sm font-bold text-white mt-1">{value}</span>
    </div>
  );
}
