"use client";

import React, { Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/route-guard";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FlightPrepContainer } from "@/components/flight-prep/flight-prep-container";
import { Loader2 } from "lucide-react";

function FlightPrepLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08090a]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 text-[#FF5500] animate-spin" />
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-600">
          LOADING TACTICAL AIRSPACE DATA...
        </span>
      </div>
    </div>
  );
}

export default function FlightSelectPage() {
  return (
    <ProtectedRoute>
      <div className="relative min-h-dvh flex flex-col justify-between bg-[#08090a] text-white">
        <DashboardHeader />
        <Suspense fallback={<FlightPrepLoading />}>
          <FlightPrepContainer />
        </Suspense>
      </div>
    </ProtectedRoute>
  );
}
