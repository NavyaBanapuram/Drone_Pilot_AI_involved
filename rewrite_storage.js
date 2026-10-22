const fs = require('fs');
let code = fs.readFileSync('src/lib/digital-twin/digital-twin-storage.ts', 'utf8');

// 1. Rename droneConfigurations -> aircraftConfigurations
code = code.replace(/droneConfigurations/g, 'aircraftConfigurations');

// 2. Add offline check to saveUserConfiguration
code = code.replace(
  'console.log("FIRESTORE WRITE START"',
  `if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error("Client is offline. Cannot save to Firestore.");
      }

      console.log("FIRESTORE WRITE START"`
);

// 3. Replace getUserConfiguration
const getUserRegex = /export async function getUserConfiguration\(uid: string \| null, category: DroneCategory, preferLocal = false\): Promise<DroneDigitalTwinConfiguration \| null> \{[\s\S]*?return null;\n\}/;
const getUserRepl = `export async function getUserConfiguration(
  uid: string | null, 
  category: DroneCategory, 
  preferLocal = false
): Promise<import('@/types/drone-digital-twin').ConfigurationFetchResult> {
  if (!uid) return { status: "ERROR", data: null, error: "Unauthenticated" };

  if (isFirebaseConfigured() && db) {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { status: "OFFLINE", data: null, error: "Client is offline" };
      }
      
      const docRef = doc(db, "users", uid, "aircraftConfigurations", category);
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 5000));
      
      const snap = await Promise.race([getDoc(docRef), timeoutPromise]);
      
      if (snap.exists()) {
        const data = snap.data() as DroneDigitalTwinConfiguration;
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
        return { status: "NOT_FOUND", data: null };
      }
    } catch (e: any) {
      console.warn("FIRESTORE READ FAILURE", e);
      if (e?.message?.includes("offline") || e?.message?.includes("timeout") || e?.code === 'unavailable') {
        return { status: "OFFLINE", data: null, error: e.message };
      }
      return { status: "ERROR", data: null, error: e.message };
    }
  }
  
  return { status: "OFFLINE", data: null, error: "Firebase not configured" };
}`;

code = code.replace(getUserRegex, getUserRepl);

// 4. listUserConfigurations
const getListRegex = /export async function listUserConfigurations\(uid: string \| null\): Promise<DroneDigitalTwinConfiguration\[\]> \{[\s\S]*?return Array\.from\(customMap\.values\(\)\);\n\}/;
const getListRepl = `export async function listUserConfigurations(uid: string | null): Promise<DroneDigitalTwinConfiguration[]> {
  const customMap = new Map<string, DroneDigitalTwinConfiguration>();
  
  if (uid && isFirebaseConfigured() && db) {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error("offline");
      
      const colRef = collection(db, "users", uid, "aircraftConfigurations");
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 5000));
      const snap = await Promise.race([getDocs(colRef), timeoutPromise]);
      
      snap.forEach((docSnap) => {
        const data = docSnap.data() as DroneDigitalTwinConfiguration;
        if (data?.identity?.category) customMap.set(data.identity.category, data);
      });
      return Array.from(customMap.values());
    } catch (e: any) {
      console.warn("Firestore list configurations error:", e);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(getLocalSavedKey(uid));
      if (raw) {
        const customConfigs: DroneDigitalTwinConfiguration[] = JSON.parse(raw);
        customConfigs.forEach((c) => {
          if (c?.identity?.category) customMap.set(c.identity.category, c);
        });
      }
    } catch {}
  }

  return Array.from(customMap.values());
}`;

code = code.replace(getListRegex, getListRepl);

// 5. Empty out migration
const migRegex = /async function migrateLegacyConfigurations\(uid: string\): Promise<void> \{[\s\S]*?\n\}/;
const migRepl = `async function migrateLegacyConfigurations(uid: string): Promise<void> {}`;
code = code.replace(migRegex, migRepl);

// 6. getLastSelectedDrone timeout fix (make sure it's tight)
const lastDroneRegex = /export async function getLastSelectedDrone\(uid: string \| null\): Promise<DroneCategory> \{[\s\S]*?return "quadcopter";\n\}/;
const lastDroneRepl = `export async function getLastSelectedDrone(uid: string | null): Promise<DroneCategory> {
  if (!uid) return "quadcopter";
  if (isFirebaseConfigured() && db) {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error("offline");
      const userRef = doc(db, "users", uid);
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000));
      const snap = await Promise.race([getDoc(userRef), timeoutPromise]);
      if (snap.exists() && snap.data().lastSelectedDrone) {
        return snap.data().lastSelectedDrone as DroneCategory;
      }
    } catch (e) {
      console.warn("getLastSelectedDrone error:", e);
    }
  }
  return "quadcopter";
}`;
code = code.replace(lastDroneRegex, lastDroneRepl);

fs.writeFileSync('src/lib/digital-twin/digital-twin-storage.ts', code);
console.log("Rewrote storage cleanly!");
