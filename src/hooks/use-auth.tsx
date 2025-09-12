
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
  type Auth,
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
  const [auth, setAuth] = useState<Auth | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    let verificationPoller: NodeJS.Timeout | null = null;
    let unsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      const { auth: firebaseAuth } = await getFirebase();
      setAuth(firebaseAuth);

      unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
        if (verificationPoller) clearInterval(verificationPoller);

        if (currentUser && !currentUser.emailVerified) {
          verificationPoller = setInterval(async () => {
              await currentUser.reload();
              if (currentUser.emailVerified) {
                  if (verificationPoller) clearInterval(verificationPoller);
                  setUser({ ...currentUser }); 
                  router.push('/dashboard');
              }
          }, 3000);
        }
        
        setUser(currentUser);
        setLoading(false);
      });
    };

    initializeAuth();

    return () => {
      if (unsubscribe) unsubscribe();
      if (verificationPoller) clearInterval(verificationPoller);
    };
  }, [router]);

  const ensureAuth = async () => {
      if (auth) return auth;
      const { auth: firebaseAuth } = await getFirebase();
      setAuth(firebaseAuth);
      return firebaseAuth;
  }

  const signInWithGoogle = async () => {
    const authInstance = await ensureAuth();
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(authInstance, provider);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    const authInstance = await ensureAuth();
    const userCredential = await createUserWithEmailAndPassword(authInstance, email, pass);
    await sendEmailVerification(userCredential.user);
  }

  const signInWithEmail = async (email: string, pass: string) => {
    const authInstance = await ensureAuth();
    await signInWithEmailAndPassword(authInstance, email, pass);
  }
  
  const sendVerificationEmail = async () => {
    const authInstance = await ensureAuth();
    if (authInstance.currentUser) {
        await sendEmailVerification(authInstance.currentUser);
    } else {
        throw new Error("No user is currently signed in.");
    }
  }
  
  const sendPasswordReset = async (email: string) => {
     const authInstance = await ensureAuth();
     await sendPasswordResetEmail(authInstance, email);
  }

  const signOut = async () => {
    const authInstance = await ensureAuth();
    await firebaseSignOut(authInstance);
    router.push('/login');
  };
  
  const updateUserProfile = async (displayName: string, photoFile: File | null) => {
    const { auth: authInstance, storage } = await getFirebase();
    if (!authInstance.currentUser) {
        throw new Error("No user is currently signed in.");
    }
    
    let photoURL = authInstance.currentUser.photoURL;

    if (photoFile) {
        const storageRef = ref(storage, `avatars/${authInstance.currentUser.uid}/${photoFile.name}`);
        const snapshot = await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(snapshot.ref);
    }
    
    await updateProfile(authInstance.currentUser, { displayName, photoURL });
    
    if (authInstance.currentUser) {
      setUser({ ...authInstance.currentUser });
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
