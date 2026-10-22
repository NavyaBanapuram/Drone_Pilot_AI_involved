"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DroneModel } from "@/types/drone";
import { DRONES, getDroneById, DEFAULT_DRONE_STORAGE_KEY } from "@/lib/drones";
import { RegionId, RegionDefinition } from "@/lib/world/world-types";
import { REGIONS, REGION_LIST } from "@/lib/world/region-definitions";
import { ArrowLeft, ArrowRight, CheckCircle2, Wind, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveDigitalTwin } from "@/lib/digital-twin/digital-twin-storage";
import { DroneDigitalTwinConfiguration, DroneCategory } from "@/types/drone-digital-twin";

export function FlightPrepContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const activeCategory = searchParams?.get("drone") as DroneCategory | null;

  const [digitalTwin, setDigitalTwin] = useState<DroneDigitalTwinConfiguration | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<RegionId | null>("city");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const twin = getActiveDigitalTwin(null); // Assuming this retrieves it correctly
      setDigitalTwin(twin);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const handleEnterSimulation = () => {
    if (!selectedRegionId) return;
    router.push(`/fly?drone=${activeCategory || "quadcopter"}&region=${selectedRegionId}`);
  };

  const handleBack = () => {
    if (activeCategory) {
      router.push(`/configure?drone=${activeCategory}`);
    } else {
      router.push("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Loading Environment...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#08090a] text-white overflow-hidden pb-24">
      {/* Step Indicator */}
      <div className="w-full pt-20 border-b border-white/5 bg-[#08090a]/80 backdrop-blur-md relative z-10 safe-area-padding">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4 sm:gap-8 overflow-x-auto custom-scrollbar text-[11px] font-bold tracking-widest text-neutral-500">
          <span className="shrink-0 text-white">01 AIRCRAFT</span>
          <span className="shrink-0 text-neutral-700">/</span>
          <span className="shrink-0 text-white">02 CONFIGURE</span>
          <span className="shrink-0 text-neutral-700">/</span>
          <span className="text-[#FF5500] shrink-0">03 ENVIRONMENT</span>
          <span className="shrink-0 text-neutral-700">/</span>
          <span className="shrink-0 text-neutral-500">04 FLIGHT</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight uppercase mb-3">
            SELECT ENVIRONMENT
          </h1>
          <p className="text-sm text-neutral-400 font-medium">
            Choose the environment in which your configured aircraft will operate.
          </p>
        </div>

        {/* Environment Grid */}
        <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {REGION_LIST.map((region) => {
            const isSelected = selectedRegionId === region.id;
            
            return (
              <div
                key={region.id}
                onClick={() => setSelectedRegionId(region.id as RegionId)}
                className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 min-h-[250px] md:min-h-[360px] bg-[#0c0d0e] border ${
                  isSelected 
                    ? "border-[#FF5500] -translate-y-1" 
                    : "border-white/10 hover:border-white/30 hover:-translate-y-1"
                }`}
              >
                {/* Image Area */}
                <div 
                  className="h-28 md:h-36 w-full relative overflow-hidden bg-neutral-900"
                >
                  <div 
                    className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02]"
                    style={{ backgroundColor: region.mapColor || "#1f1f1f" }}
                  />
                  <div className={`absolute inset-0 transition-opacity duration-300 ${isSelected ? 'bg-black/20' : 'bg-black/40 group-hover:bg-black/30'}`} />
                  
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-[#FF5500] text-white rounded-full p-1 shadow-lg">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col p-4 md:p-5 bg-[#0c0d0e] z-10">
                  <h3 className="text-base md:text-lg font-bold tracking-widest text-white uppercase mb-1 flex items-center justify-between">
                    {region.name}
                  </h3>
                  <p className="text-[11px] md:text-xs text-neutral-400 leading-relaxed line-clamp-2 mb-4">
                    {region.description}
                  </p>
                  
                  <div className="mt-auto pt-3 border-t border-white/5 flex items-center gap-4 text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-neutral-400" />
                      {region.environment.baseWindSpeedMs} m/s
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-neutral-400" />
                      {region.environment.airTemperatureC}°C
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 landscape:py-2 bg-gradient-to-t from-[#08090a] via-[#08090a]/95 to-transparent z-50 pointer-events-none safe-area-pb">
        <div className="max-w-7xl mx-auto flex flex-col-reverse sm:flex-row items-center justify-between gap-2 sm:gap-4 pointer-events-auto px-4 safe-area-padding">
          
          <Button
            onClick={handleBack}
            variant="outline"
            className="w-full sm:w-auto"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            BACK TO CONFIGURATION
          </Button>
          
          <Button
            onClick={handleEnterSimulation}
            disabled={!selectedRegionId}
            variant="primary"
            className="w-full sm:w-auto"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            ENTER SIMULATOR
          </Button>
        </div>
      </div>
    </div>
  );
}
