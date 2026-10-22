const fs = require('fs');

let content = fs.readFileSync('src/components/simulator/island-map-modal.tsx', 'utf8');

// SVG Container bg
// It's bg-[#030712], we can leave it.

// Grid Pattern
content = content.replace(
  '<path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.05" />',
  '<path d="M 40 0 L 0 0 0 40" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.15" />'
);

// Coastline
content = content.replace(
  'fill="#0f141e"\n                  stroke="#ffffff"\n                  strokeWidth="1.5"\n                  strokeOpacity="0.3"',
  'fill="#050a12"\n                  stroke="#38bdf8"\n                  strokeWidth="1.5"\n                  strokeOpacity="0.4"'
);

// Roads
content = content.replace(
  '<g fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeLinecap="round" strokeLinejoin="round">',
  '<g fill="none" stroke="#38bdf8" strokeOpacity="0.25" strokeLinecap="round" strokeLinejoin="round">'
);

// Waypoint Line
content = content.replace(
  'stroke="#ffffff"\n                  strokeWidth="2.2"\n                  strokeDasharray="6 4"\n                  opacity="0.85"',
  'stroke="#38bdf8"\n                  strokeWidth="2.2"\n                  strokeDasharray="6 4"\n                  opacity="0.85"'
);

// Active Waypoint Pulse Ring
content = content.replace(
  'stroke="#ffffff" strokeWidth="2" className="animate-ping" opacity="0.75"',
  'stroke="#38bdf8" strokeWidth="2" className="animate-ping" opacity="0.75"'
);

// Inactive Waypoint Points
content = content.replace(
  'fill={isSelected ? "#ffffff" : "#000000"}\n                        stroke="#ffffff"',
  'fill={isSelected ? "#38bdf8" : "#000000"}\n                        stroke="#38bdf8"'
);

fs.writeFileSync('src/components/simulator/island-map-modal.tsx', content);
console.log('SVG patched successfully');
