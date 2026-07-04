'use client';

import React, { useEffect, useState } from 'react';

export default function Loading() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 8) + 4;
      });
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#09090b] z-50 flex flex-col items-center justify-center select-none">
      {/* Top glowing progress bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-[#00d4aa] to-emerald-400 shadow-[0_0_10px_#00d4aa] transition-all duration-200 ease-out" 
        style={{ width: `${progress}%` }} 
      />
      
      {/* Central pulsing loader */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative h-20 w-20 flex items-center justify-center">
          {/* Glowing outer rings */}
          <div className="absolute inset-0 rounded-2xl border-2 border-[#00d4aa]/25 animate-ping duration-[1200ms]" />
          <div className="absolute inset-0 rounded-2xl border border-[#00d4aa]/40 animate-pulse" />
          
          <img 
            src="/logo.png" 
            alt="SocietySync Logo" 
            className="h-14 w-14 rounded-xl object-contain animate-pulse" 
          />
        </div>
        
        <div className="text-center space-y-1">
          <h3 className="font-bold text-lg text-white tracking-wide">
            Society<span className="text-[#00d4aa]">Sync</span>
          </h3>
          <p className="text-xs text-zinc-500 animate-pulse">Syncing secure data nodes...</p>
        </div>
      </div>
    </div>
  );
}
