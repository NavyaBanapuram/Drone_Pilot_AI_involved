import React from "react";
import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF7F2] p-4 text-neutral-900 font-mono">
      <div className="max-w-md w-full rounded-2xl bg-white border border-neutral-300 p-8 shadow-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <Compass className="h-6 w-6 animate-pulse" />
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">404</h1>
          <h2 className="text-xs uppercase font-bold tracking-widest text-neutral-500 mt-1">
            Airspace Sector Not Found
          </h2>
          <p className="text-xs text-neutral-600 mt-2">
            The requested flight navigation route or resource does not exist in the simulation database.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition shadow-sm"
          >
            <Home className="h-4 w-4" />
            <span>Return to Hangar</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
