const fs = require('fs');

let code = fs.readFileSync('src/components/digital-twin/digital-twin-configurator.tsx', 'utf8');

const regex = /const existing = await getUserConfiguration\(user\?.uid \|\| null, category\);\s*if \(existing\) \{\s*setConfig\(existing\);\s*\} else \{/g;

const replacement = `const existing = await getUserConfiguration(user?.uid || null, category);
        
        if (existing.status === "SUCCESS" && existing.data) {
          // deep clone so we don't mutate the fetched object
          setConfig(JSON.parse(JSON.stringify(existing.data)));
        } else {`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/digital-twin/digital-twin-configurator.tsx', code);
console.log("Configurator fixed successfully");
