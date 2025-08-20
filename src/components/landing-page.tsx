
"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Rss, ArrowRight, Blocks, BrainCircuit, KeyRound, Server, Zap, ShieldCheck, AreaChart, Bot, Factory, Home, Leaf, Sun, Moon, Github, Wifi, Users, ArrowUp } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { DeviceCard } from './device-card';
import type { Device } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollProgressBar } from './scroll-progress-bar';

export function LandingPage() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [visitCount, setVisitCount] = useState(0);
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initialize count from localStorage.
    const storedCount = parseInt(localStorage.getItem('visitCount') || '0', 10);
    const newCount = storedCount + 1;
    setVisitCount(newCount);
    localStorage.setItem('visitCount', String(newCount));
  }, []);
  
  useEffect(() => {
    const checkScroll = () => {
      if (!showScroll && window.pageYOffset > 400){
        setShowScroll(true)
      } else if (showScroll && window.pageYOffset <= 400){
        setShowScroll(false)
      }
    };

    window.addEventListener('scroll', checkScroll)
    return () => window.removeEventListener('scroll', checkScroll)
  }, [showScroll]);

  const scrollTop = () =>{
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const ThemeToggleButton = () => {
    if (!mounted) {
      return <Button variant="ghost" size="icon" className="h-9 w-9" />;
    }
    return (
      <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
    );
  };
    
  const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
      <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border/20 text-left h-full shadow-lg hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300 flex flex-col">
          <div className="flex items-center gap-4 mb-4">
               <div className="inline-block p-3 rounded-lg bg-primary/10 text-primary border-2 border-primary/20">
                  <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">{title}</h3>
          </div>
          <p className="text-muted-foreground flex-grow">{description}</p>
      </div>
  );

   const StepCard = ({ number, title, description }: { number: string, title:string, description:string }) => (
      <div className="text-center">
          <div className="relative flex justify-center items-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">{number}</span>
              </div>
          </div>
          <h3 className="mt-6 text-xl font-bold">{title}</h3>
          <p className="mt-2 text-muted-foreground">{description}</p>
      </div>
  );
  
  const mockDevices: Device[] = [
    {
      id: 'mock-1',
      firestoreId: 'mock-1',
      name: 'Living Room Climate',
      online: true,
      owner: 'mock-owner',
      apiKey: 'mock-key',
      lastSeen: new Date(),
      data: {
        temperature: { name: 'temperature', displayName: 'Temperature', value: 22.5, icon: 'thermometer', unit: '°C' },
        humidity: { name: 'humidity', displayName: 'Humidity', value: 45, icon: 'droplets', unit: '%' },
        light_switch: { name: 'light_switch', displayName: 'Overhead Light', value: true, icon: 'lightbulb' }
      }
    },
    {
      id: 'mock-2',
      firestoreId: 'mock-2',
      name: 'Office Desk',
      online: true,
      pinned: true,
      owner: 'mock-owner',
      apiKey: 'mock-key',
      lastSeen: new Date(),
      data: {
        power_strip: { name: 'power_strip', displayName: 'Power Strip', value: true, icon: 'power' },
        fan_control: { name: 'fan_control', displayName: 'Desk Fan', value: false, icon: 'fan' }
      }
    },
    {
      id: 'mock-3',
      firestoreId: 'mock-3',
      name: 'Aquarium Monitor',
      online: false,
      owner: 'mock-owner',
      apiKey: 'mock-key',
      lastSeen: new Date(Date.now() - 86400000), // 1 day ago
      data: {
        water_temp: { name: 'water_temp', displayName: 'Water Temp', value: 26.1, icon: 'waves', unit: '°C' },
        pump_status: { name: 'pump_status', displayName: 'Filter Pump', value: false, icon: 'zap' }
      }
    },
  ];

  return (
      <div className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
          <ScrollProgressBar />
          {/* Animated background */}
          <div className="absolute top-0 left-0 -z-10 h-full w-full">
            <div className="absolute bottom-auto left-auto right-0 top-0 h-[500px] w-[500px] -translate-x-[20%] translate-y-[20%] rounded-full bg-[rgba(0,128,255,0.5)] opacity-50 blur-[80px]"></div>
          </div>

          {/* Header */}
          <header className="sticky top-0 z-40 w-full border-b border-border/30 bg-background/80 backdrop-blur-sm">
              <div className="container flex h-16 items-center justify-between">
                  <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                      <Rss className="h-7 w-7 text-primary" />
                      <span>Nuvion-IoT</span>
                  </Link>
                   <nav className='flex items-center gap-2'>
                       <ThemeToggleButton />
                       <Button asChild variant="ghost">
                           <Link href="/login">Log In</Link>
                       </Button>
                       <Button asChild>
                           <Link href="/signup">Sign Up <ArrowRight className="ml-2 h-4 w-4" /></Link>
                       </Button>
                  </nav>
              </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
              {/* Hero Section */}
              <section className="relative container text-center py-24 sm:py-32">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter">
                      Your Unified IoT Management Platform
                  </h1>
                  <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
                      A single platform with a real-time dashboard and secure API keys to manage and monitor all your IoT devices, from the edge to the cloud.
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                       <Link href="/signup">
                          <Button size="lg" className="shadow-lg shadow-primary/20 w-full sm:w-auto">
                              Get Started For Free <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                      </Link>
                       <Link href="/devices">
                          <Button size="lg" variant="outline" className='w-full sm:w-auto'>
                             Connect a Device
                          </Button>
                      </Link>
                  </div>
              </section>

               {/* Dashboard Preview Section */}
              <section className="container pb-20 sm:pb-32">
                <div className="text-center max-w-2xl mx-auto">
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Experience the Dashboard</h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                    Get a feel for our clean, responsive, and real-time control interface.
                  </p>
                </div>
                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockDevices.map(device => (
                    <DeviceCard 
                      key={device.id} 
                      device={device} 
                      onToggle={() => {}} 
                      onPinToggle={() => {}}
                    />
                  ))}
                </div>
              </section>

              {/* Social Proof */}
              <section className="container pb-20 sm:pb-24">
                  <div className="text-center">
                      <p className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">Trusted by Innovators</p>
                      <div className="mt-6 flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
                          <Server className="h-8 w-16 text-muted-foreground/60" />
                          <Blocks className="h-8 w-16 text-muted-foreground/60" />
                          <Zap className="h-8 w-16 text-muted-foreground/60" />
                          <BrainCircuit className="h-8 w-16 text-muted-foreground/60" />
                          <Factory className="h-8 w-16 text-muted-foreground/60" />
                      </div>
                  </div>
              </section>
              

              {/* Features Section */}
              <section className="container pb-20 sm:pb-32">
                  <div className="text-center max-w-2xl mx-auto">
                      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything You Need to Scale IoT</h2>
                      <p className="mt-4 text-lg text-muted-foreground">
                          From robust backend services to a beautiful frontend, we handle the complexity so you can focus on your hardware.
                      </p>
                  </div>
                   <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <FeatureCard
                          icon={AreaChart}
                          title="Real-Time Monitoring"
                          description="Visualize live data streams from all your devices on a clean, responsive dashboard. See status, metrics, and historical charts at a glance."
                      />
                       <FeatureCard
                          icon={Bot}
                          title="Automation Engine"
                          description="Create powerful time-based rules that publish MQTT commands to make your devices work together automatically, without writing complex code."
                      />
                      <FeatureCard
                          icon={ShieldCheck}
                          title="Secure API Keys"
                          description="Each device gets a unique, revocable API key for secure and authenticated data transmission via MQTT. Manage device credentials with ease."
                      />
                      <FeatureCard
                          icon={Wifi}
                          title="MQTT Native"
                          description="Built on the lightweight and efficient MQTT protocol, ensuring reliable communication even in constrained network environments."
                      />
                       <FeatureCard
                          icon={Blocks}
                          title="Custom Device Profiles"
                          description="Define exactly what data your device sends and receives. Customize variables, names, and icons for a perfectly tailored experience."
                      />
                       <FeatureCard
                          icon={KeyRound}
                          title="Plug & Play Onboarding"
                          description="Use our guided setup with temporary pairing tokens to securely provision new devices from the field without hardcoding credentials."
                      />
                  </div>
              </section>

              {/* How It Works */}
              <section className="bg-muted/40 py-20 sm:py-32">
                  <div className="container">
                      <div className="text-center max-w-2xl mx-auto">
                          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Get Started in 3 Simple Steps</h2>
                          <p className="mt-4 text-lg text-muted-foreground">
                             Go from unboxing your device to seeing live data in minutes.
                          </p>
                      </div>
                      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                          {/* Dashed lines for larger screens */}
                          <div className="hidden md:block absolute top-10 left-0 w-full">
                              <svg width="100%" height="4">
                                  <line x1="0" y1="2" x2="100%" y2="2" strokeWidth="2" stroke="hsl(var(--border))" strokeDasharray="8 8" />
                              </svg>
                          </div>
                         <StepCard number="1" title="Connect Your Device" description="Follow our interactive guides to flash your device with our universal firmware. Use the Plug & Play mode for zero-touch provisioning." />
                         <StepCard number="2" title="Configure in Dashboard" description="Your device will appear automatically. Edit its name, define its data variables (e.g., 'temperature', 'light_switch'), and customize icons." />
                         <StepCard number="3" title="Monitor & Automate" description="Watch real-time data flow in, create alerts for specific thresholds, and build automations to control your hardware from anywhere." />
                      </div>
                  </div>
              </section>

              {/* Use Cases Section */}
              <section className="container py-20 sm:py-32">
                  <div className="text-center max-w-2xl mx-auto">
                      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Built for Any Application</h2>
                      <p className="mt-4 text-lg text-muted-foreground">
                          Our flexible platform is the perfect foundation for any IoT project, big or small.
                      </p>
                  </div>
                  <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div className="p-6 rounded-lg bg-card border">
                          <Home className="h-8 w-8 text-primary mb-3" />
                          <h3 className="font-bold text-lg">Smart Home</h3>
                          <p className="text-muted-foreground mt-1">Control lights, monitor climate, and build custom security systems with ease.</p>
                      </div>
                      <div className="p-6 rounded-lg bg-card border">
                          <Factory className="h-8 w-8 text-primary mb-3" />
                          <h3 className="font-bold text-lg">Industrial IoT</h3>
                          <p className="text-muted-foreground mt-1">Monitor machinery, track assets, and predict maintenance needs in your factory or warehouse.</p>
                      </div>
                      <div className="p-6 rounded-lg bg-card border">
                          <Leaf className="h-8 w-8 text-primary mb-3" />
                          <h3 className="font-bold text-lg">Environmental Monitoring</h3>
                          <p className="text-muted-foreground mt-1">Deploy remote sensors to track air quality, soil moisture, water levels, and more.</p>
                      </div>
                  </div>
              </section>

               {/* Final CTA */}
              <section className="py-20">
                  <div className="container text-center">
                       <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ready to Build the Future?</h2>
                       <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
                          Stop wrestling with infrastructure. Start building your connected product today.
                      </p>
                      <div className="mt-8">
                           <Link href="/signup">
                              <Button size="lg" className="shadow-lg shadow-primary/20">
                                  Sign Up Now <ArrowRight className="ml-2 h-5 w-5" />
                              </Button>
                          </Link>
                      </div>
                  </div>
              </section>
          </main>

          {/* Footer */}
          <footer className="border-t border-border/30 bg-background/95 backdrop-blur-sm">
            <div className="container py-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
                {/* Column 1: Brand and Status */}
                <div className="flex flex-col items-center md:items-start gap-4">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                        <Rss className="h-7 w-7 text-primary" />
                        <span>Nuvion-IoT</span>
                    </Link>
                    <div className='text-muted-foreground text-center md:text-left space-y-2'>
                       <p>&copy; {new Date().getFullYear()} Nuvion-IoT. All Rights Reserved.</p>
                       <div className='flex items-center gap-2 justify-center md:justify-start'>
                           <span className='relative flex h-2 w-2'>
                               <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75'></span>
                               <span className='relative inline-flex rounded-full h-2 w-2 bg-green-500'></span>
                           </span>
                           <span>All Systems Operational</span>
                       </div>
                       <div className='flex items-center gap-2 justify-center md:justify-start'>
                           <Users className="h-3 w-3"/>
                           <span>Total Visits: {mounted ? visitCount.toLocaleString() : '...'}</span>
                       </div>
                    </div>
                </div>
                
                {/* Column 2: Quick Links */}
                <div className="flex flex-col items-center gap-2">
                    <p className="font-semibold text-foreground">Quick Links</p>
                    <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
                    <Link href="/devices" className="text-muted-foreground hover:text-primary transition-colors">Connect Device</Link>
                    <Link href="/signup" className="text-muted-foreground hover:text-primary transition-colors">Get Started</Link>
                </div>

                {/* Column 3: Developer Credit */}
                <div className="flex flex-col items-center md:items-end gap-3 text-center md:text-right">
                     <p className="font-semibold text-foreground">Built in Firebase GenAI Studio</p>
                     <a href="https://github.com/firebase/genkit" target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                            <Github className="h-4 w-4 mr-2" />
                            View on GitHub
                        </Button>
                    </a>
                </div>
            </div>
          </footer>
          
          {/* Scroll to Top Button */}
          <Button 
            onClick={scrollTop}
            className={cn(
              "fixed bottom-8 right-8 h-12 w-12 rounded-full shadow-lg transition-opacity duration-300",
              showScroll ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            size="icon"
          >
            <ArrowUp className="h-6 w-6" />
          </Button>
      </div>
  );
}
