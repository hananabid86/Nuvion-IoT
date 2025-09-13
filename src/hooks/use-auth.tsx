
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithRedirect,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  Auth,
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseAuth, getFirebaseStorage } from '@/lib/firebase';
import { Loader } from 'lucide-react';

// A full-page loader for critical auth state transitions.
const FullPageLoader = () => (
    <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="flex flex-col items-center gap-2">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
        </div>
    </div>
);


interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoFile: File | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // This useEffect is the single source of truth for the user's auth state.
  useEffect(() => {
    const auth = getFirebaseAuth();
    let verificationPoller: NodeJS.Timeout | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (verificationPoller) clearInterval(verificationPoller);

      if (currentUser) {
        if (!currentUser.emailVerified) {
          // If the user is logged in but email is not verified,
          // start polling to check for verification status.
          verificationPoller = setInterval(async () => {
              await currentUser.reload();
              if (currentUser.emailVerified) {
                  if (verificationPoller) clearInterval(verificationPoller);
                  // Manually update the state to trigger a re-render and navigation
                  setUser({ ...currentUser });
              }
          }, 3000);
        }
      }
      
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup function to unsubscribe from the listener and clear any timers
    return () => {
      unsubscribe();
      if (verificationPoller) clearInterval(verificationPoller);
    };
  }, []);

  // All auth actions are now simple wrappers that call the Firebase SDK.
  // They are guaranteed to have a valid `auth` instance because they are
  // called after the initial provider setup.

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    const auth = getFirebaseAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(userCredential.user);
  }

  const signInWithEmail = async (email: string, pass: string) => {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email, pass);
  }
  
  const sendVerificationEmail = async () => {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
    } else {
        throw new Error("No user is currently signed in.");
    }
  }
  
  const sendPasswordReset = async (email: string) => {
     const auth = getFirebaseAuth();
     await sendPasswordResetEmail(auth, email);
  }

  const signOut = async () => {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    // After signing out, explicitly set user to null and redirect.
    setUser(null); 
    router.push('/login');
  };
  
  const updateUserProfile = async (displayName: string, photoFile: File | null) => {
    const auth = getFirebaseAuth();
    const storage = getFirebaseStorage();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
        throw new Error("No user is currently signed in.");
    }
    
    let photoURL = currentUser.photoURL;

    if (photoFile) {
        const storageRef = ref(storage, `avatars/${currentUser.uid}/${photoFile.name}`);
        const snapshot = await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(snapshot.ref);
    }
    
    await updateProfile(currentUser, { displayName, photoURL });
    
    // Manually update the user state to trigger a re-render with the new profile info
    setUser({ ...currentUser });
  }

  const value = { user, loading, signInWithGoogle, signUpWithEmail, signInWithEmail, signOut, sendVerificationEmail, sendPasswordReset, updateUserProfile };

  // Show a loader while the initial auth state is being determined.
  if (loading) {
      return <FullPageLoader />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
