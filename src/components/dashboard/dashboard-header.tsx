"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { DroneIcon } from "@/components/ui/drone-icon";
import { LogOut, User } from "lucide-react";

export function DashboardHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleSignOut = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "Pilot";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-black/50 backdrop-blur-lg px-4 sm:px-10 py-3 border-b border-white/[0.06]">
      {/* Orange accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF5500]/50 to-transparent" />

      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-2.5 group shrink-0">
        <DroneIcon
          invert={true}
          className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-105 shrink-0"
        />
        <span className="text-base sm:text-lg font-bold tracking-[0.18em] text-white uppercase whitespace-nowrap">
          DRONE <span className="text-[#FF5500]">PILOT</span>
        </span>
      </Link>

      {/* Right: callsign + sign out */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-xs sm:text-sm text-neutral-400 font-mono tracking-wider">
          <User className="h-3.5 w-3.5 text-[#FF5500] shrink-0" />
          <span>
            <span className="text-neutral-600">CALL SIGN </span>
            <strong className="font-bold text-white uppercase">{displayName}</strong>
          </span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold tracking-wider text-neutral-500 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05] cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">SIGN OUT</span>
        </button>
      </div>
    </header>
  );
}
