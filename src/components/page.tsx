
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LandingPage } from "@/components/landing-page";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the user is authenticated and their email is verified, redirect them to the dashboard.
    // This prevents showing the landing page to logged-in users.
    if (!loading && user && user.emailVerified) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);
  
  // If the user is logged in, show nothing to prevent a flash of the landing page
  // while the redirect to the dashboard is in progress.
  if (user) {
    return null; 
  }
  
  // Only show the landing page if the user is not authenticated.
  return <LandingPage />;
}
