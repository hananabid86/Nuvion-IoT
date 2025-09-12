
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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebase } from '@/lib/firebase';

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
  
  useEffect(() => {
    const { auth } = firebase;
    let verificationPoller: NodeJS.Timeout | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (verificationPoller) clearInterval(verificationPoller);

      if (currentUser && !currentUser.emailVerified) {
        // Start polling to check for email verification status
        verificationPoller = setInterval(async () => {
            await currentUser.reload();
            if (currentUser.emailVerified) {
                if (verificationPoller) clearInterval(verificationPoller);
                setUser({ ...currentUser }); // Trigger a re-render with the updated user
                router.push('/dashboard');
            }
        }, 3000);
      }
      
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup function
    return () => {
      unsubscribe();
      if (verificationPoller) clearInterval(verificationPoller);
    };
  }, [router]);


  const signInWithGoogle = async () => {
    const { auth } = firebase;
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    const { auth } = firebase;
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(userCredential.user);
  }

  const signInWithEmail = async (email: string, pass: string) => {
    const { auth } = firebase;
    await signInWithEmailAndPassword(auth, email, pass);
  }
  
  const sendVerificationEmail = async () => {
    const { auth } = firebase;
    if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
    } else {
        throw new Error("No user is currently signed in.");
    }
  }
  
  const sendPasswordReset = async (email: string) => {
     const { auth } = firebase;
     await sendPasswordResetEmail(auth, email);
  }

  const signOut = async () => {
    const { auth } = firebase;
    await firebaseSignOut(auth);
    router.push('/login');
  };
  
  const updateUserProfile = async (displayName: string, photoFile: File | null) => {
    const { auth, storage } = firebase;
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
    
    // Manually update the user state to trigger a re-render with the new profile info
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
