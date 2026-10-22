import React from "react";
import Link from "next/link";
import Image from "next/image";
import { DroneIcon } from "@/components/ui/drone-icon";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#08090a] text-white overflow-x-hidden font-sans selection:bg-[#FF5500] selection:text-white">
      {/* Dark Technical Blueprint Background */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-[#08090a]">
        <Image
          src="/Final-Baground.png"
          alt="Technical Drone Flight Blueprint Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-10 invert mix-blend-screen"
        />
        {/* Subtle vignette gradient over the background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#08090a_100%)] opacity-80" />
      </div>

      {/* Dark Technical Navigation Bar matching DashboardHeader */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-black/40 backdrop-blur-md px-4 sm:px-10 py-4 sm:py-5 border-b border-white/5 safe-area-padding">
        {/* Subtle Orange Accent Line at the top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF5500] to-transparent opacity-50" />
        
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF5500] rounded"
        >
          <DroneIcon invert={true} className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-105 shrink-0" />
          <span className="font-machinic text-base sm:text-xl font-bold tracking-widest text-white uppercase flex items-center gap-2 whitespace-nowrap">
            DRONE <span className="text-[#FF5500] font-medium">PILOT</span>
          </span>
        </Link>
      </header>

      {/* Main Form Container */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-3.5 py-4 pt-24 sm:pt-24 sm:px-6 sm:py-6 w-full">
        {children}
      </main>
    </div>
  );
}
