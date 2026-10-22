"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/route-guard";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DRONES, getDroneById } from "@/lib/drones";
import { Drone3DViewer } from "@/components/dashboard/drone-3d-viewer";
import { Button } from "@/components/ui/button";
import { Settings2, Play } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export default function AircraftHangarPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>("aero-trainer-x4");
  const { user } = useAuth();

  const [savedConfigs, setSavedConfigs] = useState<import("@/types/drone-digital-twin").DroneDigitalTwinConfiguration[]>([]);

  // Load last selected drone
  React.useEffect(() => {
    import("@/lib/digital-twin/digital-twin-storage").then((mod) => {
      mod.getLastSelectedDrone(user?.uid || null).then((cat) => {
        const match = DRONES.find((d) => d.platformId === cat);
        if (match) setSelectedId(match.id);
      });
      mod.listUserConfigurations(user?.uid || null).then(setSavedConfigs);
    });
  }, [user]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const drone = DRONES.find((d) => d.id === id);
    if (drone) {
      import("@/lib/digital-twin/digital-twin-storage").then((mod) => {
        mod.setLastSelectedDrone(
          user?.uid || null,
          drone.platformId as import("@/types/drone-digital-twin").DroneCategory
        );
      });
    }
  };

  const showcaseDrones = useMemo(() => {
    const quad = DRONES.find((d) => d.platformId === "quadcopter");
    const hexa = DRONES.find((d) => d.platformId === "hexacopter");
    const octa = DRONES.find((d) => d.platformId === "octacopter");
    return [quad, hexa, octa].filter(Boolean) as typeof DRONES;
  }, []);

  const activeDrone = useMemo(() => getDroneById(selectedId), [selectedId]);

  const getSpecs = () => {
    const saved = savedConfigs.find(
      (c) => c.identity.category === activeDrone?.platformId
    );
    return {
      mass: saved
        ? saved.massProperties.totalMassKg
        : activeDrone?.baseMassKg ?? 0,
      payload: saved ? saved.payload.massKg : 0,
      battery: saved
        ? saved.battery.cellCount + "S"
        : activeDrone?.batteryCells + "S",
      motors: saved
        ? saved.airframe.motorCount
        : activeDrone?.platformId === "quadcopter"
        ? 4
        : activeDrone?.platformId === "hexacopter"
        ? 6
        : 8,
    };
  };

  const specs = getSpecs();

  return (
    <ProtectedRoute>
      {/* Full-screen dark background */}
      <div className="relative h-screen w-full flex flex-col bg-[#08090a] text-white overflow-hidden">
        {/* Nav */}
        <div className="absolute inset-0 z-0">{activeDrone && <Drone3DViewer key={activeDrone.platformId} type={activeDrone.platformId} interactive={true} autoRotate={true} isSelected={true} className="w-full h-full" />}</div> <DashboardHeader /> <div className="flex flex-1 min-h-0 overflow-hidden relative pt-14 pointer-events-none">

          {/* FOREGROUND LAYER â€” UI (Flex columns) */}
          <div className="relative z-10 w-full h-full flex justify-between pointer-events-none">
            
            {/* LEFT â€” Drone selector */}
            <div className="w-52 shrink-0 flex flex-col justify-center gap-1 px-6 border-r border-white/[0.05] pointer-events-auto">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-600 mb-4">
                Select Drone
              </p>
              {showcaseDrones.map((drone) => {
                const active = drone.id === selectedId;
                return (
                  <button
                    key={drone.id}
                    onClick={() => handleSelect(drone.id)}
                    className={`relative flex items-center text-left py-3 px-4 rounded-lg transition-all duration-200 ${
                      active
                        ? "text-white"
                        : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* Active orange bar */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[#FF5500]" />
                    )}
                    <span className="text-[13px] font-bold tracking-[0.12em] uppercase pl-2">
                      {drone.platformId}
                    </span>
                  </button>
                );
              })}
            </div>

          {/* RIGHT â€” Specs + actions */}
          <div className="w-72 shrink-0 flex flex-col justify-center gap-6 px-8 border-l border-white/[0.05] pointer-events-auto">
            {/* Name */}
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight uppercase leading-none">
                {activeDrone?.platformId}
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF5500] mt-1">
                {activeDrone?.missionCategory} Platform
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/[0.07]" />

            {/* Specs grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
              {[
                { label: "Total Mass", value: `${specs.mass.toFixed(2)}`, unit: "kg" },
                { label: "Propulsion", value: `${specs.motors}`, unit: "Motors" },
                { label: "Payload", value: `${specs.payload.toFixed(2)}`, unit: "kg" },
                { label: "Battery", value: specs.battery, unit: "" },
              ].map(({ label, value, unit }) => (
                <div key={label}>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white leading-none">
                      {value}
                    </span>
                    {unit && (
                      <span className="text-[11px] text-neutral-500 font-medium">
                        {unit}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-600 mt-1">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
              <span>GPS Hold</span>
              <span className="text-neutral-700">Â·</span>
              <span>RTK GNSS</span>
              <span className="text-neutral-700">Â·</span>
              <span>{activeDrone?.batteryCells}S</span>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={() =>
                  router.push(`/fly?drone=${activeDrone?.platformId || "quadcopter"}&region=coast`)
                }
                variant="primary"
                className="w-full h-12 text-[13px] font-bold flex items-center justify-center gap-2.5 bg-[#FF5500] hover:bg-[#e04b00] text-white shadow-lg shadow-[#FF5500]/25 cursor-pointer"
                leftIcon={<Play className="w-4 h-4 fill-current" />}
              >
                Launch Simulation
              </Button>

              <Button
                onClick={() =>
                  router.push(`/configure?drone=${activeDrone?.platformId}`)
                }
                variant="black"
                className="w-full h-12 text-[13px] font-bold flex items-center justify-center gap-2.5 border border-white/10 hover:border-white/30 cursor-pointer"
                leftIcon={<Settings2 className="w-4 h-4" />}
              >
                Configure Aircraft
              </Button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}



