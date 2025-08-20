
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Rss, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const { signInWithEmail, signInWithGoogle, sendPasswordReset } = useAuth();
    const { toast } = useToast();
    const [resetEmail, setResetEmail] = useState("");
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await signInWithEmail(email, password);
            // The AuthProvider will now handle the redirect
        } catch (error: any) {
            let desc = "An unexpected error occurred. Please try again.";
            if (error.code === 'auth/user-not-found') {
                desc = "No account found with this email address.";
            } else if (error.code === 'auth/wrong-password') {
                desc = "Incorrect password. Please try again.";
            } else if (error.code === 'auth/invalid-credential') {
                desc = "Invalid credentials. Please check your email and password.";
            }
            toast({
                variant: 'destructive',
                title: 'Login Failed',
                description: desc,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
             await signInWithGoogle();
             // The AuthProvider will now handle the redirect
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Google Sign-In Failed',
                description: "Could not sign in with Google. Please try again.",
            });
        } finally {
            setIsGoogleLoading(false);
        }
    }
    
    const handlePasswordReset = async () => {
        if (!resetEmail) {
            toast({ variant: 'destructive', title: 'Email required', description: 'Please enter your email address to reset your password.'});
            return;
        }
        try {
            await sendPasswordReset(resetEmail);
            toast({ title: 'Password Reset Email Sent', description: `If an account exists for ${resetEmail}, a password reset link has been sent.`});
            setIsResetDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send password reset email. Please try again.'});
        }
    }
    
    const GoogleIcon = () => (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" >
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.022,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
        </svg>
    );

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <div className="absolute top-8">
                <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
                    <Rss className="h-7 w-7 text-primary" />
                    <span>Nuvion-IoT</span>
                </Link>
            </div>
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Welcome Back!</CardTitle>
                    <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
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
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                 <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                                    <DialogTrigger asChild>
                                      <Button variant="link" className="text-xs h-auto p-0" onClick={() => setResetEmail(email)}>Forgot password?</Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                      <DialogHeader>
                                        <DialogTitle>Reset Password</DialogTitle>
                                        <DialogDescription>
                                          Enter your email address and we'll send you a link to reset your password.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="reset-email" className="text-right">
                                            Email
                                          </Label>
                                          <Input id="reset-email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="col-span-3" />
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button type="submit" onClick={handlePasswordReset}>Send Reset Link</Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading || isGoogleLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                            Sign In
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
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="underline">
                            Sign up
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
