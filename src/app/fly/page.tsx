"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/route-guard";
import { DEFAULT_DRONE_STORAGE_KEY, getDroneById, DRONES } from "@/lib/drones";
import { DroneModel } from "@/types/drone";
import { FlightSimulator } from "@/components/simulator/flight-simulator";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getUserConfiguration } from "@/lib/digital-twin/digital-twin-storage";
import { DroneDigitalTwinConfiguration, DroneCategory } from "@/types/drone-digital-twin";

export default function FlyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedDrone, setSelectedDrone] = useState<DroneModel | null>(null);
  const [initialConfig, setInitialConfig] = useState<DroneDigitalTwinConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const urlDrone = params?.get("drone");

        let activeDrone = DRONES[0];

        if (urlDrone) {
          const found = getDroneById(urlDrone);
          if (found) {
            activeDrone = found;
          }
        } else {
          const storedId = localStorage.getItem(DEFAULT_DRONE_STORAGE_KEY);
          if (storedId) {
            const drone = getDroneById(storedId);
            if (drone) activeDrone = drone;
          }
        }

        if (!isMounted) return;
        setSelectedDrone(activeDrone);
        
        // Fetch specific config
        const uid = user ? user.uid : null;
        const fetchResult = await getUserConfiguration(uid, activeDrone.platformId as DroneCategory);
        if (!isMounted) return;
        
        if (fetchResult.status === "SUCCESS" && fetchResult.data) {
          setInitialConfig(fetchResult.data);
        }
        // NOT_FOUND, OFFLINE, or ERROR with null uid = no saved config, simulator will use preset fallback
        // Only show error for authenticated users who failed to load
        if (fetchResult.status === "ERROR" && uid) {
          setErrorMsg("Unable to load aircraft configuration.");
        }
        
      } catch (err) {
        console.error(err);
        if (isMounted) setErrorMsg("Unable to load aircraft configuration.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [user]);

  const handleExitToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <ProtectedRoute>
      {!loading && !errorMsg && selectedDrone ? (
        <FlightSimulator
          selectedDrone={selectedDrone}
          initialDigitalTwin={initialConfig || undefined}
          onExit={handleExitToDashboard}
        />
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#08090a] text-white">
          <div className="flex flex-col items-center gap-6">
            {errorMsg ? (
              <div className="flex flex-col items-center gap-4">
                <p className="font-heading font-bold text-xs uppercase tracking-widest text-rose-500">
                  {errorMsg}
                </p>
                <button
                  onClick={handleExitToDashboard}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-none border border-white/10 text-xs font-bold tracking-widest transition-colors"
                >
                  RETURN TO HANGAR
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center max-w-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-2 h-2 bg-[#FF5500] animate-pulse"></div>
                  <h1 className="font-heading text-lg font-bold tracking-[0.25em]">DRONE<span className="text-neutral-500">PILOT</span></h1>
                </div>
                
                <div className="w-64 h-px bg-white/10 relative overflow-hidden mb-4">
                  <div className="absolute top-0 left-0 h-full w-1/3 bg-[#FF5500] animate-[slide_1.5s_ease-in-out_infinite]"></div>
                </div>

                <p className="font-heading font-bold text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  INITIALIZING FLIGHT SIMULATION...
                </p>
                
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes slide {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(300%); }
                  }
                `}} />
              </div>
            )}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}