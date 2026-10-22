"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DroneCategory, DroneDigitalTwinConfiguration, DigitalTwinValidationResult } from "@/types/drone-digital-twin";
import { 
  getUserConfiguration, 
  saveUserConfiguration,
} from "@/lib/digital-twin/digital-twin-storage";
import { useAuth } from "@/context/auth-context";
import { validateDroneDigitalTwin } from "@/lib/digital-twin/digital-twin-validator";
import { DRONES, getDroneById } from "@/lib/drones";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Save, Info, Settings, Settings2, Download } from "lucide-react";

// Import existing form sections
import { ConfigAirframeTab } from "./tabs/config-airframe-tab";
import { ConfigPropulsionTab } from "./tabs/config-propulsion-tab";
import { ConfigBatteryTab } from "./tabs/config-battery-tab";
import { ConfigAvionicsTab } from "./tabs/config-avionics-tab";
import { ConfigPayloadTab } from "./tabs/config-payload-tab";
import { ConfigPerformanceTab } from "./tabs/config-performance-tab";

// Simple Accordion Component
const Accordion = ({ 
  title, 
  children, 
  defaultExpanded = false 
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultExpanded?: boolean 
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button 
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-5 px-6 hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-bold tracking-widest uppercase text-white">{title}</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-neutral-500" /> : <ChevronRight className="w-4 h-4 text-neutral-500" />}
      </button>
      {expanded && (
        <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {children}
        </div>
      )}
    </div>
  );
};

export function DigitalTwinConfigurator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<DroneDigitalTwinConfiguration | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showTechnicalManifest, setShowTechnicalManifest] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (hasInitialized.current) return;
    
    const initConfig = async () => {
      try {
        const category = searchParams?.get("drone") as DroneCategory | null;
        if (!category) {
          router.replace("/configure");
          return;
        }

        const existing = await getUserConfiguration(user?.uid || null, category);
        
        if (existing.status === "SUCCESS" && existing.data) {
          // deep clone so we don't mutate the fetched object
          setConfig(JSON.parse(JSON.stringify(existing.data)));
        } else if (existing.status === "NOT_FOUND") {
          // Create a new config from a preset based on category
          const presetId = category === "quadcopter" ? "aero-trainer-x4" : category === "hexacopter" ? "skymapper-6b" : "titan-octo-8c";
          const presetDrone = getDroneById(presetId);
          if (presetDrone) {
            const motorCount = category === "quadcopter" ? 4 : category === "hexacopter" ? 6 : 8;
            const initialMotors = Array.from({ length: motorCount }).map((_, i) => ({
              motorId: `M${i + 1}`,
              index: i,
              position: { x: 0, y: 0, z: 0 },
              direction: i % 2 === 0 ? 1 : -1 as 1 | -1,
              nominalRpm: 6000,
              minRpm: 1200,
              maxRpm: 12000,
              kvRating: 900,
              ratedVoltageV: 22.2,
              maxThrustNewtons: 50,
              maxPowerWatts: 450,
              efficiencyPercent: 85,
              status: "HEALTHY" as any
            }));

            const newConfig: DroneDigitalTwinConfiguration = {
              identity: {
                id: category,
                name: presetDrone.name + " (Custom)",
                category: category,
                application: presetDrone.missionCategory as any,
                manufacturer: "Drone Pilot Lab",
                modelName: presetDrone.name,
                description: presetDrone.description,
                configurationVersion: "1.0",
                isPreset: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
              },
                airframe: {
                  frameType: presetDrone.platformId,
                  frameMaterial: "Carbon Fiber",
                  frameDiagonalMm: 1200,
                  armLengthMeters: 0.8,
                  dimensions: { lengthM: 1.5, widthM: 1.5, heightM: 0.5 },
                  centerOfGravity: { x: 0, y: 0, z: 0 },
                  maxPayloadKg: category === "quadcopter" ? 5.0 : category === "hexacopter" ? 12.0 : 25.0,
                  dryMassKg: presetDrone.baseMassKg,
                  motorCount: motorCount,
                  landingGearType: "Fixed Skid"
                },
                propeller: {
                  diameterInches: 18,
                  pitchInches: 6,
                  bladeCount: 2,
                  material: "Carbon Fiber Composite",
                  massGrams: 50,
                  thrustFactor: 1.5
                },
                esc: {
                  protocol: "DShot600",
                  ratedCurrentAmps: 60,
                  burstCurrentAmps: 80,
                  voltageMinV: 12,
                  voltageMaxV: 50,
                  efficiencyPercent: 95
                },
                motors: initialMotors,
                battery: {
                  chemistry: "LiPo (Lithium Polymer)",
                  cellCount: presetDrone.batteryCells,
                  nominalVoltageV: presetDrone.batteryCells * 3.7,
                  capacityMah: 16000,
                  energyWh: (presetDrone.batteryCells * 3.7 * 16000) / 1000,
                  maxContinuousDischargeC: 25,
                  internalResistanceMilliOhm: 5,
                  batteryHealthPercent: 100,
                  massKg: 1.5
                },
                flightController: {
                  controllerType: "Pixhawk 4",
                  firmwareVersion: "PX4 v1.13.0",
                  failsafeAction: "RTH",
                  stabilizationEnabled: true,
                  gpsAssistedMode: true,
                  controlLoopFrequencyHz: 400
                },
                sensors: [
                  { id: "s1", type: "GPS", name: "Primary GPS/RTK", enabled: true, accuracy: "±2cm", updateRateHz: 10, health: "HEALTHY" as any },
                  { id: "s2", type: "IMU", name: "Primary IMU", enabled: true, accuracy: "High", updateRateHz: 400, health: "HEALTHY" as any }
                ],
                payload: {
                  id: "pl_1",
                  type: "Camera",
                  name: "Default Payload",
                  massKg: 0,
                  attachmentPoint: "Belly Gimbal",
                  enabled: false
                },
                camera: {
                  sensorType: "CMOS 1-inch",
                  resolution: "4K 60fps",
                  fovDegrees: 84,
                  gimbalAxisCount: 3,
                  massKg: 0.5,
                  enabled: true
                },
                communication: {
                  type: "2.4GHz Spread Spectrum",
                  rangeKm: 5,
                  frequencyMhz: 2400,
                  txPowerMilliWatts: 100
                },
                massProperties: {
                  dryMassKg: presetDrone.baseMassKg,
                  batteryMassKg: 1.5,
                  payloadMassKg: 0,
                  cameraMassKg: 0.5,
                  totalMassKg: presetDrone.baseMassKg + 1.5 + 0.5,
                  centerOfGravity: { x: 0, y: 0, z: 0 },
                  estimatedInertiaKgM2: { pitch: 0.5, roll: 0.5, yaw: 0.8 }
                },
                performance: {
                  maxHorizontalSpeedMs: 20,
                  maxAscentSpeedMs: 5,
                  maxDescentSpeedMs: 3,
                  maxTiltAngleDeg: 35,
                  hoverThrottleEstimate: 0.45,
                  estimatedFlightTimeMinutes: 25,
                  maxOperatingAltitudeM: 400,
                  thrustToWeightRatio: 2.5,
                  totalThrustNewtons: 400
                }
              };
              
              setConfig(newConfig);
            }
          } else {
            setLoadError(existing.error || "Client is offline or unable to load configuration.");
          }
        
          hasInitialized.current = true;
        } catch (err: any) {
          console.error("Config init error:", err);
        }
      };

    if (user !== undefined && !authLoading) {
      initConfig();
    }
  }, [searchParams, user, authLoading, router]);

  const validationResult: DigitalTwinValidationResult = useMemo(() => {
    if (!config) return { valid: false, errors: [], warnings: [], infos: [] };
    return validateDroneDigitalTwin(config);
  }, [config]);
  const [activeTab, setActiveTab] = useState<"AIRFRAME" | "PROPULSION" | "BATTERY" | "AVIONICS" | "PAYLOAD">("AIRFRAME");
  const [isSaving, setIsSaving] = useState(false);

  const handleConfigChange = useCallback((updated: DroneDigitalTwinConfiguration) => {
    setConfig(updated);
  }, []);

  const handleSave = useCallback(async () => {
    console.log("SAVE CLICK");
    if (isSaving) return;
    console.log("SAVE FUNCTION START");

    if (!user?.uid) {
      console.warn("CONFIGURATION SAVE ABORTED: auth.currentUser?.uid is missing or unauthenticated");
      setSaveFeedback("Must be logged in to save configuration.");
      return;
    }

    if (!config) {
      console.warn("CONFIGURATION SAVE ABORTED: No configuration object loaded");
      return;
    }

    const category = config.identity?.category;
    if (!category || !["quadcopter", "hexacopter", "octacopter"].includes(category)) {
      console.error("CONFIGURATION SAVE ABORTED: Invalid drone category:", category);
      setSaveFeedback("Invalid drone category.");
      return;
    }

    console.log("SAVE CONFIGURATION", {
      UID: user.uid,
      DRONE: category,
      PATH: `users/${user.uid}/droneConfigurations/${category}`
    });

    setIsSaving(true);
    try {
      const toSave: DroneDigitalTwinConfiguration = {
        ...config,
        identity: {
          ...config.identity,
          id: category,
          category: category,
          updatedAt: Date.now()
        }
      };

      await saveUserConfiguration(user.uid, category, toSave);

      console.log("FIRESTORE WRITE SUCCESS for", category);

      // Redirect back to overview with a success indicator
      router.push(`/configure?drone=${category}&saved=true`);
    } catch (err: any) {
      console.error("CONFIGURATION SAVE FAILED", {
        error: err,
        code: err?.code || (err instanceof Error ? err.name : undefined),
        name: err?.name,
        message: err instanceof Error ? err.message : String(err),
        uid: user.uid,
        droneType: category,
      });

      setSaveFeedback("Unable to save aircraft configuration.");
      setTimeout(() => setSaveFeedback(null), 5000);
    } finally {
      setIsSaving(false);
    }
  }, [config, user, router, isSaving]);
  const tabs = ["AIRFRAME", "PROPULSION", "BATTERY", "AVIONICS", "PAYLOAD"] as const;

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Unable to enter configuration</p>
        <p className="text-[10px] text-neutral-600">{loadError}</p>
        <Button onClick={() => router.push('/dashboard')} variant="outline" className="mt-4">
          RETURN TO HANGAR
        </Button>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Initializing Digital Twin...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto h-full min-h-[85vh] bg-transparent flex flex-col mt-6 pb-20">
      
      {/* Save Notification Overlay */}
      {saveFeedback && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-[#FF5500] text-white px-6 py-3 rounded border border-[#FF5500]/50 shadow-2xl font-bold text-xs uppercase tracking-widest animate-in slide-in-from-top-8 fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {saveFeedback}
        </div>
      )}

      {/* Header: Title and Stats */}
      <div className="w-full flex flex-col gap-6 mb-8 mt-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                {config.identity.name}
                {config.identity.isPreset && (
                  <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-[10px] uppercase tracking-widest rounded-full font-bold ml-2">
                    Preset
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF5500]">
                  {config.identity.category}
                </span>
              </div>
            </div>
            
            {/* Return to Hangar Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/hangar')} 
              className="text-neutral-400 border-neutral-700 hover:text-white hover:bg-neutral-800 uppercase text-[10px] tracking-widest font-bold h-8 ml-4"
            >
              Return to Hangar
            </Button>
          </div>
        </div>

        {/* High-Level Stats Panel */}
        <div className="border-t border-b border-white/10 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
           <div>
             <span className="block text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-1">Total Mass</span>
             <span className="text-xl md:text-2xl font-bold text-white leading-none">{config.massProperties.totalMassKg.toFixed(2)} kg</span>
           </div>
           <div>
             <span className="block text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-1">Battery</span>
             <span className="text-xl md:text-2xl font-bold text-white leading-none">{config.battery.cellCount}S</span>
           </div>
           <div>
             <span className="block text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-1">Motors</span>
             <span className="text-xl md:text-2xl font-bold text-white leading-none">{config.airframe.motorCount}</span>
           </div>
           <div>
             <span className="block text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-1">Active Payload</span>
             <span className="text-xl md:text-2xl font-bold text-white leading-none">{config.payload.massKg.toFixed(2)} kg</span>
           </div>
        </div>
      </div>

      {/* Edit Mode: Tabbed Configuration Document */}
      <div className="flex-1 flex flex-col animate-in fade-in">
        
        {/* Document Section Header / Tabs */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <Settings2 className="w-6 h-6 text-[#FF5500] shrink-0" />
               <h3 className="text-lg md:text-xl font-bold uppercase tracking-widest text-white leading-tight">Configure Aircraft<br className="md:hidden" /> Parameters</h3>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <Button 
                onClick={() => router.push(`/configure?drone=${config.identity.category}`)} 
                variant="ghost" 
              >
                CANCEL EDIT
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                variant="primary"
                isLoading={isSaving}
                loadingText="SAVING CONFIGURATION..."
                leftIcon={!isSaving ? <Save className="w-4 h-4" /> : undefined}
              >
                SAVE CONFIGURATION
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-6 py-0 h-10 rounded text-[10px] font-bold tracking-widest uppercase transition-all ${
                  activeTab === tab 
                    ? "bg-[#FF5500] text-white" 
                    : "bg-[#0c0d0e] text-neutral-400 border border-white/5 hover:bg-white/5 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        
        {/* Active Tab Content (No Cards, Flat) */}
        <div className="flex-1 mb-12">
          {activeTab === "AIRFRAME" && <ConfigAirframeTab config={config} onChange={handleConfigChange} />}
          {activeTab === "PROPULSION" && <ConfigPropulsionTab config={config} onChange={handleConfigChange} />}
          {activeTab === "BATTERY" && <ConfigBatteryTab config={config} onChange={handleConfigChange} />}
          {activeTab === "AVIONICS" && <ConfigAvionicsTab config={config} onChange={handleConfigChange} />}
          {activeTab === "PAYLOAD" && <ConfigPayloadTab config={config} onChange={handleConfigChange} />}
        </div>

        {/* Document Footer Actions */}
        <div className="pt-8 border-t border-white/10 flex flex-col-reverse md:flex-row justify-end md:items-center gap-4">
          <Button 
            onClick={() => router.push(`/configure?drone=${config.identity.category}`)} 
            variant="ghost" 
          >
            CANCEL EDIT
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            variant="primary"
            isLoading={isSaving}
            loadingText="SAVING CONFIGURATION..."
            leftIcon={!isSaving ? <Save className="w-4 h-4" /> : undefined}
          >
            SAVE CONFIGURATION
          </Button>
        </div>
      </div>
    </div>
  );
}
