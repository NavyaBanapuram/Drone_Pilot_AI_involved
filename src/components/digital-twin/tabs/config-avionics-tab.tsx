"use client";

import React from "react";
import {
  DroneDigitalTwinConfiguration,
  SensorConfig,
} from "@/types/drone-digital-twin";
import { ParameterField } from "../parameter-field";
import { Cpu, Radio, Activity, Check, X, ShieldAlert } from "lucide-react";

interface ConfigAvionicsTabProps {
  config: DroneDigitalTwinConfiguration;
  onChange: (updated: DroneDigitalTwinConfiguration) => void;
}

export function ConfigAvionicsTab({ config, onChange }: ConfigAvionicsTabProps) {
  const { flightController, sensors, communication } = config;

  const updateFC = (field: string, val: any) => {
    onChange({
      ...config,
      flightController: {
        ...flightController,
        [field]: val,
      },
    });
  };

  const toggleSensor = (sensorId: string) => {
    const updated = sensors.map((s) =>
      s.id === sensorId ? { ...s, enabled: !s.enabled } : s
    );
    onChange({
      ...config,
      sensors: updated,
    });
  };

  const updateComm = (field: string, val: any) => {
    onChange({
      ...config,
      communication: {
        ...communication,
        [field]: val,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 mb-6">
        <h3 className="text-base font-heading font-bold text-white uppercase">
          AVIONICS, SENSORS & TELEMETRY LINK
        </h3>
        <p className="text-xs text-neutral-400">
          Configure central flight controller, navigation sensor suite, and long-range datalink.
        </p>
      </div>

      {/* SECTION 1: FLIGHT CONTROLLER */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-[#FF5500]" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF5500]">
            PRIMARY AUTOPILOT / FLIGHT CONTROLLER
          </span>
        </div>

        <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-8">
          <ParameterField
            id="fc-type"
            label="Autopilot Platform"
            type="text"
            value={flightController.controllerType}
            onChange={(v) => updateFC("controllerType", v)}
          />

          <ParameterField
            id="fc-fw"
            label="Firmware Version"
            type="text"
            value={flightController.firmwareVersion}
            onChange={(v) => updateFC("firmwareVersion", v)}
          />

          <ParameterField
            id="fc-failsafe"
            label="Loss-of-Link Failsafe"
            type="select"
            value={flightController.failsafeAction}
            options={[
              { label: "Return to Home (RTH)", value: "RTH" },
              { label: "Autonomous Auto-Land", value: "AUTO_LAND" },
              { label: "Stationary Hover In-Place", value: "HOVER" },
            ]}
            onChange={(v) => updateFC("failsafeAction", v)}
          />
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 gap-3 pt-2">
          <label className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
            <div>
              <span className="text-xs font-semibold text-white block">
                6-DoF Attitude Stabilization Loop
              </span>
              <span className="text-[11px] text-neutral-400">
                Self-levels pitch and roll angles using real-time gyro/accelerometer data.
              </span>
            </div>
            <input
              type="checkbox"
              checked={flightController.stabilizationEnabled}
              onChange={(e) => updateFC("stabilizationEnabled", e.target.checked)}
              className="h-5 w-5 accent-[#FF5500] text-[#FF5500] rounded border-white/10 focus:ring-[#FF5500]"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
            <div>
              <span className="text-xs font-semibold text-white block">
                GPS Position Hold Assist
              </span>
              <span className="text-[11px] text-neutral-400">
                Counteracts external wind drift to maintain accurate spatial coordinates.
              </span>
            </div>
            <input
              type="checkbox"
              checked={flightController.gpsAssistedMode}
              onChange={(e) => updateFC("gpsAssistedMode", e.target.checked)}
              className="h-5 w-5 accent-[#FF5500] text-[#FF5500] rounded border-white/10 focus:ring-[#FF5500]"
            />
          </label>
        </div>
      </div>

      {/* SECTION 2: SENSOR SUITE INSPECTOR */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#FF5500]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF5500]">
              INTEGRATED SENSOR SUITE
            </span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            {sensors.filter((s) => s.enabled).length} of {sensors.length} Active
          </span>
        </div>

        <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 gap-3">
          {sensors.map((sensor) => (
            <div
              key={sensor.id}
              className={`p-3.5 rounded-xl border transition-all flex items-start justify-between ${
                sensor.enabled
                  ? "border-white/10 bg-transparent shadow-2xs"
                  : "border-white/5 bg-white/10/60 opacity-60"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 border border-white/5 text-neutral-300">
                    {sensor.type}
                  </span>
                  <span className="text-xs font-heading font-bold text-white">
                    {sensor.name}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400 pt-1">
                  <span>Rate: {sensor.updateRateHz} Hz</span>
                  <span>Precision: {sensor.accuracy}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSensor(sensor.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-colors ${
                  sensor.enabled
                    ? "bg-emerald-100 text-emerald-500 hover:bg-emerald-200"
                    : "bg-white/10 text-neutral-400 hover:bg-neutral-300"
                }`}
              >
                {sensor.enabled ? "Enabled" : "Offline"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: COMMUNICATION DATALINK */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-[#FF5500]" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF5500]">
            RF COMMAND & TELEMETRY LINK
          </span>
        </div>

        <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-8">
          <ParameterField
            id="comm-type"
            label="Carrier Link Type"
            type="select"
            value={communication.type}
            options={[
              { label: "2.4GHz Spread Spectrum (Direct)", value: "2.4GHz Spread Spectrum" },
              { label: "Long-Range Telemetry (915MHz LoRa)", value: "Long-Range Telemetry" },
              { label: "4G/5G Cellular Mobile Network", value: "4G/5G Cellular" },
            ]}
            onChange={(v) => updateComm("type", v)}
          />

          <ParameterField
            id="comm-range"
            label="LOS Operational Range"
            unit="km"
            value={communication.rangeKm}
            min={1}
            max={50}
            step={1}
            onChange={(v) => updateComm("rangeKm", v)}
          />

          <ParameterField
            id="comm-power"
            label="Transmitter Power"
            unit="mW"
            value={communication.txPowerMilliWatts}
            min={25}
            max={2000}
            step={25}
            onChange={(v) => updateComm("txPowerMilliWatts", v)}
          />
        </div>
      </div>
    </div>
  );
}
