"use client";

import React from "react";
import {
  DroneDigitalTwinConfiguration,
  DroneApplication,
  DroneCategory,
} from "@/types/drone-digital-twin";
import { ParameterField } from "../parameter-field";

interface ConfigIdentityTabProps {
  config: DroneDigitalTwinConfiguration;
  onChange: (updated: DroneDigitalTwinConfiguration) => void;
}

export function ConfigIdentityTab({ config, onChange }: ConfigIdentityTabProps) {
  const { identity } = config;

  const updateIdentity = (field: string, val: any) => {
    onChange({
      ...config,
      identity: {
        ...identity,
        [field]: val,
      },
    });
  };

  const applications: Array<{ label: string; value: DroneApplication }> = [
    { label: "Training & Instruction", value: "Training" },
    { label: "Agricultural & Crop Care", value: "Agricultural" },
    { label: "Survey & Topography", value: "Survey" },
    { label: "Industrial Infrastructure Inspection", value: "Inspection" },
    { label: "Aerial Photogrammetry & Mapping", value: "Mapping" },
    { label: "Cinema & Aerial Photography", value: "Photography" },
    { label: "General Multirotor Research", value: "General Multirotor" },
  ];

  const categories: Array<{ label: string; value: DroneCategory }> = [
    { label: "Quadcopter (4 Rotors)", value: "quadcopter" },
    { label: "Hexacopter (6 Rotors)", value: "hexacopter" },
    { label: "Octacopter (8 Rotors)", value: "octacopter" },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4 mb-6">
        <h3 className="text-base font-heading font-bold text-white uppercase">
          AIRCRAFT IDENTITY & DESIGNATION
        </h3>
        <p className="text-xs text-neutral-400">
          Define unique registration details, mission category, and configuration version.
        </p>
      </div>

      <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-4">
        <ParameterField
          id="drone-name"
          label="Aircraft Designation / Name"
          type="text"
          value={identity.name}
          onChange={(v) => updateIdentity("name", v)}
          helperText="Display name used across telemetry HUD and flight logs."
        />

        <ParameterField
          id="drone-model"
          label="Model / Serial Code"
          type="text"
          value={identity.modelName}
          onChange={(v) => updateIdentity("modelName", v)}
          helperText="Engineering platform identifier."
        />

        <ParameterField
          id="drone-app"
          label="Primary Mission Application"
          type="select"
          value={identity.application}
          options={applications}
          onChange={(v) => updateIdentity("application", v)}
        />

        <ParameterField
          id="drone-cat"
          label="Airframe Class"
          type="select"
          value={identity.category}
          options={categories}
          onChange={(v) => {
            // Updating category also syncs airframe motor count
            const newCount = v === "octacopter" ? 8 : v === "hexacopter" ? 6 : 4;
            onChange({
              ...config,
              identity: { ...identity, category: v },
              airframe: { ...config.airframe, frameType: v, motorCount: newCount },
            });
          }}
        />

        <ParameterField
          id="drone-mfg"
          label="Manufacturer / Lab"
          type="text"
          value={identity.manufacturer || "AeroAviation Systems"}
          onChange={(v) => updateIdentity("manufacturer", v)}
        />

        <ParameterField
          id="drone-version"
          label="Configuration Version"
          type="text"
          value={identity.configurationVersion}
          disabled
          onChange={() => {}}
          helperText="Standard specification version for migration compatibility."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="drone-desc"
          className="text-xs font-semibold text-neutral-300 uppercase tracking-wider"
        >
          Operational Mission Description
        </label>
        <textarea
          id="drone-desc"
          rows={3}
          value={identity.description}
          onChange={(e) => updateIdentity("description", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-white/10 bg-transparent text-xs font-medium text-white focus:outline-hidden focus:ring-2 focus:ring-[#FF5500] focus:border-transparent transition-all"
        />
      </div>
    </div>
  );
}
