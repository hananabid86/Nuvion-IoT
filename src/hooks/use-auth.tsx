
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
} from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebase } from '@/lib/firebase';

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
  const { auth, storage } = getFirebase();

  useEffect(() => {
    let verificationPoller: NodeJS.Timeout | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (verificationPoller) clearInterval(verificationPoller);

      if (currentUser && !currentUser.emailVerified) {
        // If the user is new and not verified, start polling their status
        verificationPoller = setInterval(async () => {
            await currentUser.reload();
            if (currentUser.emailVerified) {
                if (verificationPoller) clearInterval(verificationPoller);
                // Create a new user object to trigger re-render and effects
                setUser({ ...currentUser }); 
                router.push('/dashboard'); // Explicitly redirect on verification
            }
        }, 3000);
      }
      
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (verificationPoller) clearInterval(verificationPoller);
    };
  }, [auth, router]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(userCredential.user);
    // onAuthStateChanged will handle the user state update
  }

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged will handle the user state update
  }
  
  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
    } else {
        throw new Error("No user is currently signed in.");
    }
  }
  
  const sendPasswordReset = async (email: string) => {
     await sendPasswordResetEmail(auth, email);
  }

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };
  
  const updateUserProfile = async (displayName: string, photoFile: File | null) => {
    const { auth, storage } = getFirebase();
    if (!auth.currentUser) {
        throw new Error("No user is currently signed in.");
    }
    
    let photoURL = auth.currentUser.photoURL;

    if (photoFile) {
        const storageRef = ref(storage, `avatars/${auth.currentUser.uid}/${photoFile.name}`);
        const snapshot = await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(snapshot.ref);
    }
    
    await updateProfile(auth.currentUser, { displayName, photoURL });
    
    // Force a re-render with the updated user object
    if (auth.currentUser) {
      setUser({ ...auth.currentUser });
    }
  }

  const value = { user, loading, signInWithGoogle, signUpWithEmail, signInWithEmail, signOut, sendVerificationEmail, sendPasswordReset, updateUserProfile };

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
