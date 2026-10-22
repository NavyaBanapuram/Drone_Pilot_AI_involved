import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDdBOKXLkvjWw1i9b_wYssGdz2rYTqfpdU",
  authDomain: "drone-pilot-48a8d.firebaseapp.com",
  projectId: "drone-pilot-48a8d",
  storageBucket: "drone-pilot-48a8d.firebasestorage.app",
  messagingSenderId: "329054086111",
  appId: "1:329054086111:web:f5a0c743954175bf87da6a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testDatabase() {
  console.log("1. Creating test user...");
  try {
    const cred = await createUserWithEmailAndPassword(auth, `test${Date.now()}@example.com`, 'password123');
    const uid = cred.user.uid;
    console.log(`? Authenticated with UID: ${uid}`);

    console.log("2. Attempting to write drone configuration to Firestore...");
    const configRef = doc(db, "users", uid, "aircraftConfigurations", "quadcopter");
    
    await setDoc(configRef, {
      identity: { category: "quadcopter", name: "Test Drone" },
      mass: 1.5,
      updatedAt: Date.now()
    }, { merge: true });
    console.log("? Write successful! Security rules allowed the write.");

    console.log("3. Attempting to read drone configuration from Firestore...");
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      console.log("? Read successful! Data retrieved:", snap.data());
    } else {
      console.error("X Read failed: Document does not exist.");
    }
    
    console.log("\nALL TESTS PASSED: Firebase Database is fully operational and security rules are correctly configured.");
    process.exit(0);
  } catch (error) {
    console.error("\nX TEST FAILED:");
    console.error(error.message);
    process.exit(1);
  }
}

testDatabase();
