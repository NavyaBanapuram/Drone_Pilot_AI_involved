"use client";

import React from "react";
import {
  DroneDigitalTwinConfiguration,
  FrameMaterial,
  LandingGearType,
} from "@/types/drone-digital-twin";
import { ParameterField } from "../parameter-field";
import {
  calculateMassProperties,
  calculatePerformanceEnvelope,
} from "@/lib/digital-twin/mass-calculator";

interface ConfigAirframeTabProps {
  config: DroneDigitalTwinConfiguration;
  onChange: (updated: DroneDigitalTwinConfiguration) => void;
}

export function ConfigAirframeTab({ config, onChange }: ConfigAirframeTabProps) {
  const { airframe } = config;

  const updateAirframe = (field: string, val: any) => {
    const updatedAirframe = {
      ...airframe,
      [field]: val,
    };

    const draft = {
      ...config,
      airframe: updatedAirframe,
    };

    const massProps = calculateMassProperties(draft);
    const perf = calculatePerformanceEnvelope(draft, massProps);

    onChange({
      ...draft,
      massProperties: massProps,
      performance: perf,
    });
  };

  const materials: Array<{ label: string; value: FrameMaterial }> = [
    { label: "High-Modulus Carbon Fiber (Lightweight & Rigid)", value: "Carbon Fiber" },
    { label: "CNC Anodized 6061-T6 Aluminum (Durable)", value: "Aerospace Aluminum" },
    { label: "Injection-Molded Engineered Polymer (High Impact)", value: "Engineered Polymer" },
  ];

  const landingGears: Array<{ label: string; value: LandingGearType }> = [
    { label: "Motor-Integrated Angled Struts (Compact)", value: "Motor-Integrated Struts" },
    { label: "Wide Carbon Fixed Skid (Stable Ground Clearance)", value: "Fixed Skid" },
    { label: "Servo-Driven Retractable Landing Gear (360° Camera View)", value: "Retractable Struts" },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4 mb-6">
        <h3 className="text-base font-heading font-bold text-white uppercase">
          STRUCTURAL AIRFRAME & GEOMETRY
        </h3>
        <p className="text-xs text-neutral-400">
          Configure structural chassis dimensions, structural composite materials, and payload capacity.
        </p>
      </div>

      <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-4">
        <ParameterField
          id="frame-material"
          label="Chassis Material"
          type="select"
          value={airframe.frameMaterial}
          options={materials}
          onChange={(v) => updateAirframe("frameMaterial", v)}
        />

        <ParameterField
          id="landing-gear"
          label="Landing Gear Architecture"
          type="select"
          value={airframe.landingGearType}
          options={landingGears}
          onChange={(v) => updateAirframe("landingGearType", v)}
        />

        <ParameterField
          id="dry-mass"
          label="Airframe Dry Mass"
          unit="kg"
          tooltipKey="dryMass"
          value={airframe.dryMassKg}
          min={0.5}
          max={25.0}
          step={0.05}
          onChange={(v) => updateAirframe("dryMassKg", v)}
          helperText="Bare airframe including motors and electronics, excluding battery and payload."
        />

        <ParameterField
          id="max-payload"
          label="Maximum Structural Payload"
          unit="kg"
          tooltipKey="payloadMass"
          value={airframe.maxPayloadKg}
          min={0.1}
          max={30.0}
          step={0.1}
          onChange={(v) => updateAirframe("maxPayloadKg", v)}
          helperText="Maximum equipment mass the frame can safely bear before structural deflection."
        />

        <ParameterField
          id="frame-diagonal"
          label="Wheelbase Diagonal"
          unit="mm"
          value={airframe.frameDiagonalMm}
          min={250}
          max={1800}
          step={10}
          onChange={(v) => updateAirframe("frameDiagonalMm", v)}
          helperText="Distance from opposing motor centers across the diagonal axis."
        />

        <ParameterField
          id="arm-length"
          label="Boom Arm Length"
          unit="m"
          value={airframe.armLengthMeters}
          min={0.15}
          max={1.0}
          step={0.01}
          onChange={(v) => updateAirframe("armLengthMeters", v)}
          helperText="Radial distance from central fuselage to motor nacelle."
        />
      </div>

      {/* Dimensions Callout Box */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
        <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 tracking-wider">
          FUSELAGE BOUNDING DIMENSIONS (L × W × H)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <ParameterField
            id="dim-l"
            label="Length"
            unit="m"
            value={airframe.dimensions.lengthM}
            min={0.2}
            max={2.5}
            step={0.02}
            onChange={(v) =>
              updateAirframe("dimensions", { ...airframe.dimensions, lengthM: v })
            }
          />
          <ParameterField
            id="dim-w"
            label="Width"
            unit="m"
            value={airframe.dimensions.widthM}
            min={0.2}
            max={2.5}
            step={0.02}
            onChange={(v) =>
              updateAirframe("dimensions", { ...airframe.dimensions, widthM: v })
            }
          />
          <ParameterField
            id="dim-h"
            label="Height"
            unit="m"
            value={airframe.dimensions.heightM}
            min={0.1}
            max={1.2}
            step={0.02}
            onChange={(v) =>
              updateAirframe("dimensions", { ...airframe.dimensions, heightM: v })
            }
          />
        </div>
      </div>
    </div>
  );
}
