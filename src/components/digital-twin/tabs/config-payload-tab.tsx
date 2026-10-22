"use client";

import React from "react";
import {
  DroneDigitalTwinConfiguration,
  PayloadAttachment,
} from "@/types/drone-digital-twin";
import { ParameterField } from "../parameter-field";
import {
  calculateMassProperties,
  calculatePerformanceEnvelope,
} from "@/lib/digital-twin/mass-calculator";
import { Camera, Package, ShieldAlert } from "lucide-react";

interface ConfigPayloadTabProps {
  config: DroneDigitalTwinConfiguration;
  onChange: (updated: DroneDigitalTwinConfiguration) => void;
}

export function ConfigPayloadTab({ config, onChange }: ConfigPayloadTabProps) {
  const { payload, camera, airframe } = config;

  const updatePayload = (field: string, val: any) => {
    const updatedPayload = {
      ...payload,
      [field]: val,
    };
    const draft = {
      ...config,
      payload: updatedPayload,
    };
    const massProps = calculateMassProperties(draft);
    const perf = calculatePerformanceEnvelope(draft, massProps);

    onChange({
      ...draft,
      massProperties: massProps,
      performance: perf,
    });
  };

  const updateCamera = (field: string, val: any) => {
    const updatedCamera = {
      ...camera,
      [field]: val,
    };
    const draft = {
      ...config,
      camera: updatedCamera,
    };
    const massProps = calculateMassProperties(draft);
    const perf = calculatePerformanceEnvelope(draft, massProps);

    onChange({
      ...draft,
      camera: updatedCamera,
      massProperties: massProps,
      performance: perf,
    });
  };

  const payloadTypes = [
    { label: "High-Resolution Gimbal Camera", value: "Camera" },
    { label: "Agricultural Liquid Spray Tank", value: "Agricultural Tank" },
    { label: "Topographic Survey LiDAR Scanner", value: "Survey LiDAR" },
    { label: "Thermal Infrastructure Inspection Pod", value: "Inspection Sensor" },
    { label: "Custom Scientific Instrumentation", value: "Custom" },
  ];

  const attachmentPoints: Array<{ label: string; value: PayloadAttachment }> = [
    { label: "Belly Gimbal Mount (Underslung)", value: "Belly Gimbal" },
    { label: "Underslung Dual Carbon Rail", value: "Underslung Rail" },
    { label: "Top Fuselage Pylon", value: "Top Fuselage" },
    { label: "Internal Modular Cargo Bay", value: "Internal Bay" },
  ];

  const activePayloadMass = payload.enabled ? payload.massKg : 0;
  const activeCameraMass = camera.enabled ? camera.massKg : 0;
  const totalAddedMass = Number((activePayloadMass + activeCameraMass).toFixed(2));
  const isOverweight = totalAddedMass > airframe.maxPayloadKg;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 mb-6">
        <h3 className="text-base font-heading font-bold text-white uppercase">
          MISSION PAYLOAD & OPTICAL EQUIPMENT
        </h3>
        <p className="text-xs text-neutral-400">
          Configure specialized airborne payloads, camera gimbals, and observe real-time all-up mass impact.
        </p>
      </div>

      {/* OVERWEIGHT WARNING NOTICE IF EXCEEDED */}
      {isOverweight && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Airframe Structural Overload Warning</p>
            <p className="mt-0.5 text-rose-700">
              Combined active payload and camera mass ({totalAddedMass} kg) exceeds the airframe rating ({airframe.maxPayloadKg} kg).
              Reduce equipment mass or select a larger airframe class.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 1: MISSION PAYLOAD */}
      <div className="space-y-6 mb-12">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#FF5500]" />
            <span className="text-sm font-mono font-bold uppercase tracking-wider text-white">
              MISSION PAYLOAD MODULE
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-semibold text-neutral-300">Equip Payload</span>
            <input
              type="checkbox"
              checked={payload.enabled}
              onChange={(e) => updatePayload("enabled", e.target.checked)}
              className="h-4 w-4 accent-[#FF5500] text-[#FF5500] rounded border-white/10 focus:ring-[#FF5500]"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-4">
          <ParameterField
            id="payload-type"
            label="Equipment Category"
            type="select"
            value={payload.type}
            options={payloadTypes}
            disabled={!payload.enabled}
            onChange={(v) => updatePayload("type", v)}
          />

          <ParameterField
            id="payload-name"
            label="Module Name / Description"
            type="text"
            value={payload.name}
            disabled={!payload.enabled}
            onChange={(v) => updatePayload("name", v)}
          />

          <ParameterField
            id="payload-mass"
            label="Payload Mass"
            unit="kg"
            tooltipKey="payloadMass"
            value={payload.massKg}
            min={0.1}
            max={25.0}
            step={0.1}
            disabled={!payload.enabled}
            onChange={(v) => updatePayload("massKg", v)}
            helperText={`Max airframe rating: ${airframe.maxPayloadKg} kg.`}
          />

          <ParameterField
            id="payload-mount"
            label="Mechanical Attachment"
            type="select"
            value={payload.attachmentPoint}
            options={attachmentPoints}
            disabled={!payload.enabled}
            onChange={(v) => updatePayload("attachmentPoint", v)}
          />
        </div>
      </div>

      {/* SECTION 2: GIMBAL OPTICAL CAMERA */}
      <div className="space-y-6 mb-12">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-[#FF5500]" />
            <span className="text-sm font-mono font-bold uppercase tracking-wider text-white">
              ACTIVE CAMERA & GIMBAL SYSTEM
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-semibold text-neutral-300">Mount Camera</span>
            <input
              type="checkbox"
              checked={camera.enabled}
              onChange={(e) => updateCamera("enabled", e.target.checked)}
              className="h-4 w-4 accent-[#FF5500] text-[#FF5500] rounded border-white/10 focus:ring-[#FF5500]"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-4">
          <ParameterField
            id="cam-type"
            label="Optical Sensor Type"
            type="text"
            value={camera.sensorType}
            disabled={!camera.enabled}
            onChange={(v) => updateCamera("sensorType", v)}
          />

          <ParameterField
            id="cam-res"
            label="Capture Resolution"
            type="text"
            value={camera.resolution}
            disabled={!camera.enabled}
            onChange={(v) => updateCamera("resolution", v)}
          />

          <ParameterField
            id="cam-fov"
            label="Field of View (Diagonal)"
            unit="degrees"
            value={camera.fovDegrees}
            min={40}
            max={120}
            step={2}
            disabled={!camera.enabled}
            onChange={(v) => updateCamera("fovDegrees", v)}
          />

          <ParameterField
            id="cam-mass"
            label="Gimbal & Pod Mass"
            unit="kg"
            value={camera.massKg}
            min={0.05}
            max={3.0}
            step={0.02}
            disabled={!camera.enabled}
            onChange={(v) => updateCamera("massKg", v)}
          />
        </div>
      </div>
    </div>
  );
}
