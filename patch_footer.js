const fs = require('fs');

let content = fs.readFileSync('src/components/simulator/telemetry-hud.tsx', 'utf8');

const footerStart = content.indexOf('<footer');
const footerEnd = content.lastIndexOf('</footer>');

if (footerStart !== -1 && footerEnd !== -1) {
  content = content.substring(0, footerStart) + content.substring(footerEnd + 9);
  fs.writeFileSync('src/components/simulator/telemetry-hud.tsx', content);
  console.log('Footer removed from telemetry-hud.tsx');
} else {
  console.log('Footer not found');
}
