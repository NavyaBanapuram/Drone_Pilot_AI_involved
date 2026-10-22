const fs = require('fs');

let content = fs.readFileSync('src/components/simulator/flight-controls-overlay.tsx', 'utf8');

// 1. Move Altitude block between Direction and Radar Map
const altitudeBlock = `        {/* Throttle Up / Down */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-bold text-white/50 tracking-widest uppercase mb-1">Altitude</span>
          <div className="flex flex-col gap-1 items-center">
            <div className="w-16 h-12 rounded-lg bg-white/90 border border-white/80 flex items-center justify-center text-black font-mono text-[10px] font-bold shadow-lg gap-1">
              <ArrowUp className="w-3 h-3" />SPACE
            </div>
            <div className="w-16 h-12 rounded-lg bg-white/90 border border-white/80 flex items-center justify-center text-black font-mono text-[10px] font-bold shadow-lg gap-1">
              <ArrowDown className="w-3 h-3" />SHIFT
            </div>
          </div>
        </div>`;

// Remove original altitude block
content = content.replace(/        \{\/\* Throttle Up \/ Down \*\/\}[\s\S]*?<\/div>\n        <\/div>\n\n/m, '');

// Insert it before Radar map
content = content.replace('        {/* Radar Map */}', altitudeBlock + '\n\n        {/* Radar Map */}');

fs.writeFileSync('src/components/simulator/flight-controls-overlay.tsx', content);
console.log('FlightControlsOverlay updated');
