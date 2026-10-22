const fs = require('fs');

let content = fs.readFileSync('src/components/simulator/glass-panels.tsx', 'utf8');

// Remove card bg/border/shadow from BOTH the left and right outer panel divs
// Pattern: `rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/5 p-6 flex flex-col gap-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]`
// Replace with just: `p-6 flex flex-col gap-6`
content = content.replaceAll(
  'rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/5 p-6 flex flex-col gap-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]',
  'p-6 flex flex-col gap-6'
);

fs.writeFileSync('src/components/simulator/glass-panels.tsx', content);
console.log('patched panel outer divs');
