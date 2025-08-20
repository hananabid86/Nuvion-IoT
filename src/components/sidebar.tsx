
"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Rss, LayoutDashboard, HardDrive, Sun, Moon, CheckCircle, User, ChevronLeft, X, AlertTriangle, Bot, Github } from 'lucide-react';
import { useTheme } from "next-themes";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import type { Device } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppState } from '@/hooks/use-app-state';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

const { db } = getFirebase();

const ThemeToggleButton = () => {
    const { setTheme, theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return <Button variant="ghost" size="icon" className="h-10 w-10" />;
    }

    return (
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
    )
}


export function Sidebar() {
    const pathname = usePathname();
    const { isSidebarOpen, isSidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useAppState();
    const { user } = useAuth();
    const [devices, setDevices] = useState<Device[]>([]);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `users/${user.uid}/devices`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const devicesData = snapshot.docs.map(doc => doc.data() as Device);
            setDevices(devicesData);
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const content = document.getElementById('content');
        if (content) {
            // Use a media query to check if we are on a desktop-sized screen
            if (window.matchMedia('(min-width: 768px)').matches) {
                if(isSidebarCollapsed) {
                    content.style.marginLeft = `var(--sidebar-width-collapsed)`;
                } else {
                    content.style.marginLeft = `var(--sidebar-width-expanded)`;
                }
            } else {
                // On mobile, the margin should always be 0 because the sidebar overlays
                content.style.marginLeft = '0px';
            }
        }
    }, [isSidebarCollapsed]);
    
     useEffect(() => {
        // Close sidebar on route change on mobile
        if (isSidebarOpen && window.matchMedia('(max-width: 767px)').matches) {
            toggleSidebar();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const onlineDevices = devices.filter(d => d.online).length;
    const totalDevices = devices.length;

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/devices', label: 'Devices', icon: HardDrive },
        { href: '/alerts', label: 'Alerts', icon: AlertTriangle },
        { href: '/automations', label: 'Automations', icon: Bot },
    ];
    
    const SidebarLink = ({ href, label, icon: Icon, isProfileLink = false, external = false }: { href: string, label: string, icon: React.ElementType, isProfileLink?: boolean, external?: boolean }) => {
      const isActive = pathname === href;
      const linkClasses = cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          isSidebarCollapsed && "justify-center"
      );
      const linkContent = (
         <div className={linkClasses}>
           <Icon className="h-5 w-5" />
           <span className={cn("truncate", isSidebarCollapsed && "hidden")}>{label}</span>
         </div>
      );

      const linkProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};

      return isSidebarCollapsed ? (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link href={href} {...linkProps}>{linkContent}</Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      ) : (
        <Link href={href} {...linkProps}>{linkContent}</Link>
      )
    }

    const SidebarContent = () => (
        <div className="relative flex-grow flex flex-col">
            <div className={cn("flex items-center justify-between h-16 border-b px-6", isSidebarCollapsed && "justify-center")}>
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                    <Rss className="h-7 w-7 text-sidebar-primary" />
                    <span className={cn("truncate", isSidebarCollapsed && "hidden")}>Nuvion-IoT</span>
                </Link>
                 <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
                    <X className="h-6 w-6" />
                </Button>
            </div>
            <nav className="flex-grow px-4 py-4 space-y-2">
                {navItems.map((item) => (
                    <SidebarLink key={item.href} {...item} />
                ))}
            </nav>
            
            <div className="p-4 border-t mt-auto space-y-2">
                <div className={cn(
                    "rounded-lg p-3 transition-all duration-300",
                    !isSidebarCollapsed && "bg-sidebar-accent"
                )}>
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle className={cn("h-5 w-5", totalDevices > 0 && onlineDevices === totalDevices ? "text-green-500" : "text-muted-foreground")} />
                        <span className={cn(isSidebarCollapsed && "hidden")}>{onlineDevices}/{totalDevices} Active</span>
                    </div>
                </div>
                 <div className={cn("rounded-lg", !isSidebarCollapsed && "bg-sidebar-accent")}>
                    <div className={cn('flex items-center justify-between', isSidebarCollapsed && "justify-center")}>
                        <h3 className={cn("font-medium text-sm pl-3", isSidebarCollapsed && "hidden")}>Theme</h3>
                        <ThemeToggleButton />
                    </div>
                </div>
                <div className={cn(
                    "rounded-lg",
                    !isSidebarCollapsed && "bg-sidebar-accent"
                )}>
                    <SidebarLink href="/profile" label="Profile" icon={User} isProfileLink={true} />
                </div>
                 <div className="border-t pt-2">
                    <SidebarLink href="https://github.com/hananabid86/Nuvion-IoT" label="developed by Hanan abid" icon={Github} external={true} />
                 </div>
            </div>

        </div>
    );

    return (
       <>
            {/* Mobile Sidebar (Overlay) */}
            <div className={cn(
                'fixed inset-0 bg-black/60 z-50 md:hidden',
                isSidebarOpen ? 'block' : 'hidden'
            )} onClick={toggleSidebar}></div>
            <aside 
                className={cn(
                  "fixed top-0 left-0 h-full z-50 flex-shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0",
                  isSidebarOpen ? "translate-x-0" : "-translate-x-full",
                  isSidebarCollapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width-expanded)]"
                )}
            >
                <SidebarContent />
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSidebarCollapsed(!isSidebarCollapsed)} 
                    className="absolute top-1/2 -right-4 h-8 w-8 rounded-full bg-background border-2 border-border shadow-md hover:bg-accent hidden md:flex"
                    style={{ transform: 'translateY(-50%)' }}
                >
                    <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", isSidebarCollapsed && "rotate-180")} />
                </Button>
            </aside>
        </>
    );
}
