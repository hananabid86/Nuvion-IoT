
"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

const MAX_FILE_SIZE_KB = 500;

export function ProfilePage() {
    const { user, updateUserProfile } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (user) {
            setName(user.displayName || 'IoT User');
            setEmail(user.email || '');
            setAvatarPreview(user.photoURL || `https://placehold.co/100x100.png?text=${user.email?.[0]}`);
        }
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image file.' });
            return;
        }

        const fileSizeKB = file.size / 1024;
        if (fileSizeKB > MAX_FILE_SIZE_KB) {
            toast({ variant: 'destructive', title: 'File Too Large', description: `Please select an image smaller than ${MAX_FILE_SIZE_KB}KB.` });
            return;
        }

        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveChanges = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateUserProfile(name, avatarFile);
            toast({ title: 'Profile Updated', description: 'Your changes have been saved successfully.' });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'An error occurred while updating your profile.' });
        } finally {
            setIsSaving(false);
            setAvatarFile(null); // Reset file input after save
        }
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={avatarPreview} alt="User Avatar" data-ai-hint="user avatar" />
                            <AvatarFallback>{name?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-1.5">
                            <Label htmlFor="picture">Profile Picture</Label>
                            <Input id="picture" type="file" className="max-w-xs" accept="image/*" onChange={handleFileChange} />
                            <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to {MAX_FILE_SIZE_KB}KB.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" value={email} readOnly disabled />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
