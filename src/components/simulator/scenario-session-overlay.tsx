import React from "react";
import { TrainingScenarioDef, ScenarioSessionState, ObjectiveResult } from "@/lib/simulation/scenario-types";
import { Play, RotateCcw, Home, CheckCircle2, AlertTriangle, XCircle, Info, Activity, Clock } from "lucide-react";

interface Props {
  scenario: TrainingScenarioDef | null;
  session: ScenarioSessionState | null;
  onStart: () => void;
  onClose: () => void;
  onReset: () => void;
}

export function ScenarioSessionOverlay({ scenario, session, onStart, onClose, onReset }: Props) {
  if (!scenario) return null;

  // 1. BRIEFING UI (Before Start)
  if (!session || session.state === "IDLE" || session.state === "BRIEFING" || session.state === "READY") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md font-mono select-none p-4">
        <div className="w-full max-w-lg bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl p-6 text-white animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
            <div className="w-2 h-8 bg-[#FF5500] rounded" />
            <div>
              <p className="text-[10px] text-white/50 tracking-[.2em] uppercase font-bold">SCENARIO BRIEFING</p>
              <h2 className="text-xl font-bold uppercase tracking-widest">{scenario.title}</h2>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-[#FF5500] font-bold tracking-widest mb-2 text-[10px] uppercase">WHAT YOU WILL LEARN</h3>
              <p className="text-white/90 leading-relaxed text-sm bg-white/5 p-3 rounded border border-white/5">{scenario.learningObjective}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-[#FF5500] font-bold tracking-widest mb-2 text-[10px] uppercase">INITIAL CONDITIONS</h3>
                <p className="text-white/70 text-xs leading-relaxed">{scenario.briefing.initialConditions}</p>
              </div>
              <div>
                <h3 className="text-[#FF5500] font-bold tracking-widest mb-2 text-[10px] uppercase">AVAILABLE CONTROLS</h3>
                <p className="text-white/70 text-xs leading-relaxed">{scenario.briefing.availableControls}</p>
              </div>
            </div>

            <div>
              <h3 className="text-[#FF5500] font-bold tracking-widest mb-2 text-[10px] uppercase">OBJECTIVES</h3>
              <ul className="space-y-2">
                {scenario.objectives.map(obj => (
                  <li key={obj.id} className="flex gap-2 text-xs">
                    <span className="text-white/30">&gt;</span>
                    <span className="text-white/80">{obj.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex gap-3 mt-8 pt-4 border-t border-white/10">
            <button onClick={onClose} className="flex-1 py-3 px-4 rounded bg-white/5 hover:bg-white/10 transition-colors uppercase tracking-widest text-[10px] font-bold">Cancel</button>
            <button onClick={onStart} className="flex-1 py-3 px-4 rounded bg-[#FF5500] hover:bg-[#ff7733] transition-colors uppercase tracking-widest text-[10px] font-bold flex justify-center items-center gap-2">
              <Play className="w-4 h-4" /> Start Scenario
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. DEBRIEF UI (Completed or Failed)
  if (session.state === "COMPLETED" || session.state === "NOT_MET" || session.state === "ABORTED") {
    const isSuccess = session.state === "COMPLETED";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md font-mono select-none p-4">
        <div className="w-full max-w-3xl bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl p-6 text-white animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
          
          <div className="flex items-start justify-between pb-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-xl flex items-center justify-center border ${
                  isSuccess ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" : "bg-rose-500/10 border-rose-500/50 text-rose-500"
                }`}>
                {isSuccess ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
              </div>
              <div>
                <p className="text-[10px] tracking-[.2em] text-white/50 uppercase font-bold">SCENARIO DEBRIEF</p>
                <h2 className="text-xl font-bold tracking-wide uppercase">
                  {isSuccess ? "OBJECTIVES MET" : "OBJECTIVES NOT MET"}
                </h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-[.2em] text-white/50 uppercase font-bold">DURATION</p>
              <p className="text-lg font-bold font-mono">{session.elapsedTime.toFixed(1)}s</p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-[10px] tracking-[.15em] text-[#FF5500] font-bold uppercase border-b border-white/5 pb-2 mb-3">OBJECTIVE EVALUATIONS</h3>
              <div className="space-y-3">
                {scenario.objectives.map(obj => {
                  const res = session.results[obj.id];
                  const resSuccess = res?.status === "COMPLETED";
                  return (
                    <div key={obj.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold uppercase">{obj.title}</span>
                        <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded ${
                          resSuccess ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                        }`}>{res?.status || "UNKNOWN"}</span>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed">{res?.explanation || obj.description}</p>
                      
                      {res?.evidence && res.evidence.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-white/10">
                          <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase mb-1">RECORDED EVIDENCE</p>
                          {res.evidence.map((ev, i) => <p key={i} className="text-xs text-white/80 font-mono">{ev}</p>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] tracking-[.15em] text-[#FF5500] font-bold uppercase border-b border-white/5 pb-2 mb-3">EDUCATIONAL TAKEAWAY</h3>
              <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                <ul className="space-y-2">
                  {scenario.debriefTopics.map((topic, i) => (
                    <li key={i} className="text-sm text-emerald-400/90 leading-relaxed flex items-start gap-2">
                      <span className="text-emerald-500/50 mt-1">&gt;</span> {topic}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8 pt-6 border-t border-white/10">
            <button onClick={onClose} className="flex-1 py-3 rounded border border-white/20 hover:bg-white/5 transition-colors uppercase tracking-widest text-xs font-bold flex justify-center items-center gap-2 text-white/70 hover:text-white">
              <Home className="w-4 h-4" /> End Training
            </button>
            <button onClick={onReset} className="flex-1 py-3 rounded bg-[#FF5500] hover:bg-[#ff7733] transition-colors uppercase tracking-widest text-xs font-bold flex justify-center items-center gap-2 text-white">
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. HUD (Active)
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none font-mono flex flex-col items-center gap-2 w-full max-w-xl px-4">
      <div className="bg-neutral-950/90 backdrop-blur border border-white/10 rounded-xl p-3 w-full shadow-2xl flex items-center justify-between pointer-events-auto animate-in slide-in-from-top-4">
        <div>
          <p className="text-[9px] text-[#FF5500] font-bold tracking-widest uppercase">TRAINING SCENARIO</p>
          <h2 className="text-sm text-white font-bold uppercase">{scenario.title}</h2>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-white/50 font-bold tracking-widest uppercase">T+</p>
          <p className="text-sm text-white font-bold font-mono">{session.elapsedTime.toFixed(1)}s</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 w-full pointer-events-auto">
        {scenario.objectives.map(obj => {
          const res = session.results[obj.id];
          const isDone = res?.status === "COMPLETED";
          const isFailed = res?.status === "NOT_MET";
          return (
            <div key={obj.id} className={`p-2 px-3 rounded flex items-center justify-between border ${
              isDone ? "bg-emerald-500/10 border-emerald-500/30" :
              isFailed ? "bg-rose-500/10 border-rose-500/30" :
              "bg-black/60 border-white/10"
            }`}>
              <div className="flex items-center gap-2">
                {isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> :
                 isFailed ? <XCircle className="w-3 h-3 text-rose-500" /> :
                 <Activity className="w-3 h-3 text-white/30" />}
                <span className={`text-[10px] uppercase font-bold ${
                  isDone ? "text-emerald-400" :
                  isFailed ? "text-rose-400" :
                  "text-white/70"
                }`}>{obj.title}</span>
              </div>
              <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">
                {res?.observedValue || "-"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
