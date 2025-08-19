
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';


export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // This component is no longer responsible for redirecting.
    // The new middleware handles that server-side.
    // We still use it to show a loading state while auth is being checked client-side.
  }, [user, loading, router]);

  if (loading || !user) {
    return (
        <div className="flex items-center justify-center h-screen w-screen">
            <div className="flex flex-col items-center gap-2">
                <Loader className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
        </div>
    );
  }

  return <>{children}</>;
}
