const fs = require('fs');

// ===== FIX 1: W/S pitch direction inverted =====
// W should go FORWARD (positive pitch in our coordinate system means nose down = forward motion)
// Currently: W = +1 pitch, S = -1 pitch
// In flight-physics.ts, positive pitch tilts nose BACKWARD because of the -Math.sin(yaw) convention.
// So we need to SWAP: W = -1 (nose forward), S = +1 (nose backward)
let inputMgr = fs.readFileSync('src/lib/simulation/input-manager.ts', 'utf8');
inputMgr = inputMgr.replace(
  `    if (this.keys["KeyW"] || this.keys["ArrowUp"]) kbPitch += 1;\n    if (this.keys["KeyS"] || this.keys["ArrowDown"]) kbPitch -= 1;`,
  `    if (this.keys["KeyW"] || this.keys["ArrowUp"]) kbPitch -= 1;\n    if (this.keys["KeyS"] || this.keys["ArrowDown"]) kbPitch += 1;`
);
// Also fix the double-tap lock directions to match
inputMgr = inputMgr.replace(
  `        if (code === "KeyW") {\n          this.lockedPitch = this.lockedPitch === 1 ? 0 : 1;`,
  `        if (code === "KeyW") {\n          this.lockedPitch = this.lockedPitch === -1 ? 0 : -1;`
);
inputMgr = inputMgr.replace(
  `        } else if (code === "KeyS") {\n          this.lockedPitch = this.lockedPitch === -1 ? 0 : -1;`,
  `        } else if (code === "KeyS") {\n          this.lockedPitch = this.lockedPitch === 1 ? 0 : 1;`
);
// Fix the locked direction labels
inputMgr = inputMgr.replace(
  `    if (this.lockedPitch === 1) return "FWD";\n    if (this.lockedPitch === -1) return "BWD";`,
  `    if (this.lockedPitch === -1) return "FWD";\n    if (this.lockedPitch === 1) return "BWD";`
);
// Fix the single-tap cancellation
inputMgr = inputMgr.replace(
  `        if (code === "KeyW" && this.lockedPitch === -1) this.lockedPitch = 0;\n        if (code === "KeyS" && this.lockedPitch === 1) this.lockedPitch = 0;`,
  `        if (code === "KeyW" && this.lockedPitch === 1) this.lockedPitch = 0;\n        if (code === "KeyS" && this.lockedPitch === -1) this.lockedPitch = 0;`
);
fs.writeFileSync('src/lib/simulation/input-manager.ts', inputMgr);
console.log('FIX 1: W/S pitch direction swapped');

// ===== FIX 2: Motor color threshold too big =====
// At 13% throttle, the mixer differential is only ~3-4%. Threshold of 0.05 means nothing ever triggers.
// Change to 0.01 (1%) so any differential is visible.
let glassPanels = fs.readFileSync('src/components/simulator/glass-panels.tsx', 'utf8');
glassPanels = glassPanels.replaceAll('avgMotorOutput + 0.05', 'avgMotorOutput + 0.01');
glassPanels = glassPanels.replaceAll('avgMotorOutput - 0.05', 'avgMotorOutput - 0.01');
fs.writeFileSync('src/components/simulator/glass-panels.tsx', glassPanels);
console.log('FIX 2: Motor color threshold reduced to 0.01');

// ===== FIX 3: Rewrite WASD overlay with Space/Shift + lock icons =====
const overlay = `import React from "react";
import { MinimapWidget } from "./minimap-widget";
import { Lock, NavigationOff, ArrowUp, ArrowDown } from "lucide-react";

export function FlightControlsOverlay({ telemetry, autoMoveLocked, onToggleMap, sensorHealth }: { telemetry?: any, autoMoveLocked?: string, onToggleMap?: () => void, sensorHealth?: Record<string, boolean> }) {
  const isGpsHealthy = sensorHealth ? sensorHealth['gps'] : true;

  const keyBtn = (label: string, isLocked: boolean, size: string = "w-12 h-12", textSize: string = "text-lg") => (
    <div className={\`\${size} rounded-lg \${isLocked ? 'bg-emerald-500/30 border-emerald-400/80' : 'bg-white/90 border-white/80'} border flex items-center justify-center font-mono \${textSize} font-bold shadow-lg relative \${isLocked ? 'text-emerald-300' : 'text-black'}\`}>
      {label}
      {isLocked && <Lock className="absolute -top-2 -right-2 w-3.5 h-3.5 text-emerald-400" />}
    </div>
  );

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex items-end justify-center gap-10 px-6 py-3">
        
        {/* Throttle Up / Down */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-bold text-white/50 tracking-widest uppercase mb-1">Altitude</span>
          <div className="flex flex-col gap-1 items-center">
            <div className="w-16 h-9 rounded-lg bg-white/90 border border-white/80 flex items-center justify-center text-black font-mono text-[10px] font-bold shadow-lg gap-1">
              <ArrowUp className="w-3 h-3" />SPACE
            </div>
            <div className="w-16 h-9 rounded-lg bg-white/90 border border-white/80 flex items-center justify-center text-black font-mono text-[10px] font-bold shadow-lg gap-1">
              <ArrowDown className="w-3 h-3" />SHIFT
            </div>
          </div>
        </div>

        {/* WASD Direction */}
        <div className="flex flex-col items-center gap-1 relative">
          <span className="text-[9px] font-bold text-white/50 tracking-widest uppercase mb-1">Direction</span>
          
          {telemetry && telemetry.maxThrustToWeightRatio < 1.0 && (
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-rose-500/90 text-white px-3 py-1.5 rounded-lg border border-rose-400 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap animate-bounce shadow-[0_0_15px_rgba(244,63,94,0.5)]">
              OVERLOADED
            </div>
          )}

          <div className={\`flex flex-col items-center gap-1 \${telemetry && telemetry.maxThrustToWeightRatio < 1.0 ? 'opacity-30' : ''}\`}>
            {keyBtn("W", autoMoveLocked === 'FWD')}
            <div className="flex gap-1">
              {keyBtn("A", autoMoveLocked === 'LEFT')}
              {keyBtn("S", autoMoveLocked === 'BWD')}
              {keyBtn("D", autoMoveLocked === 'RIGHT')}
            </div>
          </div>
        </div>

        {/* Radar Map */}
        <div className="flex flex-col items-center gap-1 pointer-events-auto">
          <span className={\`text-[9px] font-bold \${isGpsHealthy ? 'text-white/50' : 'text-rose-500'} tracking-widest uppercase mb-1\`}>
            {isGpsHealthy ? 'Radar Map' : 'GPS OFFLINE'}
          </span>
          {telemetry && isGpsHealthy ? (
            <MinimapWidget telemetry={telemetry} onClick={onToggleMap || (() => {})} />
          ) : (
            <div 
              className="w-24 h-24 rounded-full bg-black/50 border-2 border-rose-500/30 flex flex-col items-center justify-center cursor-pointer hover:bg-rose-900/20 transition-colors shadow-[inset_0_0_20px_rgba(244,63,94,0.2)]"
              onClick={() => alert("GPS Sensor is currently OFFLINE.")}
            >
              <NavigationOff className="w-6 h-6 text-rose-500/50 mb-1" />
              <span className="text-[8px] font-bold text-rose-500/70 tracking-widest text-center px-2">SIGNAL<br/>LOST</span>
            </div>
          )}
        </div>

      </div>

      <button
        onClick={() => {
          if (typeof window !== "undefined") {
            window.location.href = "/fly";
          }
        }}
        className="pointer-events-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-white/80 hover:bg-white text-black backdrop-blur-md border border-white/10 text-xs font-black uppercase tracking-widest transition-all shadow-lg"
      >
        Exit to Dashboard
      </button>

      {autoMoveLocked && (
        <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/30 text-[10px] font-bold tracking-widest uppercase animate-pulse mt-1">
          <Lock className="w-3 h-3" />
          Auto-Navigating {autoMoveLocked}
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync('src/components/simulator/flight-controls-overlay.tsx', overlay);
console.log('FIX 3: WASD overlay rewritten with Space/Shift + lock icons');

console.log('All 3 fixes applied!');
