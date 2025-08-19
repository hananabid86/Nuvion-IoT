
"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function ScrollProgressBar() {
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = () => {
    const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (totalHeight > 0) {
        const scrollTop = window.scrollY;
        setScrollProgress((scrollTop / totalHeight) * 100);
    } else {
        setScrollProgress(0);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount to set initial state if page is already scrolled
    handleScroll(); 
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-50 bg-transparent">
      <div
        className="h-1 bg-primary transition-all duration-75 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
}
