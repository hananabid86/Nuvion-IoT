
"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Thermometer, Droplets, Fan, Lightbulb, Waves, Wind, Server, Power, DoorClosed, BarChart, Zap, Cpu, Settings2, ChevronDown, Gauge, Sun, Flame, Move, AirVent, Speaker, Battery, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Device, DeviceDataPoint } from '@/lib/types';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

const generateApiKey = () => `iotc_${crypto.randomUUID().replace(/-/g, '')}`;

type VariableType = 'number' | 'boolean' | 'string';

const ICONS: { [key: string]: { component: React.ElementType, name: string } } = {
  thermometer: { component: Thermometer, name: 'Temperature' },
  droplets: { component: Droplets, name: 'Humidity' },
  sun: { component: Sun, name: 'Light Level' },
  wind: { component: Wind, name: 'Wind' },
  gauge: { component: Gauge, name: 'Pressure/Speed' },
  waves: { component: Waves, name: 'Water/pH' },
  lightbulb: { component: Lightbulb, name: 'Light' },
  fan: { component: Fan, name: 'Fan' },
  power: { component: Power, name: 'Power' },
  airvent: { component: AirVent, name: 'Ventilation' },
  doorclosed: { component: DoorClosed, name: 'Door' },
  move: { component: Move, name: 'Motion' },
  speaker: { component: Speaker, name: 'Alarm/Sound' },
  flame: { component: Flame, name: 'Gas/Smoke' },
  zap: { component: Zap, name: 'Voltage' },
  battery: { component: Battery, name: 'Battery' },
  barchart: { component: BarChart, name: 'Generic Sensor' },
  cpu: { component: Cpu, name: 'Processor' },
  server: { component: Server, name: 'Generic Data' },
};

interface DeviceVariable extends DeviceDataPoint {
  id: string; // Use string for ID to be more robust
  type: VariableType;
}

const PRESETS: Omit<DeviceVariable, 'id' | 'type' | 'value'> & { value: number | boolean, type: VariableType }[] = [
    { name: 'temperature', displayName: 'Temperature', type: 'number', value: 25, icon: 'thermometer', unit: '°C' },
    { name: 'humidity', displayName: 'Humidity', type: 'number', value: 50, icon: 'droplets', unit: '%' },
    { name: 'light', displayName: 'Light Switch', type: 'boolean', value: false, icon: 'lightbulb', unit: '' },
    { name: 'fan', displayName: 'Fan Control', type: 'boolean', value: false, icon: 'fan', unit: '' },
    { name: 'power', displayName: 'Power Toggle', type: 'boolean', value: false, icon: 'power', unit: '' },
    { name: 'door', displayName: 'Door Sensor', type: 'boolean', value: false, icon: 'doorclosed', unit: '' },
    { name: 'pressure', displayName: 'Pressure', type: 'number', value: 1013, icon: 'gauge', unit: 'hPa' },
    { name: 'voltage', displayName: 'Voltage', type: 'number', value: 5, icon: 'zap', unit: 'V' },
    { name: 'cpu_usage', displayName: 'CPU Usage', type: 'number', value: 10, icon: 'cpu', unit: '%' },
];

const formatVariableName = (name: string) => {
    return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

interface VariableEditorProps {
    variable: DeviceVariable;
    onUpdate: (id: string, updatedVariable: DeviceVariable) => void;
    onRemove: (id: string) => void;
}

const VariableEditor = React.memo(function VariableEditor({ variable, onUpdate, onRemove }: VariableEditorProps) {
    const handleFieldUpdate = <K extends keyof DeviceVariable>(field: K, value: DeviceVariable[K]) => {
        onUpdate(variable.id, { ...variable, [field]: value });
    };

    const handleAlertUpdate = <K extends keyof NonNullable<DeviceVariable['alert']>>(field: K, value: NonNullable<DeviceVariable['alert']>[K]) => {
        const updatedAlert = { ...(variable.alert || { enabled: false, condition: 'above', threshold: 0 }), [field]: value };
        handleFieldUpdate('alert', updatedAlert);
    };

    const handleTypeChange = (type: VariableType) => {
        let value: string | number | boolean = '';
        if (type === 'number') value = 0;
        else if (type === 'boolean') value = false;
        onUpdate(variable.id, { ...variable, type, value });
    };

    const Icon = ICONS[variable.icon]?.component || Settings2;

    return (
        <div className="p-4 rounded-lg border bg-muted/20 relative group">
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground/50 hover:text-destructive h-7 w-7" onClick={() => onRemove(variable.id)}>
                <X className="h-4 w-4" />
            </Button>
            <div className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start'>
                    <div className='space-y-4'>
                         <div className="space-y-1.5">
                            <Label className='text-muted-foreground'>Display Name</Label>
                            <Input
                                placeholder="e.g., CPU Temperature"
                                value={variable.displayName}
                                onChange={(e) => handleFieldUpdate('displayName', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground px-1">A friendly name shown in the UI.</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className='text-muted-foreground'>Variable Name (Key)</Label>
                            <Input
                                placeholder="e.g., cpu_temp"
                                value={variable.name}
                                onChange={(e) => handleFieldUpdate('name', formatVariableName(e.target.value))}
                                className='font-mono'
                            />
                             <p className="text-xs text-muted-foreground px-1">Must match key in JSON payload. No spaces.</p>
                        </div>
                    </div>

                    <div className='space-y-4'>
                        <div className="space-y-1.5">
                            <Label className='text-muted-foreground'>Data Type</Label>
                            <Select value={variable.type} onValueChange={(v: VariableType) => handleTypeChange(v)}>
                                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Boolean (On/Off)</SelectItem>
                                    <SelectItem value="string">String</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="grid grid-cols-3 gap-2 items-end">
                            <div className={cn("space-y-1.5", variable.type === 'number' ? 'col-span-2' : 'col-span-3')}>
                              <Label className='text-muted-foreground'>Initial Value</Label>
                              {variable.type === 'boolean' ? (
                                 <Select value={String(variable.value)} onValueChange={(val) => handleFieldUpdate('value', val === 'true')}>
                                   <SelectTrigger><SelectValue placeholder="Value" /></SelectTrigger>
                                   <SelectContent>
                                     <SelectItem value="true">On (true)</SelectItem>
                                     <SelectItem value="false">Off (false)</SelectItem>
                                   </SelectContent>
                                 </Select>
                              ) : (
                                <Input
                                    placeholder={variable.type === 'number' ? '0' : 'some_text'}
                                    value={String(variable.value)}
                                    onChange={(e) => handleFieldUpdate('value', e.target.value)}
                                    type={variable.type === 'number' ? 'number' : 'text'}
                                />
                              )}
                            </div>
                            <div className={cn("space-y-1.5 col-span-1", variable.type !== 'number' && 'hidden')}>
                                <Label className='text-muted-foreground'>Unit</Label>
                                <Input
                                    placeholder="°C, %"
                                    value={variable.unit}
                                    onChange={(e) => handleFieldUpdate('unit', e.target.value)}
                                    disabled={variable.type !== 'number'}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="my-4" />

                 <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start'>
                    <div className="space-y-1.5">
                        <Label className='text-muted-foreground'>Display Icon</Label>
                        <Select value={variable.icon} onValueChange={(icon: string) => handleFieldUpdate('icon', icon)}>
                            <SelectTrigger>
                                 <div className='flex items-center gap-2'>
                                    <Icon className="h-4 w-4" />
                                    {ICONS[variable.icon]?.name || 'Custom'}
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Select an Icon</SelectLabel>
                                  {Object.entries(ICONS).map(([key, {component: IconComp, name}]) => (
                                    <SelectItem key={key} value={key}>
                                        <div className='flex items-center gap-2'>
                                            <IconComp className="h-4 w-4" />
                                            {name}
                                        </div>
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    {variable.type === 'number' && (
                       <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor={`alert-switch-${variable.id}`} className="flex items-center gap-2 font-medium">
                                    <AlertCircle className="h-5 w-5 text-primary"/>
                                    Alerting
                                </Label>
                                <Switch
                                    id={`alert-switch-${variable.id}`}
                                    checked={variable.alert?.enabled ?? false}
                                    onCheckedChange={(checked) => handleAlertUpdate('enabled', checked)}
                                />
                            </div>
                            {(variable.alert?.enabled) && (
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1.5">
                                        <Label className='text-muted-foreground'>Condition</Label>
                                        <Select value={variable.alert.condition} onValueChange={(val: 'above' | 'below') => handleAlertUpdate('condition', val)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="above">Is Above</SelectItem>
                                                <SelectItem value="below">Is Below</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className='text-muted-foreground'>Threshold</Label>
                                        <Input
                                            type="number"
                                            value={variable.alert.threshold}
                                            onChange={(e) => handleAlertUpdate('threshold', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            )}
                       </div>
                    )}
                </div>
            </div>
        </div>
    );
});


interface CreateDeviceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (device: Device) => void;
    deviceToEdit?: Device | null;
}

export function CreateDeviceDialog({ 
    open, 
    onOpenChange, 
    onSave, 
    deviceToEdit, 
}: CreateDeviceDialogProps) {
    const [deviceName, setDeviceName] = useState('');
    const [hardwareId, setHardwareId] = useState('');
    const [variables, setVariables] = useState<DeviceVariable[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            if (deviceToEdit) {
                 setDeviceName(deviceToEdit.name);
                 setHardwareId(deviceToEdit.id);
                 setVariables(Object.entries(deviceToEdit.data || {}).map(([key, value]) => ({
                    id: key,
                    name: key,
                    displayName: value.displayName || '',
                    type: typeof value.value === 'boolean' ? 'boolean' : (typeof value.value === 'number' ? 'number' : 'string'),
                    value: value.value,
                    icon: value.icon,
                    unit: value.unit || '',
                    alert: value.alert || { enabled: false, condition: 'above', threshold: 0 }
                })));
            } else {
                setDeviceName('');
                setHardwareId(`dev-${crypto.randomUUID().slice(0, 8)}`);
                setVariables([]);
            }
        }
    }, [open, deviceToEdit]);

    
    const addVariable = useCallback((preset?: Partial<DeviceVariable>) => {
        const id = `var_${crypto.randomUUID()}`;
        const newVariable: DeviceVariable = { 
            id, 
            name: preset?.name || 'new_variable', 
            displayName: preset?.displayName || 'New Variable',
            type: preset?.type || 'number', 
            value: preset?.value ?? 0, 
            icon: preset?.icon || 'server', 
            unit: preset?.unit || '',
            alert: preset?.alert || { enabled: false, condition: 'above', threshold: 0 },
        };
        setVariables(vars => [...vars, newVariable]);
    }, []);


    const updateVariable = useCallback((id: string, updatedVariable: DeviceVariable) => {
        setVariables(vars => vars.map(v => v.id === id ? updatedVariable : v));
    }, []);

    const removeVariable = useCallback((id: string) => {
        setVariables(vars => vars.filter(v => v.id !== id));
    }, []);

    const saveDevice = () => {
        if (!deviceName.trim() || !hardwareId.trim()) {
            toast({ title: "Error", description: "Device Name and Hardware ID cannot be empty.", variant: "destructive" });
            return;
        }

        const deviceData: { [key: string]: DeviceDataPoint } = {};
        const variableNames = new Set();
        for(const v of variables) {
            const finalName = formatVariableName(v.name);
            if (!finalName) {
                toast({ title: "Error", description: `Variable with display name "${v.displayName}" has an invalid name.`, variant: "destructive" });
                return;
            }
            if (variableNames.has(finalName)) {
                toast({ title: "Error", description: `Duplicate variable name: "${finalName}". Names must be unique.`, variant: "destructive" });
                return;
            }
            variableNames.add(finalName);
            
            let value: string | number | boolean = v.value;
            if (v.type === 'number') value = Number(v.value) || 0;
            if (v.type === 'boolean') value = v.value === true || String(v.value) === 'true';
            
            const dataPoint: DeviceDataPoint = {
              name: finalName,
              displayName: v.displayName,
              value: value,
              icon: v.icon,
              unit: v.unit,
            };

            if (v.type === 'number') {
                dataPoint.alert = v.alert;
            }
            
            deviceData[finalName] = dataPoint;
        }

        if (Object.keys(deviceData).length === 0) {
            toast({ title: "Error", description: "Please add at least one variable.", variant: "destructive" });
            return;
        }

        if (deviceToEdit) {
            const updatedDevice = { ...deviceToEdit, name: deviceName, id: hardwareId, data: deviceData };
            onSave(updatedDevice as Device);
        } else {
            const newDevice: Omit<Device, 'firestoreId' | 'lastSeen'> = {
                id: hardwareId,
                name: deviceName,
                apiKey: generateApiKey(),
                online: false,
                data: deviceData,
                owner: "dev-user", // Hardcoded user for development without auth
                history: [],
                pendingActions: {},
                alertTriggered: {},
                pinned: false,
            };
            onSave(newDevice as Device);
        }
        
        onOpenChange(false);
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{deviceToEdit ? 'Edit Device Profile' : 'Create New Device Profile'}</DialogTitle>
                    <DialogDescription>
                        {deviceToEdit ? 'Update the details for your device.' : 'Define the name, unique hardware ID, and data variables for your new device.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto pr-4 -mr-4 grid gap-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Device Name</Label>
                            <Input
                                id="name"
                                value={deviceName}
                                onChange={(e) => setDeviceName(e.target.value)}
                                placeholder="e.g., Living Room Sensor"
                            />
                        </div>
                        <div className="space-y-1.5">
                             <Label htmlFor="hardwareId">Hardware ID</Label>
                            <Input
                                id="hardwareId"
                                value={hardwareId}
                                onChange={(e) => setHardwareId(e.target.value)}
                                placeholder="e.g., a MAC address"
                                className="font-mono"
                                disabled={!!deviceToEdit}
                            />
                            <p className="text-xs text-muted-foreground px-1">A unique, permanent ID for your physical device. Cannot be changed after creation.</p>
                        </div>
                    </div>
                    <div className='space-y-4'>
                        <div className='flex items-center justify-between'>
                            <Label>Data Variables & Controls</Label>
                             <div className='flex items-center gap-2'>
                                <Button variant="outline" onClick={() => addVariable()}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Variable
                                </Button>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            Add Preset <ChevronDown className='ml-2 h-4 w-4' />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Add from Preset</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                       {PRESETS.map((preset) => {
                                            const Icon = ICONS[preset.icon]?.component || Settings2;
                                            return (
                                                <DropdownMenuItem key={preset.name} onClick={() => addVariable(preset as any)}>
                                                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                                    <span className="capitalize">{preset.displayName || preset.name}</span>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                         <div className='space-y-3 p-3 border rounded-lg bg-background'>
                            {variables.map((v) => (
                                <VariableEditor 
                                    key={v.id} 
                                    variable={v} 
                                    onUpdate={updateVariable}
                                    onRemove={removeVariable}
                                />
                            ))}
                            {variables.length === 0 && (
                                <div className='flex flex-col items-center justify-center text-center p-10'>
                                    <Server className="h-12 w-12 text-muted-foreground/50" />
                                    <p className='mt-4 font-medium text-muted-foreground'>No variables added yet.</p>
                                    <p className='text-sm text-muted-foreground'>Click "Add Variable" or a preset to get started.</p>
                                </div>
                            )}
                         </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" onClick={saveDevice}>{deviceToEdit ? 'Save Changes' : 'Create Device'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
