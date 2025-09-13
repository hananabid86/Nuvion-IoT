
"use client"
import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Copy, Trash2, HardDrive, Edit, MoreVertical, Wifi, HelpCircle, Loader2, XCircle, RefreshCw, Clock, Settings, ChevronRight, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import type { Device, PairingToken } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import { CreateDeviceDialog } from './create-device-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { useSearch } from '@/hooks/use-search';
import { useAuth } from '@/hooks/use-auth';
import { DeviceSetupGuide } from './device-setup-guide';
import Link from 'next/link';

const generatePairingTokenValue = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
        if (i === 3) token += '-';
    }
    return token;
};

const generateApiKey = () => `iotc_${crypto.randomUUID().replace(/-/g, '')}`;

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};


export function DevicesPage() {
    const { user } = useAuth();
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingToken, setIsGeneratingToken] = useState(false);
    const [activePairingToken, setActivePairingToken] = useState<PairingToken | null>(null);
    const [tokenTimeLeft, setTokenTimeLeft] = useState<number | null>(null);

    const { toast } = useToast();
    const { searchTerm } = useSearch();

    const [deviceToEdit, setDeviceToEdit] = useState<Device | null>(null);
    const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
    const [deviceToRegenerate, setDeviceToRegenerate] = useState<Device | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [guideMode, setGuideMode] = useState<'pnp' | 'manual'>('pnp');
    const [guideStep, setGuideStep] = useState(0);

    const notifiedTokensRef = useRef<Set<string>>(new Set());
    
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const db = getFirebaseDb();
        const q = query(collection(db, `users/${user.uid}/devices`));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const devicesData = snapshot.docs.map(doc => ({
                firestoreId: doc.id,
                ...doc.data(),
            })) as Device[];
            setDevices(devicesData.sort((a, b) => a.name.localeCompare(b.name)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching devices:", error);
            toast({ title: "Error", description: "Could not fetch devices.", variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, toast]);
    
     useEffect(() => {
        if (!user) return;
        const db = getFirebaseDb();
        const tokensQuery = query(collection(db, 'pairingTokens'));

        const unsubscribe = onSnapshot(tokensQuery, (snapshot) => {
            const now = new Date();
            let foundActiveToken: PairingToken | null = null;
            
            snapshot.forEach(doc => {
                const tokenData = doc.data();
                if (tokenData.userId !== user.uid) return;

                // Notify user on successful pairing
                if (tokenData.used && !notifiedTokensRef.current.has(doc.id)) {
                    toast({
                        title: "Device Paired Successfully!",
                        description: "Your new device will appear on the dashboard shortly.",
                    });
                    notifiedTokensRef.current.add(doc.id);
                }

                const expiresDate = (tokenData.expires as Timestamp)?.toDate();
                if (!tokenData.used && expiresDate > now && !foundActiveToken) {
                    foundActiveToken = {
                        docId: doc.id,
                        token: tokenData.token,
                        expires: expiresDate.getTime(),
                        userId: user.uid,
                        used: false,
                    };
                }
            });
            
            setActivePairingToken(foundActiveToken);
        }, (error) => {
            console.warn("Could not listen for pairing tokens:", error.message);
        });

        return () => unsubscribe();
    }, [user, toast]);

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (activePairingToken && activePairingToken.expires) {
            const updateTimer = () => {
                const now = Date.now();
                const timeLeft = Math.round(Math.max(0, activePairingToken.expires - now) / 1000);
                setTokenTimeLeft(timeLeft);
            };
            updateTimer();
            timer = setInterval(updateTimer, 1000);
        } else {
            setTokenTimeLeft(null);
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [activePairingToken]);

    const handleNewPairingToken = async () => {
        if (!user) return;
        setIsGeneratingToken(true);
        const db = getFirebaseDb();
        const tokenValue = generatePairingTokenValue();
        const expires = new Date(Date.now() + 15 * 60 * 1000);
        
        try {
            await addDoc(collection(db, 'pairingTokens'), {
                token: tokenValue,
                expires: Timestamp.fromDate(expires),
                userId: user.uid,
                used: false,
            });
            toast({
                title: "Pairing Token Generated",
                description: "This token is now active for 15 minutes.",
            });
        } catch (error) {
            console.error("Error generating token:", error);
            toast({ title: "Error", description: "Could not generate pairing token.", variant: "destructive" });
        } finally {
            setIsGeneratingToken(false);
        }
    }
    
    const handleCancelToken = async () => {
        if (!activePairingToken || !activePairingToken.docId) return;
        const db = getFirebaseDb();
        try {
            const tokenRef = doc(db, 'pairingTokens', activePairingToken.docId);
            await updateDoc(tokenRef, { used: true });
            toast({ title: "Token Cancelled", description: "The active pairing token has been cancelled." });
        } catch (error) {
            toast({ title: "Error", description: "Could not cancel the token.", variant: "destructive" });
        }
    };
    
    const handleSaveDevice = async (deviceToSave: Device) => {
        if (!user) return;
        const db = getFirebaseDb();
        const batch = writeBatch(db);
        try {
            if (deviceToSave.firestoreId) {
                const deviceRef = doc(db, `users/${user.uid}/devices`, deviceToSave.firestoreId);
                const { firestoreId, ...deviceData } = deviceToSave;
                batch.update(deviceRef, deviceData);
                toast({ title: "Device Updated", description: `'${deviceToSave.name}' has been saved.` });
            } else { 
                const newDeviceRef = doc(collection(db, `users/${user.uid}/devices`));
                const newDeviceData = { ...deviceToSave, owner: user.uid, lastSeen: serverTimestamp(), online: false, history: [], pendingActions: {}, alertTriggered: {}, pinned: false };
                batch.set(newDeviceRef, newDeviceData);
                const apiKeyRef = doc(db, 'apiKeys', deviceToSave.apiKey);
                batch.set(apiKeyRef, { 
                    userId: user.uid, 
                    deviceId: newDeviceRef.id,
                    hardwareId: deviceToSave.id
                });
                toast({ title: "Device Created", description: `'${deviceToSave.name}' has been successfully created.` });
            }
            await batch.commit();
            setIsCreateOpen(false);
            setDeviceToEdit(null);
        } catch (error) {
            console.error("Error saving device:", error);
            toast({ title: "Error", description: `Could not save device. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
        }
    };

    const handleCopy = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: `${type} Copied`, description: "The value has been copied to your clipboard." });
    };

    const confirmDeleteDevice = async () => {
        if (!deviceToDelete || !deviceToDelete.firestoreId || !user) return;
        const db = getFirebaseDb();
        const batch = writeBatch(db);
        try {
            const deviceRef = doc(db, `users/${user.uid}/devices`, deviceToDelete.firestoreId);
            batch.delete(deviceRef);
            if (deviceToDelete.apiKey) {
                const apiKeyRef = doc(db, "apiKeys", deviceToDelete.apiKey);
                batch.delete(apiKeyRef);
            }
            await batch.commit();
            toast({ title: "Device Deleted", description: `Device '${deviceToDelete.name}' has been deleted.` });
            setDeviceToDelete(null);
        } catch(error) {
            console.error("Error deleting device:", error);
            toast({ title: "Error", description: "Could not delete device.", variant: "destructive" });
        }
    };
    
    const confirmRegenerateKey = async () => {
        if (!deviceToRegenerate || !deviceToRegenerate.firestoreId || !user) return;
        
        const db = getFirebaseDb();
        const oldApiKey = deviceToRegenerate.apiKey;
        const newApiKey = generateApiKey();
        
        const batch = writeBatch(db);
        
        try {
            // Update the device document with the new API key
            const deviceRef = doc(db, `users/${user.uid}/devices`, deviceToRegenerate.firestoreId);
            batch.update(deviceRef, { apiKey: newApiKey });
            
            // Delete the old API key lookup document
            if (oldApiKey) {
                const oldApiKeyRef = doc(db, "apiKeys", oldApiKey);
                batch.delete(oldApiKeyRef);
            }
            
            // Create the new API key lookup document
            const newApiKeyRef = doc(db, "apiKeys", newApiKey);
            batch.set(newApiKeyRef, {
                userId: user.uid,
                deviceId: deviceToRegenerate.firestoreId,
                hardwareId: deviceToRegenerate.id // Ensure hardwareId is stored
            });
            
            await batch.commit();
            
            toast({ 
                title: "API Key Regenerated",
                description: `A new API key has been generated for '${deviceToRegenerate.name}'. Please update your device firmware.` 
            });
            
        } catch (error) {
            console.error("Error regenerating API key:", error);
            toast({ title: "Error", description: "Could not regenerate the API key.", variant: "destructive" });
        } finally {
            setDeviceToRegenerate(null);
        }
    };


    const filteredDevices = devices.filter(device =>
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Device Management</h1>
                        <p className="text-muted-foreground">Create, view, and manage your IoT devices.</p>
                    </div>
                     <Button onClick={() => { setDeviceToEdit(null); setIsCreateOpen(true); }} className='w-full sm:w-auto'>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Device
                    </Button>
                </div>

                <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><HelpCircle className="h-6 w-6 text-primary" /><span>New to Nuvion IoT?</span></CardTitle>
                        <CardDescription>Follow our interactive guides to learn how to connect your physical hardware to the platform.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4">
                         <Button onClick={() => { setGuideMode('pnp'); setGuideStep(activePairingToken ? 1 : 0); setIsGuideOpen(true); }} className='w-full sm:w-auto'><Wifi className="mr-2 h-4 w-4" />Plug &amp; Play Setup Guide</Button>
                         <Button onClick={() => { setGuideMode('manual'); setGuideStep(0); setIsGuideOpen(true); }} variant="secondary" className='w-full sm:w-auto'><HardDrive className="mr-2 h-4 w-4" />Manual Setup Guide</Button>
                    </CardContent>
                </Card>
                
                 <div className="space-y-4">
                     {activePairingToken && (
                        <Card className="mb-6 bg-blue-500/10 border-blue-500/20">
                            <CardHeader>
                                <CardTitle className='text-lg flex items-center gap-3'><Loader2 className="h-6 w-6 animate-spin text-primary" /><span>Plug &amp; Play Pairing Active</span></CardTitle>
                                <CardDescription>Waiting for a new device to connect using the token below. This card will disappear once a device connects or the token expires.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
                                 <div className="flex flex-col items-center"><div className="flex items-center gap-2 font-mono bg-muted/80 p-2 rounded-md border"><code className='text-xl tracking-widest'>{activePairingToken.token}</code><Button variant="ghost" size="icon" className='h-7 w-7' onClick={() => handleCopy(activePairingToken.token, "Pairing Token")}><Copy className="h-4 w-4" /></Button></div>{tokenTimeLeft !== null && (<div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2"><Clock className="h-3 w-3" /><span>Expires in: {formatTime(tokenTimeLeft)}</span></div>)}</div>
                                <div className='flex items-center gap-2'>
                                    <Button variant="destructive" size="sm" onClick={handleCancelToken} disabled={isGeneratingToken}><XCircle className='mr-2 h-4 w-4'/>Cancel</Button>
                                    <Button variant="outline" size="sm" onClick={() => { handleNewPairingToken(); }} disabled={isGeneratingToken}>{isGeneratingToken && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<RefreshCw className='mr-2 h-4 w-4'/>Renew</Button>
                                </div>
                            </CardContent>
                        </Card>
                     )}
                     
                    <Card>
                        <CardHeader><CardTitle>Your Devices</CardTitle><CardDescription>A list of all your registered devices and their credentials.</CardDescription></CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="text-center h-48 flex flex-col justify-center items-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /><p className="mt-2 text-muted-foreground">Loading your devices...</p></div>
                            ) : filteredDevices.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Device</TableHead>
                                            <TableHead>Hardware ID (Use in Firmware)</TableHead>
                                            <TableHead>API Key</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDevices.map((device) => (
                                            <TableRow key={device.firestoreId} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <Link href={`/devices/${device.firestoreId}`} className="group flex items-center gap-3">
                                                        <div className={cn("p-2 rounded-full", device.online ? 'bg-green-500/20' : 'bg-red-500/20' )}><HardDrive className={cn("h-5 w-5", device.online ? 'text-green-600' : 'text-red-600')} /></div>
                                                        <div>
                                                          <p className="font-semibold group-hover:text-primary transition-colors">{device.name}</p>
                                                          <Badge variant={device.online ? 'default' : 'destructive'} className={cn('mt-1 text-xs', device.online && "bg-green-500 hover:bg-green-600")}>{device.online ? 'Online' : 'Offline'}</Badge>
                                                        </div>
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <code className="font-mono text-xs bg-muted p-1.5 rounded border truncate max-w-28 block">{device.id}</code>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>{device.id}</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleCopy(device.id, 'Hardware ID')}><Copy className="h-3.5 w-3.5" /></Button>
                                                    </div>
                                                </TableCell>
                                                 <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <code className="font-mono text-xs bg-muted p-1.5 rounded border truncate max-w-28 block">{device.apiKey}</code>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>{device.apiKey}</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleCopy(device.apiKey, 'API Key')}><Copy className="h-3.5 w-3.5" /></Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => router.push(`/devices/${device.firestoreId}`)}><ChevronRight className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => { setDeviceToEdit(device); setIsCreateOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Edit Profile</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => setDeviceToRegenerate(device)}><KeyRound className="mr-2 h-4 w-4" /> Regenerate Key</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setDeviceToDelete(device)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Device</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center rounded-lg border-2 border-dashed">
                                    <Settings className="h-16 w-16 text-muted-foreground/50" />
                                    <h3 className="text-2xl font-bold">{searchTerm ? 'No Matching Devices' : 'No Devices Created Yet'}</h3>
                                    <p className="text-muted-foreground max-w-md">{searchTerm ? 'No devices match your current search term. Try another search.' : 'Get started by creating a new device or following a setup guide.'}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                 </div>
            </div>

            <CreateDeviceDialog open={isCreateOpen} onOpenChange={(open) => { if (!open) setDeviceToEdit(null); setIsCreateOpen(open); }} onSave={handleSaveDevice} deviceToEdit={deviceToEdit} />
            
            <DeviceSetupGuide 
                open={isGuideOpen} 
                onOpenChange={(open) => { if(!open) setGuideStep(0); setIsGuideOpen(open); }} 
                mode={guideMode} 
                onGenerateToken={handleNewPairingToken} 
                isGeneratingToken={isGeneratingToken} 
                pairingToken={activePairingToken} 
                step={guideStep} 
                setStep={setGuideStep} />

            <AlertDialog open={!!deviceToDelete} onOpenChange={(open) => !open && setDeviceToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete your device <span className='font-semibold'>"{deviceToDelete?.name}"</span> and all of its associated data.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteDevice} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>Delete Device</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={!!deviceToRegenerate} onOpenChange={(open) => !open && setDeviceToRegenerate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Regenerate API Key?</AlertDialogTitle><AlertDialogDescription>This will generate a new API key for <span className='font-semibold'>"{deviceToRegenerate?.name}"</span> and revoke the old one. You must update your device firmware with the new key to continue sending data.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmRegenerateKey} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>Regenerate Key</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
