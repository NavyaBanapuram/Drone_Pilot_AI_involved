const fs = require('fs');

let content = fs.readFileSync('src/components/simulator/island-map-modal.tsx', 'utf8');

// 1. Fix white/light backgrounds
content = content.replaceAll('bg-neutral-100', 'bg-[#050505]');
content = content.replaceAll('bg-neutral-50/90', 'bg-neutral-900');
content = content.replaceAll('bg-neutral-50 ', 'bg-neutral-900 ');
content = content.replaceAll('bg-neutral-50', 'bg-neutral-900');

// 2. Fix text-xl overload
// Remove text-xl from sidebar container
content = content.replaceAll('text-xl custom-scrollbar', 'text-xs custom-scrollbar');
// WAYPOINT TARGET
content = content.replaceAll('text-xl font-bold text-white/50 uppercase', 'text-[10px] font-bold text-white/50 uppercase');
// Bearing
content = content.replaceAll('text-xl font-bold text-[#38bdf8]', 'text-xs font-bold text-[#38bdf8]');
// Title
content = content.replaceAll('font-heading font-extrabold text-xl text-white uppercase', 'font-heading font-extrabold text-lg text-white uppercase');
// Distance
content = content.replaceAll('text-xl text-[#38bdf8] font-mono', 'text-lg text-[#38bdf8] font-mono');
// Description
content = content.replaceAll('text-xl text-white/60 leading-relaxed', 'text-xs text-white/60 leading-relaxed');

// POS/ALT/HDG header text
content = content.replaceAll('text-xl text-white/80', 'text-xs text-white/80');
content = content.replaceAll('text-white/40 text-xl', 'text-white/40 text-xs');
// "Close" button
content = content.replaceAll('text-white/90 text-xl font-bold', 'text-white/90 text-sm font-bold');
// Title
content = content.replaceAll('text-xl sm:text-xl', 'text-lg sm:text-xl');

// Designated Stations
content = content.replaceAll('text-xl font-bold text-white/50 uppercase', 'text-[10px] font-bold text-white/50 uppercase');
// The H badge
content = content.replaceAll('text-xl font-mono border', 'text-sm font-mono border');
// Station Name
content = content.replaceAll('block text-xl leading-tight text-white', 'block text-sm leading-tight text-white');
// Station Subtext
content = content.replaceAll('text-xl text-white/40 uppercase', 'text-[10px] text-white/40 uppercase');
// Station Dist
content = content.replaceAll('text-xl font-mono text-right', 'text-sm font-mono text-right');

// The bottom buttons
content = content.replaceAll('text-xl font-bold tracking-wider', 'text-xs font-bold tracking-wider');

// Zoom buttons
content = content.replaceAll('text-xl font-bold font-mono', 'text-xs font-bold font-mono');
content = content.replaceAll('hover:text-neutral-950', 'hover:text-white');
content = content.replaceAll('bg-neutral-200', 'bg-white/20');

// 3. Fix the SVG Blob
// Change coastline fill from very dark #0a0a0a to slightly lighter/more distinct #0f141e
content = content.replaceAll('fill="#0a0a0a"', 'fill="#0f141e"');
// Change coastline stroke to bright blue
content = content.replaceAll('strokeOpacity="0.15"', 'strokeOpacity="0.3"');

// 4. SVG text labels
content = content.replaceAll('fontSize="11"', 'fontSize="14"');
content = content.replaceAll('fontSize="10"', 'fontSize="12"');

fs.writeFileSync('src/components/simulator/island-map-modal.tsx', content);
console.log('Map patched successfully');
