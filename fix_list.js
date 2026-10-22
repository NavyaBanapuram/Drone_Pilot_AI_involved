const fs = require('fs');

let code = fs.readFileSync('src/lib/digital-twin/digital-twin-storage.ts', 'utf8');

const regexMigration = /async function migrateLegacyConfigurations\(uid: string\): Promise<void> \{[\s\S]*?\n\}/;
const replaceMigration = `async function migrateLegacyConfigurations(uid: string): Promise<void> {
  // Migration disabled
}`;

code = code.replace(regexMigration, replaceMigration);

const regexList = /export async function listUserConfigurations\(uid: string \| null\): Promise<DroneDigitalTwinConfiguration\[\]> \{[\s\S]*?\n\}/;
const replaceList = `export async function listUserConfigurations(uid: string | null): Promise<DroneDigitalTwinConfiguration[]> {
  const customMap = new Map<string, DroneDigitalTwinConfiguration>();
  
  if (uid && isFirebaseConfigured() && db) {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error("offline");
      }
      
      const colRef = collection(db, "users", uid, "aircraftConfigurations");
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Firestore timeout")), 5000)
      );
      const snap = await Promise.race([getDocs(colRef), timeoutPromise]);
      
      snap.forEach((docSnap) => {
        const data = docSnap.data() as DroneDigitalTwinConfiguration;
        if (data?.identity?.category) {
          customMap.set(data.identity.category, data);
        }
      });
      return Array.from(customMap.values());
    } catch (e: any) {
      console.warn("Firestore list configurations error:", e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(getLocalSavedKey(uid));
      if (raw) {
        const customConfigs: DroneDigitalTwinConfiguration[] = JSON.parse(raw);
        customConfigs.forEach((c) => {
          if (c?.identity?.category) {
            customMap.set(c.identity.category, c);
          }
        });
      }
    } catch {}
  }

  return Array.from(customMap.values());
}`;

code = code.replace(regexList, replaceList);

fs.writeFileSync('src/lib/digital-twin/digital-twin-storage.ts', code);
console.log("Rewrote listUserConfigurations and migrateLegacyConfigurations");
