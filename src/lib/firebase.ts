
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth, browserLocalPersistence, initializeAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

interface FirebaseServices {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
    storage: ReturnType<typeof getStorage>;
}

let firebaseServices: FirebaseServices | null = null;

// This function initializes Firebase and returns the services.
// It's designed to be a singleton, ensuring it only runs once.
export async function getFirebase(): Promise<FirebaseServices> {
    if (firebaseServices) {
        return firebaseServices;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    // Using initializeAuth for browser environments to ensure persistence works correctly.
    // For server-side, getAuth is sufficient.
    const auth = typeof window !== 'undefined' 
        ? initializeAuth(app, { persistence: browserLocalPersistence })
        : getAuth(app);
        
    const db = getFirestore(app);
    const storage = getStorage(app);
    
    firebaseServices = { app, auth, db, storage };
    
    return firebaseServices;
}
