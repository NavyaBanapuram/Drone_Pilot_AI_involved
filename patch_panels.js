const fs = require('fs');

let content = fs.readFileSync('src/components/simulator/glass-panels.tsx', 'utf8');

// Update card background classes for a premium dark look
content = content.replaceAll('bg-white/5', 'bg-[#080808]/90 backdrop-blur-md shadow-xl');
content = content.replaceAll("bg-black/40 border-rose-900/50 hover:bg-black/60", "bg-neutral-900 border-rose-900/50 hover:bg-neutral-800");

// Update scrollbar visibility
content = content.replaceAll('[&::-webkit-scrollbar-thumb]:bg-white/10', '[&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/50');
content = content.replaceAll('[&::-webkit-scrollbar-track]:bg-transparent', '[&::-webkit-scrollbar-track]:bg-black/40');

fs.writeFileSync('src/components/simulator/glass-panels.tsx', content);
console.log('glass-panels updated');
