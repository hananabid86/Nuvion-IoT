
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from 'next/link';
import { DeviceCard } from "@/components/device-card";
import type { Device, FilterType } from "@/lib/types";
import { WifiOff, HardDrive, Wifi, AlertTriangle, Activity, Plus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { addNotification } from "@/lib/notifications";
import { Button } from "./ui/button";
import { collection, onSnapshot, query, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "./stat-card";
import { useSearch } from "@/hooks/use-search";
import { useAuth } from "@/hooks/use-auth";
import { publishMqttCommand } from "@/actions/publish-mqtt-command";

function parseLastSeen(lastSeen: any): Date | null {
    if (!lastSeen) return null;
    if (lastSeen instanceof Date) return lastSeen;
    if (lastSeen instanceof Timestamp) return lastSeen.toDate();
    if (lastSeen?.toDate instanceof Function) return lastSeen.toDate();
    if (typeof lastSeen === 'object' && lastSeen !== null && 'seconds' in lastSeen && 'nanoseconds' in lastSeen) {
         return new Timestamp(lastSeen.seconds, lastSeen.nanoseconds).toDate();
    }
    if (typeof lastSeen === 'string' || typeof lastSeen === 'number') {
        const d = new Date(lastSeen);
        if (!isNaN(d.getTime())) return d;
    }
    console.warn("Could not parse lastSeen date:", lastSeen);
    return null;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const { toast } = useToast();
  const { searchTerm } = useSearch();

  // This effect manages the real-time data subscription from Firestore
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    const { db } = getFirebase();
    const q = query(collection(db, `users/${user.uid}/devices`));
    
    // Store the unsubscribe function returned by onSnapshot
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const previousDevices = new Map(devices.map(d => [d.firestoreId, d]));

        const devicesData: Device[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            const firestoreId = doc.id;
            const prevDevice = previousDevices.get(firestoreId);

            // Check for status change to trigger notification
            if (prevDevice && prevDevice.online !== data.online) {
                 addNotification(`${data.name} went ${data.online ? 'online' : 'offline'}.`, firestoreId);
            }
            
            return {
                firestoreId,
                ...data,
                lastSeen: parseLastSeen(data.lastSeen),
            } as Device;
        });

        setDevices(devicesData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error with real-time listener:", error);
        toast({ title: "Error", description: "Could not connect to real-time updates.", variant: "destructive" });
        setIsLoading(false);
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [user, toast]); // Removed `devices` from dependency array to prevent re-subscribing on every data change
  
  const handleToggle = useCallback(async (deviceId: string, key: string, value: boolean) => {
    if (!user) return;
    const device = devices.find(d => d.firestoreId === deviceId);
    if (!device) return;

    try {
        const command = { [key]: value };
        const result = await publishMqttCommand({ deviceId: device.id, command });

        if (result.success) {
            addNotification(`Sent command to '${device.name}' to turn ${key} ${value ? 'ON' : 'OFF'}.`, deviceId);
            // Optimistically update local state for immediate feedback
            setDevices(prevDevices => 
              prevDevices.map(d => {
                if (d.firestoreId === deviceId) {
                    const newData = { ...d.data };
                    if (newData[key]) {
                        newData[key] = { ...newData[key], value };
                    }
                    return { ...d, data: newData };
                }
                return d;
            }));
        } else {
            toast({ title: "Error", description: `Could not send command: ${result.error}`, variant: "destructive" });
        }
    } catch (error) {
        console.error("Error sending command:", error);
        toast({ title: "Error", description: "Could not send command to device.", variant: "destructive" });
    }
  }, [user, devices, toast]);
  
  const handlePinToggle = useCallback(async (firestoreId: string) => {
    if (!user) return;
    const { db } = getFirebase();
    const device = devices.find(d => d.firestoreId === firestoreId);
    if (!device || !device.firestoreId) return;
    const deviceRef = doc(db, `users/${user.uid}/devices`, device.firestoreId);
     try {
        await updateDoc(deviceRef, { pinned: !device.pinned });
        addNotification(
            `Device '${device.name}' was ${!device.pinned ? 'pinned' : 'unpinned'}.`,
            device.id
        );
    } catch (error) {
        console.error("Error pinning device:", error);
        toast({ title: "Error", description: "Could not pin/unpin device.", variant: "destructive" });
    }
  }, [user, devices, toast]);

  const stats = useMemo(() => {
    const online = devices.filter(d => d.online).length;
    const offline = devices.length - online;
    const alerts = devices.filter(d => d.alertTriggered && Object.values(d.alertTriggered).some(v => v === true)).length;
    const errors = devices.filter(d => !!d.error).length;
    return { online, offline, alerts, errors, total: devices.length };
  }, [devices]);
  
  const filteredDevices = useMemo(() => devices
    .filter(device => {
        const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        switch (filter) {
        case 'online':
            return device.online;
        case 'offline':
            return !device.online;
        case 'alerts':
            return device.alertTriggered && Object.values(device.alertTriggered).some(v => v === true);
        case 'error':
            return !!device.error;
        case 'all':
        default:
            return true;
        }
    })
    .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return a.name.localeCompare(b.name);
    }), [devices, searchTerm, filter]);
  
  if (isLoading) {
      return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Loading devices...</p>
                </div>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            {/* Skeleton loading state */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => <Card key={i} className="h-28 animate-pulse bg-muted/50" />)}
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {[...Array(2)].map((_, i) => <Card key={i} className="h-64 animate-pulse bg-muted/50" />)}
            </div>
        </div>
      )
  }

  return (
    <div className="space-y-8">
       <div className="p-6 rounded-xl bg-card border shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">IoT Command Center</h1>
            <p className="text-muted-foreground">Real-time monitoring and control dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/devices">
                <Plus className="mr-2 h-4 w-4" /> Add Device
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Devices" value={stats.total} icon={HardDrive} filter="all" currentFilter={filter} setFilter={setFilter} />
        <StatCard title="Online" value={stats.online} icon={Wifi} color="text-green-500" filter="online" currentFilter={filter} setFilter={setFilter} />
        <StatCard title="Offline" value={stats.offline} icon={WifiOff} color="text-red-500" filter="offline" currentFilter={filter} setFilter={setFilter} />
        <StatCard title="Active Alerts" value={stats.alerts} icon={AlertTriangle} color="text-yellow-500" filter="alerts" currentFilter={filter} setFilter={setFilter} />
        <StatCard title="Errors" value={stats.errors} icon={Activity} color="text-destructive" filter="error" currentFilter={filter} setFilter={setFilter} />
      </div>

      {filteredDevices.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredDevices.map((device) => (
             <DeviceCard key={device.firestoreId} device={device} onToggle={handleToggle} onPinToggle={handlePinToggle} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center shadow-sm h-64">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background">
                <HardDrive className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-6 text-xl font-semibold">
              {devices.length > 0 && searchTerm ? 'No Matching Devices' : 'No Devices Yet'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {devices.length > 0 && searchTerm
                ? 'No devices match your current search term.' 
                : 'Go to the Devices page to add your first device.'}
            </p>
             {devices.length === 0 && !searchTerm && (
                <Button asChild className="mt-4">
                    <Link href="/devices">Add Device</Link>
                </Button>
            )}
        </div>
      )}
    </div>
  );
}
