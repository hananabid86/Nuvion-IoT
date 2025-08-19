
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// The Firebase config object is now built from environment variables.
// This is the standard for secure deployment.
// In your Vercel project settings, you will need to add these
// environment variables. For local development, you can create a
// .env.local file in the root of your project.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};


// Singleton pattern to ensure a single instance of Firebase services per request,
// which is crucial for serverless environments like Vercel.
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: ReturnType<typeof getStorage>;

function getFirebase() {
    if (getApps().length === 0) {
        // Check if all required environment variables are present
        if (
            !firebaseConfig.apiKey ||
            !firebaseConfig.authDomain ||
            !firebaseConfig.projectId
        ) {
            throw new Error(
                'Firebase environment variables are not set. Please check your .env.local file or Vercel project settings.'
            );
        }
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    return { app, auth, db, storage };
}

export { getFirebase };
