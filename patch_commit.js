const fs = require('fs');
let code = fs.readFileSync('src/lib/digital-twin/digital-twin-storage.ts', 'utf8');

// Add timeout to batch.commit()
const old = '      await batch.commit();\n';
const newer = [
  '      const writeTimeoutPromise = new Promise<never>((_, reject) =>',
  '        setTimeout(() => reject(new Error("Firestore write timeout after 5s")), 5000)',
  '      );',
  '      await Promise.race([batch.commit(), writeTimeoutPromise]);',
  '',
].join('\n');

if (code.includes(old)) {
  code = code.replace(old, newer);
  fs.writeFileSync('src/lib/digital-twin/digital-twin-storage.ts', code);
  console.log('batch.commit() timeout added');
} else {
  console.log('Could not find batch.commit() line');
}
