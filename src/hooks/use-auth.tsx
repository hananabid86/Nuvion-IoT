
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
import { Loader } from 'lucide-react';

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

const FullPageLoader = () => (
    <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="flex flex-col items-center gap-2">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
        </div>
    </div>
);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { auth, storage } = getFirebase();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/signup';
    const isVerificationPage = pathname === '/verify-email';
    const isPublicPage = isAuthPage || isVerificationPage || pathname === '/';
    
    let verificationPoller: NodeJS.Timeout | null = null;
    
    if (user) { // User is logged in
        if (!user.emailVerified) { // User's email is not verified
            if (!isVerificationPage) {
                router.push('/verify-email');
            } else {
                 // On verification page, poll for status change
                verificationPoller = setInterval(async () => {
                    await user.reload();
                    if (user.emailVerified) {
                        // Create a new user object to force a state update
                        setUser(auth.currentUser); 
                    }
                }, 3000); 
            }
        } else { // User is logged in and verified
            if (isAuthPage || isVerificationPage) {
                router.push('/dashboard');
            }
        }
    } else { // No user is logged in
        if (!isPublicPage) {
            router.push('/login');
        }
    }
    
    // Cleanup poller on component unmount or when dependencies change
    return () => {
        if (verificationPoller) {
            clearInterval(verificationPoller);
        }
    }

  }, [user, loading, pathname, router, auth]);


  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(userCredential.user);
    // onAuthStateChanged will handle redirect to /verify-email
  }

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged will handle redirect.
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

  if (loading) {
      return <FullPageLoader />;
  }

  // If user is not verified and not on a public/verification page, show loader until redirect completes
  if (user && !user.emailVerified && pathname !== '/verify-email') {
    return <FullPageLoader />;
  }
  
  // If user is not logged in and not on a public page, show loader until redirect completes
  if (!user && !(pathname === '/login' || pathname === '/signup' || pathname === '/')) {
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
