import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { DroneCategory, DroneDigitalTwinConfiguration, ConfigStatus } from "@/types/drone-digital-twin";
import { getUserConfiguration } from "@/lib/digital-twin/digital-twin-storage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Settings2, AlertTriangle, CheckCircle2 } from "lucide-react";

// Helper component for formatting values
const Value = ({ value, unit = "" }: { value: any, unit?: string }) => {
  if (value === undefined || value === null || Number.isNaN(value) || value === "") {
    return <span className="text-neutral-500">—</span>;
  }
  if (typeof value === "boolean") {
    return <span>{value ? "Enabled" : "Disabled"}</span>;
  }
  return <span>{String(value)}{unit ? ` ${unit}` : ""}</span>;
};

// Row layout for engineering specifications
const SpecRow = ({ label, value, unit }: { label: string, value: any, unit?: string }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between py-2.5 border-b border-white/5 group hover:bg-white/[0.02] px-1 transition-colors">
    <span className="text-xs text-neutral-400 mb-1 md:mb-0">{label}</span>
    <span className="text-sm font-medium text-white/90 md:text-right">
      <Value value={value} unit={unit} />
    </span>
  </div>
);

// Group section layout
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center gap-4 mb-3">
      <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#FF5500] shrink-0">{title}</h3>
      <div className="h-px bg-white/10 flex-1" />
    </div>
    <div className="flex flex-col">
      {children}
    </div>
  </div>
);

export function ConfigurationOverview() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams?.get("drone") as DroneCategory | null;
  const showSavedSuccess = searchParams?.get("saved") === "true";

  const [status, setStatus] = useState<ConfigStatus>("UNKNOWN");
  const [persistedConfig, setPersistedConfig] = useState<DroneDigitalTwinConfiguration | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(showSavedSuccess);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        // Also remove ?saved=true from the URL cleanly
        router.replace(`/configure?drone=${activeCategory}`, { scroll: false });
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showToast, router, activeCategory]);

  useEffect(() => {
    if (authLoading) {
      setStatus("LOADING");
      return;
    }
    
    if (!activeCategory) {
      router.replace("/dashboard");
      return;
    }

    if (!user) {
      return;
    }

    const fetchConfig = async () => {
      setStatus("LOADING");
      try {
        const result = await getUserConfiguration(user.uid, activeCategory, showSavedSuccess);
        
        if (result.status === "SUCCESS" && result.data) {
          setPersistedConfig(result.data);
          setStatus("CONFIGURED");
        } else if (result.status === "NOT_FOUND") {
          setPersistedConfig(null);
          setStatus("NOT_CONFIGURED");
        } else if (result.status === "OFFLINE") {
          setPersistedConfig(null);
          setErrorMsg(result.error || "Client is offline");
          setStatus("OFFLINE");
        } else {
          setPersistedConfig(null);
          setErrorMsg(result.error || "Load error");
          setStatus("LOAD_ERROR");
        }
      } catch (err: any) {
        console.error("Failed to load config", err);
        setErrorMsg(err.message || "Unknown error");
        setStatus("LOAD_ERROR");
      }
    };
    
    fetchConfig();
  }, [user, authLoading, activeCategory, showSavedSuccess, router]);

  if (status === "LOADING" || status === "UNKNOWN") {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Loading Configuration...</p>
      </div>
    );
  }

  if (status === "LOAD_ERROR" || status === "OFFLINE") {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
          {status === "OFFLINE" ? "You are currently offline." : "Unable to load your aircraft configuration."}
        </p>
        {errorMsg && <p className="text-[10px] text-neutral-600">{errorMsg}</p>}
        <Button 
          onClick={() => { setStatus("LOADING"); router.refresh(); }}
          variant="primary"
          className="mt-4 inline-flex items-center justify-center gap-2"
        >
          <span>RETRY</span>
        </Button>
      </div>
    );
  }

  if (status === "NOT_CONFIGURED" || !persistedConfig) {
    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col mt-8 pb-32">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight uppercase">
                    {activeCategory}
                </h1>
                <Button  
                    onClick={() => router.push('/dashboard')}
                    variant="outline"
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                    RETURN TO HANGAR
                </Button>
            </div>
            
            <div className="w-full flex flex-col items-center justify-center py-20 px-6 border border-white/10 rounded-lg bg-[#0c0d0e] mt-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-6">
                        <Settings2 className="w-8 h-8 text-neutral-500" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2 uppercase tracking-widest">NOT CONFIGURED</h2>
                  <p className="text-sm text-neutral-400 text-center max-w-md mb-8">
                      Configure your aircraft's airframe, propulsion, battery, avionics, payload and performance parameters before entering simulation.
                  </p>
                  <Button  
                        onClick={() => router.push(`/configure/edit?drone=${activeCategory}`)}
                        variant="primary"
                        leftIcon={<Settings2 className="w-4 h-4" />}
                    >
                        CONFIGURE AIRCRAFT
                  </Button>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 landscape:py-2 bg-gradient-to-t from-[#08090a] via-[#08090a]/90 to-transparent z-50 pointer-events-none safe-area-pb">
                <div className="max-w-5xl mx-auto flex items-center justify-center sm:justify-end gap-2 sm:gap-4 pointer-events-auto px-4 safe-area-padding">
                    <span className="text-xs font-medium text-neutral-500 mr-4">
                        Complete aircraft configuration to continue.
                    </span>
                    <Button
                        disabled
                        variant="black"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                        SELECT ENVIRONMENT
                    </Button>
                </div>
            </div>
        </div>
    );
  }

  const config = persistedConfig;

  return (
      <div className="w-full max-w-5xl mx-auto flex flex-col mt-4 pb-32 relative">
        
        {/* Success Toast Overlay */}
        {showToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black/90 backdrop-blur-md border border-[#FF5500]/50 shadow-2xl px-6 py-4 rounded flex items-center gap-4 animate-in slide-in-from-top-4 fade-in duration-500">
            <CheckCircle2 className="w-5 h-5 text-[#FF5500]" />
            <div>
              <h4 className="text-sm font-bold text-[#FF5500] uppercase tracking-wider">Configuration Saved Successfully</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">Your aircraft digital twin has been verified and stored.</p>
            </div>
          </div>
        )}

        {/* Page Header (Title + Back Button) */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12 pt-8">
          <div className="flex flex-col">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-2">
              {config.identity.name}
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FF5500]">
                {config.identity.category}
              </p>
              <span className="px-2 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-400 text-[9px] font-bold tracking-widest uppercase">
                CONFIGURED
              </span>
            </div>
          </div>
          
          <Button 
            onClick={() => router.push('/dashboard')}
            variant="outline"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            RETURN TO HANGAR
          </Button>
        </div>

        {/* High-Level Summary Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-16 pb-8 border-b border-white/10">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2">Total Mass</span>
            <span className="text-2xl font-bold text-white tracking-tight">{config.massProperties.totalMassKg.toFixed(2)} kg</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2">Battery</span>
            <span className="text-2xl font-bold text-white tracking-tight">{config.battery.cellCount}S</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2">Motors</span>
            <span className="text-2xl font-bold text-white tracking-tight">{config.airframe.motorCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2">Active Payload</span>
            <span className="text-2xl font-bold text-white tracking-tight">{config.payload.enabled ? config.payload.massKg.toFixed(2) : "0.00"} kg</span>
          </div>
        </div>

        {/* Main Tabular Engineering Specification */}
        <div className="w-full">
          <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white mb-10">
            DIGITAL TWIN CONFIGURATION
          </h2>

          <div className="grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-x-8 lg:gap-x-16">
            <div className="flex flex-col">
              <Section title="AIRFRAME">
                <SpecRow label="Frame type" value={config.airframe.frameType.toUpperCase()} />
                <SpecRow label="Frame material" value={config.airframe.frameMaterial} />
                <SpecRow label="Dry mass" value={config.airframe.dryMassKg.toFixed(2)} unit="kg" />
                <SpecRow label="Maximum payload" value={config.airframe.maxPayloadKg.toFixed(2)} unit="kg" />
                <SpecRow label="Wheelbase" value={config.airframe.frameDiagonalMm} unit="mm" />
                <SpecRow label="Arm length" value={config.airframe.armLengthMeters.toFixed(2)} unit="m" />
                <SpecRow label="Dimensions (L×W×H)" value={`${config.airframe.dimensions.lengthM.toFixed(2)} × ${config.airframe.dimensions.widthM.toFixed(2)} × ${config.airframe.dimensions.heightM.toFixed(2)}`} unit="m" />
                <SpecRow label="Landing gear" value={config.airframe.landingGearType} />
                <SpecRow label="Center of gravity" value={`X:${config.airframe.centerOfGravity.x.toFixed(3)}, Y:${config.airframe.centerOfGravity.y.toFixed(3)}, Z:${config.airframe.centerOfGravity.z.toFixed(3)}`} unit="m" />
              </Section>

              <Section title="PROPULSION">
                <SpecRow label="Motor count" value={config.airframe.motorCount} />
                <SpecRow label="Motor KV" value={config.motors[0]?.kvRating} unit="KV" />
                <SpecRow label="Nominal RPM" value={config.motors[0]?.nominalRpm} unit="RPM" />
                <SpecRow label="Maximum RPM" value={config.motors[0]?.maxRpm} unit="RPM" />
                <SpecRow label="Rated voltage" value={config.motors[0]?.ratedVoltageV} unit="V" />
                <SpecRow label="Maximum motor power" value={config.motors[0]?.maxPowerWatts} unit="W" />
                <SpecRow label="Motor efficiency" value={config.motors[0]?.efficiencyPercent} unit="%" />
                <SpecRow label="Propeller diameter" value={config.propeller.diameterInches} unit="in" />
                <SpecRow label="Propeller pitch" value={config.propeller.pitchInches} unit="in" />
                <SpecRow label="Blade count" value={config.propeller.bladeCount} />
                <SpecRow label="Propeller material" value={config.propeller.material} />
                <SpecRow label="ESC protocol" value={config.esc.protocol} />
                <SpecRow label="ESC rated current" value={config.esc.ratedCurrentAmps} unit="A" />
                <SpecRow label="ESC burst current" value={config.esc.burstCurrentAmps} unit="A" />
                <SpecRow label="ESC voltage range" value={`${config.esc.voltageMinV}-${config.esc.voltageMaxV}`} unit="V" />
              </Section>

              <Section title="BATTERY & ENERGY">
                <SpecRow label="Chemistry" value={config.battery.chemistry} />
                <SpecRow label="Cell count" value={`${config.battery.cellCount}S`} />
                <SpecRow label="Nominal voltage" value={config.battery.nominalVoltageV.toFixed(1)} unit="V" />
                <SpecRow label="Capacity" value={config.battery.capacityMah} unit="mAh" />
                <SpecRow label="Energy" value={config.battery.energyWh.toFixed(1)} unit="Wh" />
                <SpecRow label="Maximum discharge" value={config.battery.maxContinuousDischargeC} unit="C" />
                <SpecRow label="Internal resistance" value={config.battery.internalResistanceMilliOhm} unit="mΩ" />
                <SpecRow label="Battery mass" value={config.battery.massKg.toFixed(2)} unit="kg" />
                <SpecRow label="Battery health" value={config.battery.batteryHealthPercent} unit="%" />
              </Section>
            </div>

            <div className="flex flex-col">
              <Section title="FLIGHT CONTROLLER">
                <SpecRow label="Controller" value={config.flightController.controllerType} />
                <SpecRow label="Firmware" value={config.flightController.firmwareVersion} />
                <SpecRow label="Stabilization" value={config.flightController.stabilizationEnabled} />
                <SpecRow label="GPS assisted mode" value={config.flightController.gpsAssistedMode} />
                <SpecRow label="Failsafe action" value={config.flightController.failsafeAction} />
                <SpecRow label="Control loop" value={config.flightController.controlLoopFrequencyHz} unit="Hz" />
              </Section>

              <Section title="SENSORS & AVIONICS">
                {config.sensors.map(sensor => (
                  <SpecRow 
                    key={sensor.id} 
                    label={sensor.type} 
                    value={`${sensor.name} (${sensor.enabled ? 'Enabled' : 'Disabled'})`} 
                  />
                ))}
              </Section>

              <Section title="PAYLOAD">
                <SpecRow label="Maximum payload capacity" value={config.airframe.maxPayloadKg.toFixed(2)} unit="kg" />
                <SpecRow label="Payload status" value={config.payload.enabled} />
                <SpecRow label="Payload type" value={config.payload.enabled ? config.payload.type : undefined} />
                <SpecRow label="Payload name" value={config.payload.enabled ? config.payload.name : undefined} />
                <SpecRow label="Active payload mass" value={config.payload.enabled ? config.payload.massKg.toFixed(2) : undefined} unit="kg" />
                <SpecRow label="Attachment" value={config.payload.enabled ? config.payload.attachmentPoint : undefined} />
              </Section>

              <Section title="CAMERA / GIMBAL">
                <SpecRow label="Camera status" value={config.camera.enabled} />
                <SpecRow label="Sensor type" value={config.camera.enabled ? config.camera.sensorType : undefined} />
                <SpecRow label="Resolution" value={config.camera.enabled ? config.camera.resolution : undefined} />
                <SpecRow label="Field of view" value={config.camera.enabled ? config.camera.fovDegrees : undefined} unit="°" />
                <SpecRow label="Gimbal axes" value={config.camera.enabled ? config.camera.gimbalAxisCount : undefined} />
                <SpecRow label="Gimbal mass" value={config.camera.enabled ? config.camera.massKg.toFixed(2) : undefined} unit="kg" />
              </Section>

              <Section title="COMMUNICATION">
                <SpecRow label="Link type" value={config.communication.type} />
                <SpecRow label="Range" value={config.communication.rangeKm} unit="km" />
                <SpecRow label="Frequency" value={config.communication.frequencyMhz} unit="MHz" />
                <SpecRow label="Transmit power" value={config.communication.txPowerMilliWatts} unit="mW" />
              </Section>

              <Section title="PERFORMANCE">
                <SpecRow label="Total mass" value={config.massProperties.totalMassKg.toFixed(2)} unit="kg" />
                <SpecRow label="Total thrust" value={config.performance.totalThrustNewtons.toFixed(1)} unit="N" />
                <SpecRow label="Thrust-to-weight" value={config.performance.thrustToWeightRatio.toFixed(2)} />
                <SpecRow label="Hover throttle" value={`${(config.performance.hoverThrottleEstimate * 100).toFixed(1)}`} unit="%" />
                <SpecRow label="Estimated flight time" value={config.performance.estimatedFlightTimeMinutes.toFixed(1)} unit="min" />
                <SpecRow label="Maximum horizontal speed" value={config.performance.maxHorizontalSpeedMs.toFixed(1)} unit="m/s" />
                <SpecRow label="Maximum ascent speed" value={config.performance.maxAscentSpeedMs.toFixed(1)} unit="m/s" />
                <SpecRow label="Maximum descent speed" value={config.performance.maxDescentSpeedMs.toFixed(1)} unit="m/s" />
                <SpecRow label="Maximum tilt angle" value={config.performance.maxTiltAngleDeg} unit="°" />
                <SpecRow label="Maximum operating altitude" value={config.performance.maxOperatingAltitudeM} unit="m" />
              </Section>
            </div>
          </div>

          {/* Grouped Component Arrays */}
          <div className="mt-8 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#FF5500] mb-4">MOTOR CONFIGURATION</h3>
            <div className="w-full overflow-x-auto rounded border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs text-neutral-300 whitespace-nowrap">
                <thead className="bg-white/5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Motor</th>
                    <th className="px-5 py-3 font-semibold">Position (x,y,z)</th>
                    <th className="px-5 py-3 font-semibold">Direction</th>
                    <th className="px-5 py-3 font-semibold">Nominal RPM</th>
                    <th className="px-5 py-3 font-semibold">Max RPM</th>
                    <th className="px-5 py-3 font-semibold">KV</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {config.motors.map((m) => (
                    <tr key={m.motorId} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 text-white font-bold">{m.motorId}</td>
                      <td className="px-5 py-3 font-mono">{m.position.x.toFixed(2)}, {m.position.y.toFixed(2)}, {m.position.z.toFixed(2)}</td>
                      <td className="px-5 py-3">{m.direction === 1 ? 'CW' : 'CCW'}</td>
                      <td className="px-5 py-3">{m.nominalRpm}</td>
                      <td className="px-5 py-3">{m.maxRpm}</td>
                      <td className="px-5 py-3">{m.kvRating}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-bold ${m.status === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-8 mb-24 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
            <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#FF5500] mb-4">SENSOR SUITE STATUS</h3>
            <div className="w-full overflow-x-auto rounded border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs text-neutral-300 whitespace-nowrap">
                <thead className="bg-white/5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Sensor</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Enabled</th>
                    <th className="px-5 py-3 font-semibold">Accuracy</th>
                    <th className="px-5 py-3 font-semibold">Update Rate</th>
                    <th className="px-5 py-3 font-semibold">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {config.sensors.map((s) => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 text-white">{s.name}</td>
                      <td className="px-5 py-3">{s.type}</td>
                      <td className="px-5 py-3">{s.enabled ? 'Enabled' : 'Disabled'}</td>
                      <td className="px-5 py-3">{s.accuracy}</td>
                      <td className="px-5 py-3">{s.updateRateHz} Hz</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-bold ${s.health === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {s.health}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Bottom Action Area */}
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 landscape:py-2 bg-gradient-to-t from-[#08090a] via-[#08090a]/90 to-transparent z-50 pointer-events-none safe-area-pb">
          <div className="max-w-5xl mx-auto flex items-center justify-center sm:justify-end gap-2 sm:gap-4 pointer-events-auto px-4 safe-area-padding">
            <Button
              onClick={() => router.push(`/configure/edit?drone=${activeCategory}`)}
              variant="black"
              className="w-full sm:w-auto"
              leftIcon={<Settings2 className="w-4 h-4" />}
            >
              EDIT CONFIGURATION
            </Button>
            <Button
              onClick={() => router.push(`/environment?drone=${activeCategory}`)}
              variant="primary"
              className="w-full sm:w-auto"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              SELECT ENVIRONMENT
            </Button>
          </div>
        </div>
      </div>
    );
  }
