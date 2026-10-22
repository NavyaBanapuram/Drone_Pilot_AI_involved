import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig, isFirebaseConfigured } from "./config";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore | null = null;

// Fallback dummy config to prevent runtime SDK initialization crash when .env.local is not yet populated
const fallbackConfig = {
  apiKey: "AIzaSyDronePilotPlaceholderKeyDemoOnly000",
  authDomain: "drone-pilot-flight-lab.firebaseapp.com",
  projectId: "drone-pilot-flight-lab",
  storageBucket: "drone-pilot-flight-lab.appspot.com",
  messagingSenderId: "100000000000",
  appId: "1:100000000000:web:abcdef1234567890",
};

const activeConfig = isFirebaseConfigured() ? firebaseConfig : fallbackConfig;

if (getApps().length > 0) {
  app = getApp();
} else {
  app = initializeApp(activeConfig);
}

auth = getAuth(app);

try {
  db = getFirestore(app);
} catch (e) {
  console.warn("Firestore initialization error, running in local mode:", e);
}

export { app, auth, db, isFirebaseConfigured };
