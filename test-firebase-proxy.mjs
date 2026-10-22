import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { setGlobalDispatcher, ProxyAgent } from 'undici';

const proxyUrl = process.env.HTTP_PROXY || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxyUrl) {
  console.log("Using proxy:", proxyUrl);
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

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
