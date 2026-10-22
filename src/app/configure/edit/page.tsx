"use client";

import React from "react";
import { ProtectedRoute } from "@/components/auth/route-guard";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DigitalTwinConfigurator } from "@/components/digital-twin/digital-twin-configurator";

export default function ConfigureEditPage() {
  return (
    <ProtectedRoute>
      <div className="relative min-h-screen w-full max-w-full flex flex-col justify-between bg-[#08090a] text-white overflow-x-hidden font-sans">
        {/* Subtle Dark Ambient Background */}
        <div 
          className="fixed inset-0 z-0 pointer-events-none opacity-40"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255,85,0,0.03) 0%, transparent 60%)',
          }}
        />

        {/* Dashboard Header */}
        <DashboardHeader />

        {/* Step Indicator */}
        <div className="w-full border-b border-white/5 bg-[#08090a]/80 backdrop-blur-md relative z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4 sm:gap-8 overflow-x-auto scrollbar-none text-[11px] font-bold tracking-widest text-neutral-500">
            <span className="shrink-0 text-white">01 AIRCRAFT</span>
            <span className="shrink-0 text-neutral-700">/</span>
            <span className="text-[#FF5500] shrink-0">02 CONFIGURE</span>
            <span className="shrink-0 text-neutral-700">/</span>
            <span className="shrink-0 text-neutral-500">03 ENVIRONMENT</span>
            <span className="shrink-0 text-neutral-700">/</span>
            <span className="shrink-0 text-neutral-500">04 PREFLIGHT</span>
            <span className="shrink-0 text-neutral-700">/</span>
            <span className="shrink-0 text-neutral-500">05 FLIGHT</span>
          </div>
        </div>

        {/* Main Workstation Container */}
        <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <DigitalTwinConfigurator />
        </main>
      </div>
    </ProtectedRoute>
  );
}
