
"use client"
import Link from 'next/link';
import { User, LogOut, Bell, Trash2, Sun, Moon, HardDrive, Menu, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { Device, Notification } from '@/lib/types';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { markNotificationsAsRead, clearAllNotifications, getNotifications } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { useAppState } from '@/hooks/use-app-state';
import { useTheme } from 'next-themes';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';
import { SearchInput } from './search-input';
import { useAuth } from '@/hooks/use-auth';

const { db } = getFirebase();

const ThemeToggleButton = () => {
    const { setTheme, theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return <Button variant="ghost" size="icon" className="h-9 w-9" />;
    }

    return (
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
    )
}

export function Header() {
    const { toggleSidebar } = useAppState();
    const { user, signOut } = useAuth();
    const [devices, setDevices] = useState<Device[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    
    // Listen for device changes from Firestore
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `users/${user.uid}/devices`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const devicesData = snapshot.docs.map(doc => doc.data() as Device);
            setDevices(devicesData);
        });
        return () => unsubscribe();
    }, [user]);
    
    // Listen for notification changes from our in-memory store
    useEffect(() => {
        const handleNotificationsUpdate = () => {
            setNotifications(getNotifications());
        };
        window.addEventListener('notifications-updated', handleNotificationsUpdate);
        handleNotificationsUpdate(); // Initial load
        return () => window.removeEventListener('notifications-updated', handleNotificationsUpdate);
    }, []);
    

    const handleNotificationMenuOpen = (open: boolean) => {
        if (!open) { // When menu is closed, mark as read
            markNotificationsAsRead();
            setShowAllNotifications(false); // Reset view on close
        }
    }

    const onlineDevices = devices.filter(d => d.online).length;
    const totalDevices = devices.length;
    const displayedNotifications = (showAllNotifications ? notifications : notifications.slice(0, 5)).sort((a,b) => b.timestamp - a.timestamp);

    return (
        <>
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
            <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
                        <Menu className="h-6 w-6" />
                    </Button>
                     <div className="hidden sm:flex items-center gap-3 rounded-lg border bg-card/60 px-3 py-1.5 shadow-sm">
                        <CheckCircle className={cn("h-6 w-6", totalDevices > 0 && onlineDevices === totalDevices ? "text-green-500" : "text-muted-foreground")} />
                        <div>
                            <p className="text-sm font-semibold">{onlineDevices} / {totalDevices}</p>
                            <p className="text-xs text-muted-foreground">Devices Online</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-1 sm:space-x-2">
                    
                    <SearchInput />

                    <DropdownMenu onOpenChange={handleNotificationMenuOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative h-9 w-9">
                                <Bell className="h-5 w-5" />
                                {notifications.filter(n => !n.read).length > 0 &&
                                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary/80"></span>
                                    </span>
                                }
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             {displayedNotifications.length > 0 ? displayedNotifications.map(notif => (
                                <DropdownMenuItem key={notif.id} className={cn(!notif.read && 'font-semibold')}>
                                    <div className='flex flex-col gap-1 w-full'>
                                        <div className='flex items-start justify-between'>
                                            <p className='text-sm pr-2 text-wrap'>{notif.message}</p>
                                            {!notif.read && <span className='h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0'></span>}
                                        </div>
                                        <p className={cn('text-xs text-muted-foreground', !notif.read && 'font-normal')}>
                                            {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                </DropdownMenuItem>
                             )) : (
                                 <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                    No new notifications.
                                 </div>
                             )}
                            {notifications.length > 0 && (
                                <>
                                    <DropdownMenuSeparator />
                                    <div className='flex justify-between items-center p-1'>
                                        {notifications.length > 5 && (
                                             <Button variant="link" className="text-xs" onClick={() => setShowAllNotifications(!showAllNotifications)}>
                                                {showAllNotifications ? 'Show Less' : 'Show All'}
                                            </Button>
                                        )}
                                        <Button variant="link" className="text-xs text-destructive hover:text-destructive" onClick={clearAllNotifications}>
                                            <Trash2 className='mr-1 h-3 w-3'/>
                                            Clear All
                                        </Button>
                                    </div>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <ThemeToggleButton />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user?.photoURL || "https://placehold.co/100x100.png"} alt="User Avatar" data-ai-hint="user avatar" />
                                    <AvatarFallback>{user?.email?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.displayName || 'IoT User'}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user?.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/profile">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={signOut}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
        </>
    );
}
