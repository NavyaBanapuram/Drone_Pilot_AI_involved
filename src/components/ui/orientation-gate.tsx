"use client";

import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";

export function OrientationGate() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if it's a mobile device and in portrait mode
      const isMobile = window.innerWidth <= 768; // Adjust threshold as needed
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      
      setIsPortrait(isMobile && portrait);
    };

    // Initial check
    checkOrientation();

    // Listen for resize and orientation changes
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    // Attempt to lock orientation if supported (e.g. Android PWA)
    if (typeof screen !== 'undefined' && screen.orientation && (screen.orientation as any).lock) {
      (screen.orientation as any).lock("landscape").catch(() => {
        // Silently ignore if not supported or not allowed
      });
    }

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  if (!isPortrait) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none safe-area-padding">
      <div className="max-w-sm w-full flex flex-col items-center gap-8">
        <h2 className="text-xl font-bold tracking-[0.2em] text-zinc-200">
          ROTATE DEVICE
        </h2>
        
        <div className="w-32 h-32 flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
          <RotateCw className="w-16 h-16 text-orange-500" strokeWidth={1.5} />
        </div>
        
        <div className="space-y-4">
          <p className="text-zinc-400 font-medium">
            DRONE PILOT IS OPTIMIZED FOR<br />LANDSCAPE FLIGHT.
          </p>
          <p className="text-sm text-zinc-500">
            Rotate your phone to continue.
          </p>
        </div>
      </div>
    </div>
  );
}
