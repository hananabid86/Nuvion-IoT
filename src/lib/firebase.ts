
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth, browserLocalPersistence, initializeAuth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

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
    storage: FirebaseStorage;
}

// This function acts as a singleton provider for Firebase services.
// It initializes Firebase only once and returns the same instance on subsequent calls.
function getFirebaseServices(): FirebaseServices {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    // In a client-side environment, we use initializeAuth to enable persistence.
    // getAuth() is sufficient for server-side environments or if persistence is not needed.
    const auth = typeof window !== 'undefined' 
        ? initializeAuth(app, { persistence: browserLocalPersistence })
        : getAuth(app);
        
    const db = getFirestore(app);
    const storage = getStorage(app);
    
    return { app, auth, db, storage };
}

// Export a single, memoized instance of the Firebase services.
// This ensures that Firebase is initialized only once and the same instance is used throughout the app.
export const firebase = getFirebaseServices();
