import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, `test${Date.now()}@example.com`, 'password123');
    console.log("User created:", cred.user.uid);
    const uid = cred.user.uid;

    const ref = doc(db, "users", uid, "droneConfigurations", "hexacopter");
    await setDoc(ref, {
      diagnostic: true,
      updatedAt: Date.now()
    }, { merge: true });

    console.log("Minimal write succeeded!");
  } catch (e) {
    console.error("Minimal write failed:", e);
  }
  process.exit(0);
}
run();
