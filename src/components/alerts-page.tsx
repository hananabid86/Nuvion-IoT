
"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Notification } from '@/lib/types';
import { AlertTriangle, BellOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { getNotifications, markNotificationsAsRead } from '@/lib/notifications';


export function AlertsPage() {
    const [alerts, setAlerts] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadAlerts = () => {
        setIsLoading(true);
        const allNotifications = getNotifications();
        const alertNotifications = allNotifications.filter(n => 
            n.message.toLowerCase().includes('alert for') ||
            n.message.toLowerCase().includes('unresponsive') ||
            n.message.toLowerCase().includes('went offline') ||
            n.message.toLowerCase().includes('error')
        );
        setAlerts(alertNotifications.sort((a, b) => b.timestamp - a.timestamp));
        setIsLoading(false);
    }
    
    useEffect(() => {
        loadAlerts();
        markNotificationsAsRead();
        
        const handleNotificationsUpdate = () => loadAlerts();
        window.addEventListener('notifications-updated', handleNotificationsUpdate);

        return () => {
          window.removeEventListener('notifications-updated', handleNotificationsUpdate);
        };
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Alert History</h1>
                    <p className="text-muted-foreground">Loading alerts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Alert History</h1>
                <p className="text-muted-foreground">A log of all triggered device alerts from your current session.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Recent Alerts</CardTitle>
                    <CardDescription>
                        {alerts.length > 0 
                            ? `Showing the last ${alerts.length} triggered alerts.`
                            : `No alerts have been triggered yet.`
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {alerts.length > 0 ? (
                        <div className="space-y-4">
                            {alerts.map(alert => (
                                <div key={alert.id} className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50">
                                    <div className="p-2 bg-destructive/10 rounded-full">
                                        <AlertTriangle className="h-6 w-6 text-destructive" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-medium">{alert.message}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                    {!alert.read && (
                                        <Badge variant="destructive" className="h-fit">New</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center gap-4 py-16 text-center rounded-lg border-2 border-dashed">
                            <BellOff className="h-12 w-12 text-muted-foreground" />
                            <h3 className="text-xl font-semibold">All Clear</h3>
                            <p className="text-muted-foreground">
                                There are no alerts to show right now.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
