
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import type { Device, DeviceDataPoint } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Thermometer, Droplets, Fan, Lightbulb, Waves, Wind, Server, Power, DoorClosed, BarChart, Zap, Cpu, Gauge, Sun, Flame, Move, AirVent, Speaker, Battery, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Line, ComposedChart, Bar } from 'recharts';
import Link from 'next/link';
import { Button } from './ui/button';
import { onSnapshot, doc, Timestamp } from 'firebase/firestore';
import { firebase } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

const INACTIVITY_THRESHOLD = 60000; // 60 seconds

const ICONS: { [key: string]: React.ElementType } = {
  thermometer: Thermometer,
  droplets: Droplets,
  fan: Fan,
  lightbulb: Lightbulb,
  waves: Waves,
  wind: Wind,
  power: Power,
  doorclosed: DoorClosed,
  barchart: BarChart,
  zap: Zap,
  cpu: Cpu,
  server: Server,
  gauge: Gauge,
  sun: Sun,
  flame: Flame,
  move: Move,
  airvent: AirVent,
  speaker: Speaker,
  battery: Battery,
};

const getDisplayName = (dp: DeviceDataPoint) => dp.displayName || dp.name.replace(/_/g, ' ');

function parseLastSeen(lastSeen: any): Date | null {
    if (!lastSeen) return null;
    if (lastSeen instanceof Date) return lastSeen;
    if (lastSeen.toDate instanceof Function) return lastSeen.toDate();
     if (typeof lastSeen === 'object' && lastSeen !== null && 'seconds' in lastSeen && 'nanoseconds' in lastSeen) {
         return new Timestamp(lastSeen.seconds, lastSeen.nanoseconds).toDate();
    }
    if (typeof lastSeen === 'string' || typeof lastSeen === 'number') {
        const d = new Date(lastSeen);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

export function DeviceDetailPage({ deviceId }: { deviceId: string }) {
    const { user } = useAuth();
    const [device, setDevice] = useState<Device | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [deviceNotFound, setDeviceNotFound] = useState(false);
    const router = useRouter();
    
    useEffect(() => {
        if (!deviceId || !user) {
            setIsLoading(false); // Can't load if there's no user/ID
            return;
        }
        
        const { db } = firebase;
        const deviceRef = doc(db, `users/${user.uid}/devices`, deviceId);

        const unsubscribe = onSnapshot(deviceRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                 const safeData = {
                    ...data,
                    history: data.history || [],
                    alertTriggered: data.alertTriggered || {},
                    pendingActions: data.pendingActions || {},
                };
                setDevice({ 
                    firestoreId: doc.id,
                    ...safeData,
                    lastSeen: parseLastSeen(data.lastSeen),
                 } as Device);
                 setDeviceNotFound(false);
            } else {
                setDevice(null);
                setDeviceNotFound(true);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching device details:", error);
            setIsLoading(false);
            setDeviceNotFound(true);
        });

        return () => unsubscribe();
    }, [deviceId, user]);

    const { chartData, chartConfig, numericKeys, booleanKeys } = useMemo(() => {
        if (!device?.history || !device.data) return { chartData: [], chartConfig: {}, numericKeys: [], booleanKeys: [] };

        const numericKeys = Object.keys(device.data).filter(key => typeof device.data[key].value === 'number');
        const booleanKeys = Object.keys(device.data).filter(key => typeof device.data[key].value === 'boolean');
        
        const chartConfig: ChartConfig = {};
        
        numericKeys.forEach((key, index) => {
            const dataPoint = device.data[key];
            if (!dataPoint) return;
            const colorKey = `chart-${(index % 5) + 1}`;
            chartConfig[key] = {
                label: getDisplayName(dataPoint) + (dataPoint.unit ? ` (${dataPoint.unit})` : ''),
                color: `hsl(var(--${colorKey}))`,
                icon: ICONS[dataPoint.icon || 'server'],
            };
        });

        booleanKeys.forEach((key, index) => {
            const dataPoint = device.data[key];
            if (!dataPoint) return;
            const colorKey = `chart-${((index + numericKeys.length) % 5) + 1}`;
             chartConfig[key] = {
                label: getDisplayName(dataPoint),
                color: `hsl(var(--${colorKey}))`,
                icon: ICONS[dataPoint.icon || 'power'],
            };
        })
        
        const chartData = (device.history || []).map(entry => {
            const formattedEntry: any = {
                timestamp: format(new Date(entry.timestamp), "HH:mm:ss"),
            };
            // Ensure all keys are present, defaulting to null if not in this specific entry
            [...numericKeys, ...booleanKeys].forEach(key => {
                formattedEntry[key] = entry[key] ?? null;
            });
            return formattedEntry;
        });

        return { chartData, chartConfig, numericKeys, booleanKeys };
    }, [device]);

    if (isLoading) {
        return (
             <div className="flex flex-col items-center justify-center h-full pt-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading device details...</p>
            </div>
        );
    }

    if (deviceNotFound) {
        return (
            <div className="text-center pt-20">
                <h1 className="text-2xl font-bold">Device Not Found</h1>
                <p className="text-muted-foreground">The device with this ID could not be found in your account.</p>
                <Button asChild variant="link" className="mt-4" onClick={() => router.push('/dashboard')}>
                    <span>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go back to Dashboard
                    </span>
                </Button>
            </div>
        );
    }

    if (!device) return null; // Should be covered by the states above

    const lastSeenDate = device.lastSeen ? parseLastSeen(device.lastSeen) : null;
    const isUnresponsive = device.online && lastSeenDate && (Date.now() - lastSeenDate.getTime() > INACTIVITY_THRESHOLD);
    const status = device.error ? "Error" : isUnresponsive ? 'Unresponsive' : device.online ? 'Online' : 'Offline';
    const getStatusBadgeClass = () => {
        if (device.error) return 'bg-destructive/20 text-destructive border-destructive/30';
        if (isUnresponsive) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
        if (device.online) return 'bg-green-500/20 text-green-500 border-green-500/30';
        return 'bg-red-500/20 text-red-500 border-red-500/30';
    }


    return (
        <div className="space-y-8">
            <div>
                 <Button asChild variant="outline" size="sm" className='mb-4'>
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{device.name}</h1>
                        <p className="text-muted-foreground">
                            Last seen: {lastSeenDate ? formatDistanceToNow(lastSeenDate, { addSuffix: true }) : 'Never'}
                        </p>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Badge variant="outline" className={cn('px-2 py-0.5 text-xs font-medium', getStatusBadgeClass())}>{status}</Badge>
                         {device.error && <AlertTriangle className="h-5 w-5 text-destructive" title={device.error} />}
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historical Data</CardTitle>
                    <CardDescription>Live chart of sensor readings and state changes over time.</CardDescription>
                </CardHeader>
                <CardContent>
                    {chartData.length > 1 && Object.keys(chartConfig).length > 0 ? (
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                 <defs>
                                    {numericKeys.map((key) => (
                                        <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={chartConfig[key]?.color} stopOpacity={0.8} />
                                            <stop offset="95%" stopColor={chartConfig[key]?.color} stopOpacity={0.1} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="timestamp"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickCount={5}
                                />
                                <YAxis yAxisId="left"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    allowDecimals={true}
                                />
                                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickMargin={8} domain={[0, 1]} ticks={[0, 1]} tickFormatter={(val) => val === 1 ? 'On' : 'Off'} />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent indicator="dot" />}
                                />
                                {numericKeys.map((key) => (
                                    <Area
                                        key={key}
                                        dataKey={key}
                                        type="natural"
                                        fill={`url(#fill-${key})`}
                                        stroke={chartConfig[key]?.color}
                                        yAxisId="left"
                                        stackId="a"
                                    />
                                ))}
                                 {booleanKeys.map((key) => (
                                    <Line
                                        key={key}
                                        dataKey={key}
                                        type="step"
                                        stroke={chartConfig[key]?.color}
                                        yAxisId="right"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                ))}
                            </ComposedChart>
                        </ChartContainer>
                    ) : (
                        <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground">
                            <p>Not enough historical data to display a chart yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Current State</CardTitle>
                    <CardDescription>The latest values reported by the device.</CardDescription>
                </CardHeader>
                <CardContent className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                    {device.data && Object.values(device.data).map(dp => {
                         const Icon = ICONS[dp.icon || 'server'];
                         return (
                            <Card key={dp.name} className='p-4'>
                                <CardHeader className='p-0 flex-row items-center gap-2'>
                                    {Icon && <Icon className='h-5 w-5 text-primary' />}
                                    <CardTitle className='text-base capitalize'>{getDisplayName(dp)}</CardTitle>
                                </CardHeader>
                                <CardContent className='p-0 pt-2'>
                                    <p className='text-2xl font-bold'>
                                        {typeof dp.value === 'boolean' 
                                            ? (dp.value ? 'On' : 'Off')
                                            : (typeof dp.value === 'number' ? dp.value.toFixed(1) : String(dp.value))
                                        }
                                        {dp.unit && <span className='text-lg font-normal text-muted-foreground ml-1'>{dp.unit}</span>}
                                    </p>
                                </CardContent>
                            </Card>
                         )
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
