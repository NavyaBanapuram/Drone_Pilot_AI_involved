const fs = require('fs');
let content = fs.readFileSync('src/components/simulator/flight-simulator.tsx', 'utf8');

content = content.replace(
  /\{!isLoading && <FlightCoachPanel[\s\S]*?onClearHistory=\{\(\) => setInsightHistory\(\[\]\)\}\s+\/>/g,
  match => match + '}'
);

fs.writeFileSync('src/components/simulator/flight-simulator.tsx', content);
