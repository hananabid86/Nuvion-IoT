
"use client"
import React, { useState, useEffect } from 'react';
import { Bot, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import type { Automation, Device } from '@/lib/types';
import { CreateAutomationDialog } from './create-automation-dialog';
import { addNotification } from '@/lib/notifications';
import { collection, onSnapshot, query, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { publishMqttCommand } from '@/actions/publish-mqtt-command';

// Hardcoded user for development without auth
const TEMP_USER_ID = "dev-user";

export function AutomationsPage() {
    const { toast } = useToast();
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [automationToEdit, setAutomationToEdit] = useState<Automation | null>(null);
    const [automationToDelete, setAutomationToDelete] = useState<Automation | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    useEffect(() => {
        setIsLoading(true);

        const db = getFirebaseDb();
        const automationsQuery = query(collection(db, `users/${TEMP_USER_ID}/automations`));
        const devicesQuery = query(collection(db, `users/${TEMP_USER_ID}/devices`));

        const unsubAutomations = onSnapshot(automationsQuery, (snapshot) => {
            const automationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Automation);
            setAutomations(automationsData.sort((a,b) => a.time.localeCompare(b.time)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching automations:", error);
            toast({ title: "Error", description: "Could not fetch automations. Is your Firestore database set up correctly?", variant: "destructive" });
            setIsLoading(false);
        });

        const unsubDevices = onSnapshot(devicesQuery, (snapshot) => {
            const devicesData = snapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }) as Device);
            setDevices(devicesData);
        });


        return () => {
            unsubAutomations();
            unsubDevices();
        };
    }, [toast]);

    const handleSaveAutomation = async (automationToSave: Automation) => {
        const db = getFirebaseDb();
        try {
            const automationRef = doc(db, `users/${TEMP_USER_ID}/automations`, automationToSave.id);
            await setDoc(automationRef, automationToSave, { merge: true });
            
            toast({
                title: automationToEdit ? "Automation Updated" : "Automation Created",
                description: `Rule for '${automationToSave.deviceName}' has been saved.`,
            });
            addNotification(`Automation for '${automationToSave.deviceName}' was saved.`, automationToSave.deviceId);
            
            setIsCreateOpen(false);
            setAutomationToEdit(null);
        } catch (error) {
            console.error("Error saving automation:", error);
            toast({ title: "Error", description: "Could not save the automation.", variant: "destructive" });
        }
    };
    
    const confirmDeleteAutomation = async () => {
        if (!automationToDelete) return;
        const db = getFirebaseDb();
        try {
            await deleteDoc(doc(db, `users/${TEMP_USER_ID}/automations`, automationToDelete.id));
            toast({
                title: "Automation Deleted",
                description: `The automation for '${automationToDelete.deviceName}' has been deleted.`,
            });
        } catch (error) {
            toast({ title: "Error", description: "Could not delete automation.", variant: "destructive" });
        } finally {
            setAutomationToDelete(null);
        }
    }

    return (
        <>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
                        <p className="text-muted-foreground">Create rules to make your devices work together automatically.</p>
                    </div>
                    <Button onClick={() => { setAutomationToEdit(null); setIsCreateOpen(true); }} className='w-full sm:w-auto'>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Automation
                    </Button>
                </div>
                
                 {isLoading && <p>Loading automations...</p>}

                {!isLoading && automations.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center rounded-lg border-2 border-dashed">
                        <Bot className="h-12 w-12 text-muted-foreground" />
                        <h3 className="text-xl font-semibold">No Automations Yet</h3>
                        <p className="text-muted-foreground max-w-md">
                           Click "New Automation" to create your first rule, like turning a light off at a specific time.
                        </p>
                    </div>
                )}
                
                {!isLoading && automations.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {automations.map(auto => (
                            <Card key={auto.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-2xl font-bold">{auto.time}</CardTitle>
                                    <CardDescription>Daily Trigger</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-2">
                                     <p>
                                        <span className="font-semibold text-primary">Device:</span> {auto.deviceName}
                                    </p>
                                    <p>
                                        <span className="font-semibold text-primary">Action:</span> Set '{auto.variableDisplayName}' to {auto.targetState ? 'ON' : 'OFF'}
                                    </p>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2 border-t pt-4 mt-auto">
                                     <Button variant="outline" size="sm" onClick={() => { setAutomationToEdit(auto); setIsCreateOpen(true); }}>Edit</Button>
                                     <Button variant="destructive" size="sm" onClick={() => setAutomationToDelete(auto)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

             <CreateAutomationDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSave={handleSaveAutomation}
                automationToEdit={automationToEdit}
                devices={devices}
            />

            <AlertDialog open={!!automationToDelete} onOpenChange={(open) => !open && setAutomationToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the automation for <span className='font-semibold'>"{automationToDelete?.deviceName}"</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteAutomation}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Automation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
