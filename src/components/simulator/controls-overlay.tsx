"use client";

import React, { useState } from "react";
import { Keyboard, ChevronDown, ChevronUp } from "lucide-react";

export function ControlsOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="hidden sm:block absolute top-20 left-3 sm:left-5 z-20 pointer-events-auto select-none font-mono">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 backdrop-blur-md border-2 border-black text-xs font-bold text-neutral-900 shadow-sm hover:bg-neutral-100 transition-all"
      >
        <Keyboard className="h-3.5 w-3.5 text-[#FF5500]" />
        <span>Flight Controls</span>
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {/* Expanded Controls Guide */}
      {isOpen && (
        <div className="mt-2 w-64 p-3.5 rounded-xl bg-white/95 backdrop-blur-md border-2 border-black shadow-lg text-xs space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="border-b border-neutral-200 pb-1.5 flex justify-between items-center">
            <span className="font-heading font-bold text-neutral-900 uppercase">Control Scheme</span>
            <span className="text-[10px] text-[#FF5500] font-semibold">Beginner Mode</span>
          </div>

          <div className="space-y-1.5 text-neutral-700">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Forward / Back</span>
              <span className="font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">W / S</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Roll Left / Right</span>
              <span className="font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">A / D</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Throttle Up (Climb)</span>
              <span className="font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">SPACE</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Throttle Down (Descend)</span>
              <span className="font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">SHIFT / C</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Yaw Rotate Left / Right</span>
              <span className="font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">Q / E</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Toggle Hover Assist</span>
              <span className="font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">H</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Toggle Camera View</span>
              <span className="font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">V</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Reset to Helipad</span>
              <span className="font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">R</span>
            </div>
          </div>

          <p className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-100">
            Tip: Click & drag mouse in 3D viewport to orbit camera 360°.
          </p>
        </div>
      )}
    </div>
  );
}