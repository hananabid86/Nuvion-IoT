
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { Loader } from 'lucide-react';

const FullPageLoader = () => (
    <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="flex flex-col items-center gap-2">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
    </div>
);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // Wait until loading is false

    const isAuthPage = pathname === '/login' || pathname === '/signup';
    const isVerificationPage = pathname === '/verify-email';
    
    if (user) { // User is logged in
        if (!user.emailVerified) {
            // If user's email is not verified, they should be on the verification page.
            if (!isVerificationPage) {
                router.replace('/verify-email');
            }
        } else {
            // If user is logged in and verified, they should not be on auth pages.
            if (isAuthPage || isVerificationPage) {
                router.replace('/dashboard');
            }
        }
    } else {
        // If no user is logged in, they should be on the login page.
        // The landing page is public and doesn't need a guard.
        if (pathname !== '/' && !isAuthPage) {
             router.replace('/login');
        }
    }
  }, [user, loading, router, pathname]);

  // Show a loader while authentication state is being determined or if redirects are in progress.
  if (loading || (!user && pathname !== '/') || (user && !user.emailVerified && pathname !== '/verify-email')) {
    return <FullPageLoader />;
  }

  return <>{children}</>;
}
