"use client";

import React, { useState } from "react";
import {
  DroneDigitalTwinConfiguration,
  IndividualMotorConfig,
  PropellerMaterial,
} from "@/types/drone-digital-twin";
import { ParameterField } from "../parameter-field";
import {
  calculateMassProperties,
  calculatePerformanceEnvelope,
} from "@/lib/digital-twin/mass-calculator";
import { Zap, RotateCw, RotateCcw, AlertCircle, Activity } from "lucide-react";

interface ConfigPropulsionTabProps {
  config: DroneDigitalTwinConfiguration;
  onChange: (updated: DroneDigitalTwinConfiguration) => void;
}

export function ConfigPropulsionTab({ config, onChange }: ConfigPropulsionTabProps) {
  const { motors, propeller, esc } = config;
  const [selectedMotorIdx, setSelectedMotorIdx] = useState<number>(0);

  const updateGlobalMotorRpm = (field: "nominalRpm" | "maxRpm", val: number) => {
    const updatedMotors = motors.map((m) => ({
      ...m,
      [field]: val,
    }));

    const draft = {
      ...config,
      motors: updatedMotors,
    };
    const massProps = calculateMassProperties(draft);
    const perf = calculatePerformanceEnvelope(draft, massProps);

    onChange({
      ...draft,
      massProperties: massProps,
      performance: perf,
    });
  };

  const updateIndividualMotor = (idx: number, updates: Partial<IndividualMotorConfig>) => {
    const updatedMotors = [...motors];
    updatedMotors[idx] = {
      ...updatedMotors[idx],
      ...updates,
    };

    const draft = {
      ...config,
      motors: updatedMotors,
    };
    const massProps = calculateMassProperties(draft);
    const perf = calculatePerformanceEnvelope(draft, massProps);

    onChange({
      ...draft,
      massProperties: massProps,
      performance: perf,
    });
  };

  const updatePropeller = (field: string, val: any) => {
    const updatedProp = {
      ...propeller,
      [field]: val,
    };
    const draft = {
      ...config,
      propeller: updatedProp,
    };
    const massProps = calculateMassProperties(draft);
    const perf = calculatePerformanceEnvelope(draft, massProps);

    onChange({
      ...draft,
      massProperties: massProps,
      performance: perf,
    });
  };

  const updateEsc = (field: string, val: any) => {
    onChange({
      ...config,
      esc: {
        ...esc,
        [field]: val,
      },
    });
  };

  const propMaterials: Array<{ label: string; value: PropellerMaterial }> = [
    { label: "High-Rigidity Carbon Fiber Composite", value: "Carbon Fiber Composite" },
    { label: "Impact-Resistant Polycarbonate", value: "Reinforced Polycarbonate" },
    { label: "Durable Molded Nylon", value: "Molded Nylon" },
  ];

  const activeMotor = motors[selectedMotorIdx] || motors[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 mb-6">
        <h3 className="text-base font-heading font-bold text-white uppercase">
          PROPULSION ARCHITECTURE: MOTORS, PROPELLERS & ESCS
        </h3>
        <p className="text-xs text-neutral-400">
          Configure individual motor parameters, aerodynamic propeller disk geometry, and speed controllers.
        </p>
      </div>

      {/* EDUCATIONAL CALLOUT: Distinguishing Configuration vs Live Simulation */}
      <div className="p-4 rounded-xl bg-[#FF5500]/10 border border-[#FF5500]/20 text-white text-xs flex items-start gap-3">
        <Activity className="h-5 w-5 text-[#FF5500] shrink-0 mt-0.5" />
        <div>
          <p className="font-bold uppercase tracking-wider text-[11px] text-[#FF5500]">
            Aeronautical Concept: Static Configuration vs. Live Simulation State
          </p>
          <p className="mt-1 leading-relaxed text-neutral-300">
            The values configured below define the <strong>Aircraft Limits & Specifications</strong> (e.g. Max RPM = {activeMotor.maxRpm}).
            In the 3D simulator, the <strong>Live Flight Telemetry</strong> will dynamically fluctuate (e.g. Current Hover RPM ≈ {Math.round(activeMotor.nominalRpm * 0.95)} RPM) based on throttle commands, wind forces, and battery voltage sag.
          </p>
        </div>
      </div>

      {/* SECTION 1: GLOBAL MOTOR PARAMETERS */}
      <div className="space-y-3">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF5500]">
          GLOBAL MOTOR TUNING (ALL {motors.length} MOTORS)
        </span>
        <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-8">
          <ParameterField
            id="nominal-rpm"
            label="Nominal Hover RPM"
            unit="RPM"
            tooltipKey="nominalRpm"
            value={motors[0]?.nominalRpm ?? 8500}
            min={3000}
            max={25000}
            step={250}
            onChange={(v) => updateGlobalMotorRpm("nominalRpm", v)}
            helperText="Expected rotational velocity required for level hover."
          />

          <ParameterField
            id="max-rpm"
            label="Configured Maximum RPM"
            unit="RPM"
            tooltipKey="maxRpm"
            value={motors[0]?.maxRpm ?? 12000}
            min={4000}
            max={35000}
            step={250}
            onChange={(v) => updateGlobalMotorRpm("maxRpm", v)}
            helperText="Hardware rotational ceiling under 100% full throttle."
          />

          <ParameterField
            id="kv-rating"
            label="Stator KV Rating"
            unit="RPM/V"
            tooltipKey="kvRating"
            value={motors[0]?.kvRating ?? 920}
            min={200}
            max={3500}
            step={20}
            onChange={(v) => {
              const updated = motors.map((m) => ({ ...m, kvRating: v }));
              onChange({ ...config, motors: updated });
            }}
            helperText="Theoretical unloaded RPM per applied volt."
          />
        </div>
      </div>

      {/* SECTION 2: INDIVIDUAL MOTOR INSPECTOR & CONTROLS */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4 mb-6">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 tracking-wider">
              INDIVIDUAL MOTOR ARRAY INSPECTOR
            </span>
            <p className="text-xs text-neutral-400">
              Inspect and configure position and rotational polarity for each motor.
            </p>
          </div>

          {/* Motor Selector Tabs */}
          <div className="flex flex-wrap gap-1">
            {motors.map((m, idx) => (
              <button
                key={m.motorId}
                type="button"
                onClick={() => setSelectedMotorIdx(idx)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
                  selectedMotorIdx === idx
                    ? "bg-black/50 text-white border-[#FF5500] shadow-sm"
                    : "bg-transparent text-neutral-400 border-white/10 hover:bg-transparent/5"
                }`}
              >
                {m.motorId}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Motor Detail Panel */}
        {activeMotor && (
          <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 gap-6">
            <div>
              <span className="text-[10px] font-mono uppercase text-neutral-400">Motor ID</span>
              <p className="text-sm font-mono font-bold text-white mt-0.5">
                {activeMotor.motorId}
              </p>
              <span className="text-[10px] text-neutral-400">
                Pos: ({activeMotor.position.x}, {activeMotor.position.z})
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-neutral-400">Rotation Polarity</span>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() =>
                    updateIndividualMotor(selectedMotorIdx, {
                      direction: activeMotor.direction === 1 ? -1 : 1,
                    })
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-semibold bg-white/10 hover:bg-white/10 text-neutral-300 border border-white/10 transition-colors"
                >
                  {activeMotor.direction === 1 ? (
                    <>
                      <RotateCw className="h-3 w-3 text-emerald-600" />
                      <span>Clockwise (CW)</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3 w-3 text-amber-600" />
                      <span>Counter-CW (CCW)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-neutral-400">Configured Max Power</span>
              <p className="text-sm font-mono font-bold text-white mt-0.5">
                {activeMotor.maxPowerWatts} W
              </p>
              <span className="text-[10px] text-neutral-400">
                Efficiency: {activeMotor.efficiencyPercent}%
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-neutral-400">Operational Health</span>
              <p className="text-sm font-mono font-bold text-emerald-600 mt-0.5">
                {activeMotor.status}
              </p>
              <span className="text-[10px] text-neutral-400">Hardware Ready</span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: PROPELLERS */}
      <div className="space-y-3 pt-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF5500]">
          AERODYNAMIC PROPELLER GEOMETRY
        </span>
        <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-8">
          <ParameterField
            id="prop-diameter"
            label="Propeller Diameter"
            unit="inches"
            tooltipKey="propDiameter"
            value={propeller.diameterInches}
            min={5.0}
            max={32.0}
            step={0.5}
            onChange={(v) => updatePropeller("diameterInches", v)}
            helperText="Blade tip circle diameter."
          />

          <ParameterField
            id="prop-pitch"
            label="Propeller Pitch"
            unit="inches"
            tooltipKey="propPitch"
            value={propeller.pitchInches}
            min={2.5}
            max={14.0}
            step={0.2}
            onChange={(v) => updatePropeller("pitchInches", v)}
            helperText="Theoretical distance traversed per revolution."
          />

          <ParameterField
            id="prop-blades"
            label="Blade Count"
            tooltipKey="bladeCount"
            value={propeller.bladeCount}
            min={2}
            max={4}
            step={1}
            onChange={(v) => updatePropeller("bladeCount", v)}
            helperText="2-blade (highest efficiency) or 3-blade (smoother)."
          />

          <ParameterField
            id="prop-material"
            label="Blade Material"
            type="select"
            value={propeller.material}
            options={propMaterials}
            onChange={(v) => updatePropeller("material", v)}
          />

          <ParameterField
            id="prop-mass"
            label="Individual Prop Mass"
            unit="g"
            value={propeller.massGrams}
            min={5}
            max={150}
            step={1}
            onChange={(v) => updatePropeller("massGrams", v)}
          />
        </div>
      </div>

      {/* SECTION 4: ELECTRONIC SPEED CONTROLLERS (ESC) */}
      <div className="space-y-3 pt-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF5500]">
          ELECTRONIC SPEED CONTROLLER (ESC) POWER STAGE
        </span>
        <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-8">
          <ParameterField
            id="esc-rated"
            label="Rated Continuous Current"
            unit="Amps"
            value={esc.ratedCurrentAmps}
            min={10}
            max={120}
            step={5}
            onChange={(v) => updateEsc("ratedCurrentAmps", v)}
            helperText="Maximum continuous electrical current per motor channel."
          />

          <ParameterField
            id="esc-burst"
            label="Burst Current Limit (10s)"
            unit="Amps"
            value={esc.burstCurrentAmps}
            min={15}
            max={160}
            step={5}
            onChange={(v) => updateEsc("burstCurrentAmps", v)}
            helperText="Peak current allowed during punch-out maneuvers."
          />

          <ParameterField
            id="esc-protocol"
            label="Telemetry Protocol"
            type="select"
            value={esc.protocol}
            options={[
              { label: "DShot600 (Digital 600kbit/s)", value: "DShot600" },
              { label: "DShot300 (Digital 300kbit/s)", value: "DShot300" },
              { label: "PWM (Analog Pulse)", value: "PWM" },
              { label: "CAN Bus (Industrial Telemetry)", value: "CAN" },
            ]}
            onChange={(v) => updateEsc("protocol", v)}
          />
        </div>
      </div>
    </div>
  );
}
