
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

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// This ensures we initialize Firebase only once.
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

db = getFirestore(app);
storage = getStorage(app);

// getAuth() is memoized, so it's safe to call it multiple times.
// This function ensures that client-side auth uses persistence.
export function getFirebaseAuth(): Auth {
    if (auth) return auth;

    if (typeof window === 'undefined') {
        // For server-side rendering, use getAuth directly.
        auth = getAuth(app);
    } else {
        // For client-side rendering, initialize with persistence.
        // This is the key to fixing the auth issues.
        auth = initializeAuth(app, {
            persistence: browserLocalPersistence
        });
    }
    return auth;
}

// Simple getters for other services
export function getFirebaseDb(): Firestore {
    return db;
}

export function getFirebaseStorage(): FirebaseStorage {
    return storage;
}

// Direct export for server-side usage where simple import is sufficient.
export const firebase = {
    app,
    db,
    storage,
};
