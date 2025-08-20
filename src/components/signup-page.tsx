
"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Rss, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const { signUpWithEmail, signInWithGoogle } = useAuth();
    const { toast } = useToast();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Signup Failed',
                description: 'Passwords do not match.',
            });
            return;
        }
        setIsLoading(true);
        try {
            await signUpWithEmail(email, password);
             // The AuthProvider will handle the redirect.
        } catch (error: any) {
            let description = "An unexpected error occurred.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This email address is already in use by another account.";
            } else if (error.code === 'auth/weak-password') {
                description = "The password is too weak. Please choose a stronger password.";
            }
            toast({
                variant: 'destructive',
                title: 'Signup Failed',
                description: description,
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
             await signInWithGoogle();
             // The AuthProvider will handle the redirect.
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Google Sign-In Failed',
                description: error.message,
            });
        } finally {
            setIsGoogleLoading(false);
        }
    }
    
     const GoogleIcon = () => (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" >
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.022,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
        </svg>
    );

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
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Create an Account</CardTitle>
                        <CardDescription>Enter your email below to create your account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading || isGoogleLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading || isGoogleLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isLoading || isGoogleLoading}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                                Create Account
                            </Button>
                        </form>
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>
                        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                            {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                            Google
                        </Button>

                        <div className="mt-4 text-center text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="underline">
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
