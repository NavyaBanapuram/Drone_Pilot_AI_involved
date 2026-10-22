"use client";

import React from "react";
import { SCENARIO_CATALOG } from "@/lib/simulation/scenario-catalog";
import { TrainingScenarioDef } from "@/lib/simulation/scenario-types";
import {
  X,
  BookOpen,
  ChevronRight,
  Play
} from "lucide-react";

interface ScenarioSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenario: TrainingScenarioDef) => void;
  activeScenarioId?: string;
}

export function ScenarioSelectorModal({
  isOpen,
  onClose,
  onSelectScenario,
  activeScenarioId,
}: ScenarioSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono select-none">
      <div className="w-full max-w-3xl bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3 text-white">
            <BookOpen className="w-5 h-5 text-[#FF5500]" />
            <h2 className="font-bold tracking-wide uppercase text-sm">Educational Training Catalog</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white/50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
          {SCENARIO_CATALOG.map((scenario) => {
            const isActive = scenario.id === activeScenarioId;

            return (
              <div
                key={scenario.id}
                className={`flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border transition-all ${
                  isActive 
                    ? "bg-[#FF5500]/10 border-[#FF5500]/50" 
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white uppercase text-sm">{scenario.title}</h3>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">{scenario.description}</p>
                  <p className="text-[10px] text-emerald-400/80 font-bold tracking-widest uppercase">
                    OBJ: {scenario.learningObjective}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-stretch gap-2">
                  <button
                    onClick={() => onSelectScenario(scenario)}
                    className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded font-bold uppercase tracking-widest text-xs transition-colors ${
                      isActive
                        ? "bg-[#FF5500] hover:bg-[#ff7733] text-white"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    {isActive ? "Restart" : "Load Scenario"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
