
"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Thermometer, Droplets, Fan, Lightbulb, Waves, Wind, Server, Power, DoorClosed, BarChart, Zap, Cpu, AlertTriangle, Gauge, Sun, Flame, Move, AirVent, Speaker, Battery, Settings2, PinOff, Pin } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { Device, DeviceDataPoint } from '@/lib/types';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from './ui/button';

interface DeviceCardProps {
  device: Device;
  onToggle: (firestoreId: string, key: string, value: boolean) => void;
  onPinToggle: (firestoreId: string) => void;
}

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
  settings2: Settings2,
};

const INACTIVITY_THRESHOLD = 60000; // 60 seconds

const getDisplayName = (dp: DeviceDataPoint) => dp.displayName || dp.name.replace(/_/g, ' ');

const MetricDisplay = ({ dataPoint }: { dataPoint: DeviceDataPoint }) => {
    if (typeof dataPoint.value !== 'number' && typeof dataPoint.value !== 'string') return null;

    const IconComponent = ICONS[dataPoint.icon || 'server'] || Settings2;
    
    return (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-background/50">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted group">
                      <IconComponent className="h-7 w-7 text-muted-foreground transition-all group-hover:text-primary" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className='capitalize'>{getDisplayName(dataPoint)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex-grow">
                <p className="text-sm capitalize text-muted-foreground">{getDisplayName(dataPoint)}</p>
                <p className="text-2xl font-bold tracking-tighter">
                    {typeof dataPoint.value === 'number' ? (dataPoint.value as number).toFixed(1) : String(dataPoint.value)}
                    <span className="text-base font-normal text-muted-foreground ml-1">{dataPoint.unit}</span>
                </p>
            </div>
        </div>
    );
};

const ControlDisplay = ({ firestoreId, dataPoint, onToggle, online }: { firestoreId: string, dataPoint: DeviceDataPoint, onToggle: (firestoreId: string, key: string, value: boolean) => void, online: boolean }) => {
    if (typeof dataPoint.value !== 'boolean') return null;

    const isToggledOn = dataPoint.value === true;
    const IconComponent = ICONS[dataPoint.icon || 'power'] || Power;
    
    return (
        <div className="flex items-center justify-between w-full p-3 rounded-lg bg-background/50">
             <div className="flex items-center gap-3">
                <IconComponent className={cn(
                    "h-5 w-5 text-muted-foreground transition-all", 
                    isToggledOn && "text-primary",
                    isToggledOn && dataPoint.icon === 'fan' && "animate-spin",
                    isToggledOn && dataPoint.icon === 'lightbulb' && "drop-shadow-[0_0_8px_hsl(var(--primary))]"
                )} />
                <Label htmlFor={`${firestoreId}-${dataPoint.name}`} className="capitalize text-base font-medium cursor-pointer">
                    {getDisplayName(dataPoint)}
                </Label>
            </div>
             <Switch
                id={`${firestoreId}-${dataPoint.name}`}
                checked={isToggledOn}
                onCheckedChange={(newState) => {
                  onToggle(firestoreId, dataPoint.name, newState);
                }}
                disabled={!online}
                aria-label={`Toggle ${getDisplayName(dataPoint)}`}
            />
        </div>
    )
}


export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onToggle, onPinToggle }) => {
  const { firestoreId, name, online, data, lastSeen, error, pinned } = device;

  const dataEntries = data ? Object.values(data) : [];
  
  const metrics = dataEntries.filter(dp => typeof dp.value === 'number' || typeof dp.value === 'string');
  const controls = dataEntries.filter(dp => typeof dp.value === 'boolean');
  
  const lastSeenDate = lastSeen ? new Date(lastSeen as any) : null;
  const isUnresponsive = online && lastSeenDate && (Date.now() - lastSeenDate.getTime() > INACTIVITY_THRESHOLD);
  const status = error ? 'Error' : isUnresponsive ? 'Unresponsive' : online ? 'Online' : 'Offline';
  
  const getStatusBadgeClass = () => {
    if (error) return 'bg-destructive/20 text-destructive border-destructive/30';
    if (isUnresponsive) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    if (online) return 'bg-green-500/20 text-green-500 border-green-500/30';
    return 'bg-red-500/20 text-red-500 border-red-500/30';
  }
  
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevents navigation when interacting with controls inside the card
    if ((e.target as HTMLElement).closest('[role="switch"], label, [data-pin-button], a')) {
      e.preventDefault();
    }
  }

  return (
     <Link href={`/devices/${device.firestoreId}`} className="block h-full group">
        <Card onClick={handleCardClick} className={cn("flex flex-col transition-all duration-300 h-full", 
            "bg-card/60 backdrop-blur-sm border-border/20 group-hover:border-primary/60",
            "shadow-sm hover:shadow-lg hover:shadow-primary/10",
            !online && "opacity-70 saturate-[.8] bg-muted/30"
        )}>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
                <div className='flex items-center gap-3 flex-grow min-w-0'>
                    <div className='p-2 bg-background/50 rounded-full'>
                      <Cpu className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className='flex-grow min-w-0'>
                        <CardTitle className="text-xl font-bold truncate group-hover:text-primary transition-colors" title={name}>{name}</CardTitle>
                        <CardDescription className="pt-1 text-xs">
                            {lastSeenDate ? `Last seen ${formatDistanceToNow(lastSeenDate, { addSuffix: true })}` : "Never seen"}
                        </CardDescription>
                    </div>
                </div>
              <div className='flex items-center gap-2 flex-shrink-0'>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                data-pin-button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => onPinToggle(firestoreId!)}
                            >
                                {pinned ? <Pin className="h-4 w-4 text-primary" /> : <PinOff className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{pinned ? 'Unpin Device' : 'Pin Device'}</p>
                        </TooltipContent>
                    </Tooltip>
                 </TooltipProvider>

                 <Badge variant="outline" className={cn('px-2 py-0.5 text-xs font-medium border', getStatusBadgeClass())}>{status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            {metrics.length > 0 && (
               <div className={cn("grid gap-4 grid-cols-1", metrics.length > 1 && "md:grid-cols-2")}>
                {metrics.map((dataPoint) => (
                   <MetricDisplay key={dataPoint.name} dataPoint={dataPoint}/>
                ))}
              </div>
            )}
            {(metrics.length === 0 && controls.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                    {online ? 'Waiting for device data...' : 'Device is offline'}
                </div>
            )}
          </CardContent>
           {controls.length > 0 && (
                <CardFooter className="flex-col items-start gap-2 p-4 pt-4 border-t mt-auto">
                    <div className='w-full space-y-2'>
                        {controls.map((control) => (
                            <ControlDisplay
                                key={control.name}
                                firestoreId={firestoreId!}
                                dataPoint={control}
                                onToggle={onToggle}
                                online={online}
                            />
                        ))}
                    </div>
                </CardFooter>
            )}
        </Card>
    </Link>
  );
};
