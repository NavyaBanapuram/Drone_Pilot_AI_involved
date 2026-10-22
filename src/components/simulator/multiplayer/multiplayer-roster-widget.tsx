import React, { useState, useEffect, useRef } from "react";
import { RemotePlayerState } from "@/lib/multiplayer/multiplayer-types";
import { Users, Wifi, X } from "lucide-react";

interface MultiplayerRosterWidgetProps {
  players: RemotePlayerState[];
  myCallsign: string;
  className?: string;
}

export function MultiplayerRosterWidget({ players, myCallsign, className }: MultiplayerRosterWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative font-mono select-none pointer-events-auto ${className || ""}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border-2 border-black shadow-sm text-xs font-bold text-neutral-800 hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer"
        title="Toggle Active Airspace Pilots Roster"
      >
        <Users className="h-3.5 w-3.5 text-[#FF5500]" />
        <span>AIRSPACE: {players.length + 1} PILOT{players.length > 0 ? "S" : ""}</span>
        <Wifi className="h-3 w-3 text-emerald-600 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border-2 border-black rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
          <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200 mb-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              ACTIVE SESSION PILOTS
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-black p-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-orange-50 border border-orange-200 text-xs">
              <span className="font-bold text-[#FF5500]">{myCallsign} (YOU)</span>
              <span className="text-[10px] bg-white px-1 rounded border border-orange-300 font-mono">LOCAL</span>
            </div>

            {players.map((p) => (
              <div
                key={p.playerId}
                className="flex items-center justify-between p-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs"
              >
                <span className="font-bold text-neutral-800">{p.callsign}</span>
                <span className="text-[10px] text-neutral-500">{p.flightMode}</span>
              </div>
            ))}

            {players.length === 0 && (
              <p className="text-[10px] text-neutral-400 py-1 text-center">
                No other pilots in local sector.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
