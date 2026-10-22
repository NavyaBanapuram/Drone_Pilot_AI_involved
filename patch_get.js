const fs = require('fs');
let code = fs.readFileSync('src/lib/digital-twin/digital-twin-storage.ts', 'utf8');

const newFn = [
  "export async function getUserConfiguration(",
  "  uid: string | null, ",
  "  category: DroneCategory, ",
  "  _preferLocal = false",
  "): Promise<ConfigurationFetchResult> {",
  "  if (!uid) {",
  "    return { status: 'ERROR', data: null, error: 'Unauthenticated: no uid provided' };",
  "  }",
  "",
  "  if (isFirebaseConfigured() && db) {",
  "    if (typeof navigator !== 'undefined' && !navigator.onLine) {",
  "      console.warn('FIRESTORE READ SKIPPED - browser reports offline');",
  "      return { status: 'OFFLINE', data: null, error: 'Client is offline' };",
  "    }",
  "",
  "    try {",
  "      const docRef = doc(db, 'users', uid, 'aircraftConfigurations', category);",
  "      const timeoutPromise = new Promise<never>((_, reject) =>",
  "        setTimeout(() => reject(new Error('Firestore timeout after 5s')), 5000)",
  "      );",
  "",
  "      console.log('FIRESTORE READ START', {",
  "        OPERATION: 'getUserConfiguration',",
  "        UID: uid,",
  "        TYPE: category,",
  "        PATH: 'users/' + uid + '/aircraftConfigurations/' + category,",
  "        START_TIME: Date.now(),",
  "      });",
  "",
  "      const snap = await Promise.race([getDoc(docRef), timeoutPromise]);",
  "",
  "      if (snap.exists()) {",
  "        const data = snap.data() as DroneDigitalTwinConfiguration;",
  "        console.log('FIRESTORE READ SUCCESS', { UID: uid, TYPE: category });",
  "",
  "        if (typeof window !== 'undefined') {",
  "          try {",
  "            const raw = localStorage.getItem(getLocalSavedKey(uid));",
  "            let list: DroneDigitalTwinConfiguration[] = raw ? JSON.parse(raw) : [];",
  "            list = list.filter(c => c.identity.category !== category);",
  "            list.push(data);",
  "            localStorage.setItem(getLocalSavedKey(uid), JSON.stringify(list));",
  "          } catch {}",
  "        }",
  "",
  "        return { status: 'SUCCESS', data };",
  "      } else {",
  "        console.log('FIRESTORE READ NOT_FOUND', { UID: uid, TYPE: category });",
  "        return { status: 'NOT_FOUND', data: null };",
  "      }",
  "    } catch (e: any) {",
  "      console.warn('FIRESTORE READ FAILURE', { CODE: e?.code, MESSAGE: e?.message });",
  "      const isOffline = e?.message?.includes('offline') || e?.message?.includes('timeout') || e?.code === 'unavailable' || (typeof navigator !== 'undefined' && !navigator.onLine);",
  "      if (isOffline) return { status: 'OFFLINE', data: null, error: e.message };",
  "      return { status: 'ERROR', data: null, error: e.message };",
  "    }",
  "  }",
  "",
  "  return { status: 'OFFLINE', data: null, error: 'Firebase not configured' };",
  "}",
].join('\n');

// Find function boundaries
const startIdx = code.indexOf('export async function getUserConfiguration(');
const endIdx = code.indexOf('\n/**', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + newFn + '\n\n' + code.substring(endIdx).trimStart();
  fs.writeFileSync('src/lib/digital-twin/digital-twin-storage.ts', code);
  console.log('Replaced successfully');
} else {
  console.log('Could not find function boundaries', startIdx, endIdx);
}
