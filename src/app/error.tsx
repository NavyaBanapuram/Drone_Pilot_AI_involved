"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Application Exception:", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF7F2] p-4 text-neutral-900 font-mono">
      <div className="max-w-md w-full rounded-2xl bg-white border border-neutral-300 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 text-rose-600">
          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider uppercase text-neutral-900">
              System Exception Encountered
            </h2>
            <p className="text-xs text-neutral-500">
              Simulation or view rendering encountered an error.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 font-mono break-words">
          <span className="font-semibold text-rose-700">Error:</span>{" "}
          {error.message || "An unexpected error occurred in the simulation runtime."}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold tracking-wider uppercase transition shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Attempt Recovery</span>
          </button>

          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold tracking-wider uppercase transition shadow-2xs"
          >
            <Home className="h-4 w-4" />
            <span>Hangar</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
