
"use client"
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Device, Automation } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateAutomationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (automation: Automation) => void;
    automationToEdit?: Automation | null;
    devices: Device[];
}

export function CreateAutomationDialog({ open, onOpenChange, onSave, automationToEdit, devices }: CreateAutomationDialogProps) {
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [selectedVariable, setSelectedVariable] = useState<string>('');
    const [targetState, setTargetState] = useState<boolean>(false);
    const [time, setTime] = useState("22:00");
    const { toast } = useToast();

    // Populate form if editing
    useEffect(() => {
        if (automationToEdit && open) {
            const device = devices.find(d => d.id === automationToEdit.deviceId);
            setSelectedDeviceId(device?.firestoreId || '');
            setSelectedVariable(automationToEdit.variableName);
            setTargetState(automationToEdit.targetState);
            setTime(automationToEdit.time);
        } else {
            // Reset form when dialog is opened for creation or closed
            setSelectedDeviceId('');
            setSelectedVariable('');
            setTargetState(false);
            setTime("22:00");
        }
    }, [automationToEdit, open, devices]);


    const handleDeviceChange = (deviceFirestoreId: string) => {
        setSelectedDeviceId(deviceFirestoreId);
        setSelectedVariable(''); // Reset variable when device changes
    }
    
    const saveAutomation = () => {
        if (!selectedDeviceId || !selectedVariable || !time) {
             toast({
                title: "Error",
                description: "Please fill out all fields to create the automation.",
                variant: "destructive"
            });
            return;
        }

        const device = devices.find(d => d.firestoreId === selectedDeviceId);
        if (!device) return;

        const variable = device.data[selectedVariable];
        if (!variable) return;

        const newAutomation: Automation = {
            id: automationToEdit?.id || `auto-${crypto.randomUUID()}`,
            time,
            deviceId: device.id,
            deviceName: device.name,
            variableName: variable.name,
            variableDisplayName: variable.displayName || variable.name,
            targetState,
        };

        onSave(newAutomation);
    };

    const selectedDevice = devices.find(d => d.firestoreId === selectedDeviceId);
    const controllableVariables = selectedDevice
        ? Object.values(selectedDevice.data || {})
                .filter(v => typeof v.value === 'boolean')
        : [];
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[90%] max-w-md">
                <DialogHeader>
                    <DialogTitle>{automationToEdit ? 'Edit Automation' : 'New Time-Based Automation'}</DialogTitle>
                    <DialogDescription>
                        Set a specific time for an action to occur daily. The server checks for due automations every minute.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                     <div className='space-y-4 p-4 rounded-lg border bg-muted/30'>
                        <h3 className='font-semibold text-lg'>When</h3>
                        <div className="space-y-1.5">
                            <Label>Time of Day (24-hour format)</Label>
                            <Input
                                id="time"
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                     </div>
                     <div className='space-y-4 p-4 rounded-lg border bg-muted/30'>
                        <h3 className='font-semibold text-lg'>Then</h3>
                         <div className="space-y-1.5">
                           <Label>Select Device</Label>
                            <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a device..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {devices.map(d => (
                                        <SelectItem key={d.firestoreId} value={d.firestoreId!}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedDeviceId && (
                             <div className="space-y-1.5">
                               <Label>Select Control</Label>
                                <Select value={selectedVariable} onValueChange={setSelectedVariable} disabled={controllableVariables.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a control..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {controllableVariables.length > 0 ? (
                                            controllableVariables.map(v => (
                                                <SelectItem key={v.name} value={v.name}>{v.displayName || v.name}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>No controllable items</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                         {selectedVariable && (
                            <div className="space-y-1.5">
                                <Label>Set State</Label>
                                <Select value={String(targetState)} onValueChange={(val) => setTargetState(val === 'true')}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">On</SelectItem>
                                        <SelectItem value="false">Off</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                     </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" onClick={saveAutomation}>{automationToEdit ? "Save Changes" : "Create Automation"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
