"use client";

import React, { useState, useEffect } from "react";
import { ReplayFrame } from "@/lib/simulation/types";
import { Play, Pause, RotateCcw, X } from "lucide-react";

interface FlightReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: ReplayFrame[];
}

export function FlightReplayModal({ isOpen, onClose, frames }: FlightReplayModalProps) {
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const totalFrames = frames.length;
  const currentFrame = frames[currentFrameIdx] || frames[0];
  const maxTime = totalFrames > 0 ? frames[totalFrames - 1].timeSeconds : 0;

  useEffect(() => {
    if (!isOpen || !isPlaying || totalFrames === 0) return;

    const intervalMs = 50 / playbackSpeed;
    const timer = setInterval(() => {
      setCurrentFrameIdx((prev) => {
        if (prev >= totalFrames - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, playbackSpeed, totalFrames]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs font-mono select-none">
      <div className="relative w-full max-w-xl max-h-[95dvh] overflow-y-auto custom-scrollbar bg-white border-2 border-black rounded-2xl shadow-2xl p-4 sm:p-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-orange-100 border border-[#FF5500] flex items-center justify-center text-[#FF5500]">
              <Play className="h-3.5 w-3.5 fill-current" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-black text-neutral-900 uppercase">
                FLIGHT RECORDER REPLAY
              </h3>
              <p className="text-[10px] text-neutral-500">20Hz Synchronous Telemetry Stream</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 my-4 bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-center">
          <div>
            <span className="text-[9px] text-neutral-500 font-bold block">TIME</span>
            <span className="text-xs font-black text-neutral-900">
              {currentFrame ? currentFrame.timeSeconds.toFixed(1) : 0}s
            </span>
          </div>
          <div>
            <span className="text-[9px] text-neutral-500 font-bold block">ALTITUDE</span>
            <span className="text-xs font-black text-neutral-900">
              {currentFrame ? currentFrame.altitudeAgl.toFixed(1) : 0}m
            </span>
          </div>
          <div>
            <span className="text-[9px] text-neutral-500 font-bold block">SPEED</span>
            <span className="text-xs font-black text-neutral-900">
              {currentFrame ? currentFrame.groundSpeedKmh.toFixed(1) : 0} km/h
            </span>
          </div>
          <div>
            <span className="text-[9px] text-neutral-500 font-bold block">BATTERY</span>
            <span className="text-xs font-black text-neutral-900">
              {currentFrame ? currentFrame.batteryLevel : 100}%
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={Math.max(0, totalFrames - 1)}
            value={currentFrameIdx}
            onChange={(e) => {
              setCurrentFrameIdx(parseInt(e.target.value));
              setIsPlaying(false);
            }}
            className="w-full accent-[#FF5500] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-bold">
            <span>0.0s</span>
            <span>{maxTime.toFixed(1)}s TOTAL</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-1.5 rounded-xl bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>

            <button
              onClick={() => {
                setCurrentFrameIdx(0);
                setIsPlaying(true);
              }}
              className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
              title="Restart"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
            {[0.5, 1.0, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={"px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer " + (
                  playbackSpeed === s
                    ? "bg-white text-neutral-950 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
