const fs = require('fs');
let code = fs.readFileSync('src/lib/digital-twin/digital-twin-storage.ts', 'utf8');

// Replace the listUserConfigurations body
const oldList = [
  'export async function listUserConfigurations(uid: string | null): Promise<DroneDigitalTwinConfiguration[]> {\r',
  '  const customMap = new Map<string, DroneDigitalTwinConfiguration>();\r',
  '  \r',
  '  if (uid && isFirebaseConfigured() && db) {\r',
  '    await migrateLegacyConfigurations(uid);\r',
  '    \r',
  '    try {\r',
  '      const colRef = collection(db, "users", uid, "aircraftConfigurations");\r',
  '      const snap = await getDocs(colRef);\r',
  '      \r',
  '      snap.forEach((docSnap) => {\r',
  '        const data = docSnap.data() as DroneDigitalTwinConfiguration;\r',
  '        if (data?.identity?.category) {\r',
  '          customMap.set(data.identity.category, data);\r',
  '        }\r',
  '      });\r',
  '      return Array.from(customMap.values());\r',
  '    } catch (e: any) {\r',
  '      console.warn("Firestore list configurations error:", e);\r',
  '    }\r',
  '  }\r',
  '\r',
  '  // LocalStorage fallback\r',
  '  if (typeof window !== "undefined") {\r',
  '    try {\r',
  '      const raw = localStorage.getItem(getLocalSavedKey(uid));\r',
  '      if (raw) {\r',
  '        const customConfigs: DroneDigitalTwinConfiguration[] = JSON.parse(raw);\r',
  '        customConfigs.forEach((c) => {\r',
  '          if (c?.identity?.category) {\r',
  '            customMap.set(c.identity.category, c);\r',
  '          }\r',
  '        });\r',
  '      }\r',
  '    } catch {}\r',
  '  }\r',
  '\r',
  '  return Array.from(customMap.values());\r',
  '}',
].join('\n');

const newList = [
  'export async function listUserConfigurations(uid: string | null): Promise<DroneDigitalTwinConfiguration[]> {',
  '  const customMap = new Map<string, DroneDigitalTwinConfiguration>();',
  '',
  '  if (uid && isFirebaseConfigured() && db) {',
  '    if (!(typeof navigator !== "undefined" && !navigator.onLine)) {',
  '      try {',
  '        const colRef = collection(db, "users", uid, "aircraftConfigurations");',
  '        const timeoutPromise = new Promise<never>((_, reject) =>',
  '          setTimeout(() => reject(new Error("Firestore timeout")), 5000)',
  '        );',
  '        const snap = await Promise.race([getDocs(colRef), timeoutPromise]);',
  '        snap.forEach((docSnap) => {',
  '          const data = docSnap.data() as DroneDigitalTwinConfiguration;',
  '          if (data?.identity?.category) customMap.set(data.identity.category, data);',
  '        });',
  '        return Array.from(customMap.values());',
  '      } catch (e: any) {',
  '        console.warn("Firestore list configurations error:", e);',
  '      }',
  '    }',
  '  }',
  '',
  '  // LocalStorage fallback',
  '  if (typeof window !== "undefined") {',
  '    try {',
  '      const raw = localStorage.getItem(getLocalSavedKey(uid));',
  '      if (raw) {',
  '        const customConfigs: DroneDigitalTwinConfiguration[] = JSON.parse(raw);',
  '        customConfigs.forEach((c) => {',
  '          if (c?.identity?.category) customMap.set(c.identity.category, c);',
  '        });',
  '      }',
  '    } catch {}',
  '  }',
  '',
  '  return Array.from(customMap.values());',
  '}',
].join('\n');

if (code.includes(oldList)) {
  code = code.replace(oldList, newList);
  fs.writeFileSync('src/lib/digital-twin/digital-twin-storage.ts', code);
  console.log('listUserConfigurations patched successfully');
} else {
  // Try splitting by lines independently and find the block  
  const startIdx = code.indexOf('export async function listUserConfigurations(');
  const endIdx = code.indexOf('\n\n/**', startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + newList + code.substring(endIdx);
    fs.writeFileSync('src/lib/digital-twin/digital-twin-storage.ts', code);
    console.log('listUserConfigurations patched via index');
  } else {
    console.log('Could not patch listUserConfigurations');
  }
}
