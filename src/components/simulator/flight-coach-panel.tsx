"use client";

import React, { useEffect, useState } from "react";
import { FlightCoachInsight } from "@/lib/simulation/flight-coach-types";
import { X, AlertCircle, Info, ShieldAlert, Zap } from "lucide-react";

interface FlightCoachPanelProps {
  insight: FlightCoachInsight | null;
  history?: FlightCoachInsight[];
  onDismiss: () => void;
  onClearHistory?: () => void;
}

export function FlightCoachPanel({ insight, onDismiss }: FlightCoachPanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (insight) {
      setVisible(true);
      // Auto-hide after 15 seconds to stay out of the way
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300); // Wait for fade out
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [insight?.id]);

  if (!insight) return null;

  const getIcon = () => {
    switch (insight.severity) {
      case "CRITICAL": return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case "ATTENTION":  return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "OBSERVATION":  return <Zap className="w-4 h-4 text-emerald-500" />;
      default:         return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl transition-all duration-500 ease-out pointer-events-none ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
      <div className="pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3 shadow-2xl flex items-start gap-4">
        {/* Icon Badge */}
        <div className="mt-1 p-2 rounded-full bg-white/[0.04] shrink-0">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-1.5 pt-1 min-w-[280px]">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-bold text-white tracking-widest uppercase font-mono">
              {insight.title}
            </h3>
            <button onClick={() => setVisible(false)} className="text-white/40 hover:text-white/80 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <p className="text-sm text-white font-mono leading-relaxed pr-4 py-1">
            {insight.explanation.what} {insight.explanation.why}
          </p>
          
          {/* Subtle Objective */}
          <div className="mt-1 pt-2 border-t border-white/[0.06] flex items-center gap-2 text-[#FF5500]">
            <Zap className="w-3 h-3" />
            <span className="text-sm font-bold uppercase tracking-widest font-mono">
              Action: {insight.explanation.learn}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}





