
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Rss, MailCheck, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export function VerifyEmailPage() {
    const { user, sendVerificationEmail, signOut, loading } = useAuth();
    const [isResending, setIsResending] = useState(false);
    const { toast } = useToast();

    const handleResendEmail = async () => {
        setIsResending(true);
        try {
            await sendVerificationEmail();
            toast({
                title: 'Verification Email Sent',
                description: 'A new verification link has been sent to your email address.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error Sending Email',
                description: 'Please wait a moment before trying again.',
            });
        } finally {
            setIsResending(false);
        }
    };
    
    // The useAuth hook now handles periodic reloads and redirection.
    // This component can focus just on display and user actions.
    
    if (loading) {
        // Auth state is still being determined, show nothing to prevent flashes
        return null;
    }

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-background p-4">
            {/* Animated background */}
            <div className="absolute top-0 left-0 -z-10 h-full w-full bg-muted/20">
                <div className="absolute bottom-auto left-auto right-0 top-0 h-[500px] w-[500px] -translate-x-[20%] translate-y-[20%] rounded-full bg-primary/20 opacity-50 blur-[120px]"></div>
            </div>

            <div className="flex flex-col items-center gap-8 w-full">
                <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
                    <Rss className="h-7 w-7 text-primary" />
                    <span>Nuvion-IoT</span>
                </Link>
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <MailCheck className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle className="text-2xl mt-4">Verify Your Email</CardTitle>
                        <CardDescription>
                            A verification link has been sent to <br/>
                            <span className="font-semibold text-primary">{user?.email || 'your email address'}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                        <p className="text-muted-foreground text-sm">
                            Please check your inbox (and spam folder) and click the link to activate your account. This window will automatically redirect after you've verified.
                        </p>
                        <Button onClick={handleResendEmail} className="w-full" disabled={isResending}>
                            {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Resend Verification Email
                        </Button>
                        <div className="mt-4">
                            <Button variant="link" onClick={signOut}>
                            <LogOut className='mr-2 h-4 w-4'/> Go back to login
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
