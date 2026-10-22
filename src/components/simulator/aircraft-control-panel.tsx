"use client";

import React, { useState } from "react";
import { Battery, ChevronDown, ChevronUp, Plane, RotateCcw } from "lucide-react";
import { TelemetryState } from "@/lib/simulation/types";

export interface ManipulationEvent { id: string; type: string; title: string; timestamp: number; }

interface Props {
  droneName: string; telemetry: TelemetryState; motorCount: number; motorOverrides: number[];
  motorHealths: number[]; payloadKg: number; maxPayloadKg: number;
  sensors: { gps: boolean; imu: boolean; baro: boolean; compass: boolean };
  events: ManipulationEvent[]; onMotorOverride: (index: number, percent: number) => void;
  onMotorFailure: (index: number, failed: boolean) => void; onBattery: (percent: number) => void;
  onPayload: (kg: number) => void; onReset: () => void; onExit: () => void;
}

const safe = (v: number, fb = 0) => (Number.isFinite(v) ? v : fb);

export function AircraftControlPanel(props: Props) {
  const [open, setOpen] = useState(false);

  const failedIdx = props.motorHealths.findIndex((h) => h <= 0.01);
  const hasFailedMotor = failedIdx !== -1;
  const isLowBat = props.telemetry.batteryLevel < 20;
  const hasOverride = props.motorOverrides.some((o) => o < 0.99);

  const statusText = hasFailedMotor
    ? `MOTOR ${failedIdx + 1} FAIL`
    : isLowBat
    ? "LOW BATTERY"
    : hasOverride
    ? "LIMITED THRUST"
    : "NOMINAL";

  const statusColor = hasFailedMotor || isLowBat
    ? "text-rose-400"
    : hasOverride
    ? "text-[#FF5500]"
    : "text-neutral-500";

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-16 left-3 z-40 bg-black/70 border border-white/10 p-2 rounded-lg text-[#FF5500] backdrop-blur-md"
        aria-label="Open aircraft controls"
      >
        <Plane className="w-4 h-4" />
      </button>
      {open && (
        <button
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/40"
        />
      )}

      {/* Panel */}
      <aside
        className={`fixed top-20 bottom-24 left-2 z-40 w-72 max-w-[85vw] rounded-xl bg-[#0a0b0d]/70 backdrop-blur-xl border border-white/[0.08] text-white font-mono overflow-y-auto transition-transform shadow-2xl md:relative md:top-auto md:bottom-auto md:left-auto md:inset-auto md:z-auto md:w-full md:max-w-none md:bg-transparent md:backdrop-blur-none md:border-0 md:shadow-none md:rounded-none md:overflow-y-auto ${
          open ? "translate-x-0" : "-translate-x-[110%] md:translate-x-0"
        }`}
      >
        <div className="p-4 flex flex-col gap-4 min-h-full">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] tracking-[.2em] text-neutral-600 uppercase">Aircraft</p>
              <h2 className="text-[11px] font-bold text-white/80 tracking-wider">{props.droneName}</h2>
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${statusColor}`}>
              {statusText}
            </span>
          </div>

          {/* Exit */}
          <button
            onClick={props.onExit}
            className="w-full rounded-lg bg-white/[0.04] hover:bg-white/[0.07] py-2 text-[10px] text-neutral-500 hover:text-neutral-300 tracking-widest uppercase transition-colors"
          >
            ← Exit to Dashboard
          </button>

          {/* Motors */}
          <Section title="MOTORS">
            {Array.from({ length: props.motorCount }).map((_, i) => {
              const override = Math.round((props.motorOverrides[i] ?? 1) * 100);
              const failed = props.motorHealths[i] <= 0.01;
              const output = Math.round((props.telemetry.motorOutputs?.[i] ?? 0) * 100);
              return (
                <div key={i} className="mb-2.5">
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-neutral-500">
                      M{i + 1}
                      {failed ? (
                        <span className="ml-1 text-rose-500">FAIL</span>
                      ) : (
                        <span className="ml-1 text-neutral-600">{output}%</span>
                      )}
                    </span>
                    <span className="text-neutral-400">{override}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="5" value={override}
                    disabled={failed}
                    onChange={(e) => props.onMotorOverride(i, Number(e.target.value))}
                    className="w-full accent-[#FF5500] disabled:opacity-30 h-1"
                  />
                  <button
                    onClick={() => props.onMotorFailure(i, !failed)}
                    className={`mt-0.5 text-[9px] tracking-wider ${failed ? "text-neutral-400" : "text-rose-500/70 hover:text-rose-400"}`}
                  >
                    {failed ? "Restore" : "Fail Motor"}
                  </button>
                </div>
              );
            })}
          </Section>

          {/* Battery */}
          <Section title="BATTERY">
            <div className="flex justify-between text-[10px] mb-1.5">
              <span className="text-neutral-500 flex items-center gap-1">
                <Battery className="w-3 h-3" /> Charge
              </span>
              <b className="text-white/80">{safe(props.telemetry.batteryLevel).toFixed(0)}%</b>
            </div>
            <input
              type="range" min="0" max="100" step="5"
              value={Math.round(safe(props.telemetry.batteryLevel, 100) / 5) * 5}
              onChange={(e) => props.onBattery(Number(e.target.value))}
              className="w-full accent-[#FF5500] h-1"
            />
            <div className="mt-1.5 flex justify-between text-[9px] text-neutral-600">
              <span>{safe(props.telemetry.batteryVoltage ?? 0).toFixed(1)} V</span>
              <span>{safe(props.telemetry.batteryCurrentAmps ?? 0).toFixed(1)} A</span>
              <span>{safe(props.telemetry.batteryPowerWatts ?? 0).toFixed(0)} W</span>
            </div>
          </Section>

          {/* Payload */}
          <Section title="PAYLOAD">
            <div className="flex justify-between text-[10px] mb-1.5">
              <span className="text-neutral-500">Mass</span>
              <b className="text-white/80">{props.payloadKg.toFixed(2)} kg</b>
            </div>
            <input
              type="range" min="0" max={props.maxPayloadKg} step="0.1"
              value={props.payloadKg}
              onChange={(e) => props.onPayload(Number(e.target.value))}
              className="w-full accent-[#FF5500] h-1"
            />
          </Section>

          {/* Systems */}
          <Section title="SYSTEMS">
            {(["GPS", "IMU", "COMPASS", "FLIGHT CTRL"] as const).map((label) => {
              const key = label === "FLIGHT CTRL" ? null : label.toLowerCase() as keyof typeof props.sensors;
              const online = key === null || props.sensors[key];
              return (
                <div key={label} className="flex justify-between py-0.5 text-[9px]">
                  <span className="text-neutral-600">{label}</span>
                  <span className={online ? "text-neutral-400" : "text-rose-500"}>
                    {online ? "OK" : "OFFLINE"}
                  </span>
                </div>
              );
            })}
          </Section>

          {/* Recent Events */}
          {props.events.length > 0 && (
            <Section title="EVENTS">
              {props.events.slice(0, 3).map((ev) => (
                <div key={ev.id} className="mb-0.5 text-[9px] text-neutral-600 flex gap-2">
                  <span className="text-neutral-700 shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span>{ev.title}</span>
                </div>
              ))}
            </Section>
          )}

          {/* Reset */}
          <button
            onClick={props.onReset}
            className="mt-auto flex items-center justify-center gap-2 w-full rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] py-2 text-[9px] font-bold text-neutral-600 hover:text-neutral-400 tracking-widest uppercase transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset Simulation
          </button>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full justify-between items-center text-[9px] font-bold tracking-[.18em] text-neutral-600 hover:text-neutral-500 mb-1.5 uppercase"
      >
        {title}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && <div>{children}</div>}
    </section>
  );
}

