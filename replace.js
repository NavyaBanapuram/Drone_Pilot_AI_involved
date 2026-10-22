const fs = require('fs');

let code = fs.readFileSync('src/lib/digital-twin/digital-twin-storage.ts', 'utf8');

const newFunc = `export async function getUserConfiguration(
  uid: string | null, 
  category: DroneCategory, 
  preferLocal: boolean = false
): Promise<import('@/types/drone-digital-twin').ConfigurationFetchResult> {
  
  if (!uid) {
    return { status: "ERROR", data: null, error: "Unauthenticated" };
  }

  if (isFirebaseConfigured() && db) {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { status: "OFFLINE", data: null, error: "Client is offline" };
      }
      
      const docRef = doc(db, "users", uid, "aircraftConfigurations", category);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Firestore timeout")), 5000)
      );
      
      console.log("FIRESTORE READ START", { OPERATION: "getUserConfiguration", UID: uid, TYPE: category, PATH: \`users/\${uid}/aircraftConfigurations/\${category}\`, START_TIME: Date.now() });
      
      const start = Date.now();
      const snap = await Promise.race([getDoc(docRef), timeoutPromise]);
      const elapsed = Date.now() - start;
      
      if (snap.exists()) {
        console.log("FIRESTORE READ SUCCESS", { UID: uid, TYPE: category, MS: elapsed, END_TIME: Date.now(), RESULT: "SUCCESS" });
        const data = snap.data() as DroneDigitalTwinConfiguration;
        
        // Update local cache
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem(getLocalSavedKey(uid));
            let list: DroneDigitalTwinConfiguration[] = raw ? JSON.parse(raw) : [];
            list = list.filter(c => c.identity.category !== category);
            list.push(data);
            localStorage.setItem(getLocalSavedKey(uid), JSON.stringify(list));
          } catch {}
        }
        
        return { status: "SUCCESS", data };
      } else {
        console.log("FIRESTORE READ NOT_FOUND", { UID: uid, TYPE: category, MS: elapsed, END_TIME: Date.now(), RESULT: "NOT_FOUND" });
        return { status: "NOT_FOUND", data: null };
      }
    } catch (e: any) {
      console.warn("FIRESTORE READ FAILURE", { CODE: e?.code, MESSAGE: e?.message, ERROR: e, RESULT: "ERROR", END_TIME: Date.now() });
      if (e?.message?.includes("offline") || e?.message?.includes("timeout") || e?.code === 'unavailable') {
        return { status: "OFFLINE", data: null, error: e.message };
      }
      return { status: "ERROR", data: null, error: e.message };
    }
  }
  
  return { status: "OFFLINE", data: null, error: "Firebase not configured" };
}`;

const startIndex = code.indexOf('export async function getUserConfiguration(');
const endIndex = code.indexOf('export async function saveUserConfiguration(');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newFunc + '\n\n/**\n * Saves or updates' + code.substring(code.indexOf(' * Saves or updates', endIndex));
  fs.writeFileSync('src/lib/digital-twin/digital-twin-storage.ts', code);
  console.log("Replaced successfully!");
} else {
  console.log("Indices not found", startIndex, endIndex);
}
