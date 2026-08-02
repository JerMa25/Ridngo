// src/components/layout/AppBackground.tsx
'use client';

import { useEffect, useState } from 'react';
import { Car, MapPin, Navigation, Compass, Zap, Map, ShieldCheck } from 'lucide-react';

export function AppBackground() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-background/50 to-background" />
      
      {/* Ne rendre les icônes qu'après le montage côté client */}
      {isMounted && (
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07] text-foreground">
          <div className="absolute top-[5%] left-[10%] -rotate-12">
            <Car size={160} aria-hidden="true" />
          </div>
          <div className="absolute top-[55%] left-[5%] rotate-12">
            <MapPin size={100} className="text-orange-btn" aria-hidden="true" />
          </div>
          <div className="absolute top-[15%] right-[5%] rotate-[35deg]">
            <Navigation size={120} aria-hidden="true" />
          </div>
          <div className="absolute bottom-[15%] left-[20%] -rotate-12">
            <Compass size={110} aria-hidden="true" />
          </div>
          <div className="absolute bottom-[10%] right-[15%] rotate-12">
            <Zap size={140} className="text-orange-btn" aria-hidden="true" />
          </div>
          <div className="absolute top-[40%] right-[20%] opacity-20">
            <Map size={200} aria-hidden="true" />
          </div>
          <div className="absolute top-[70%] right-[40%]">
            <ShieldCheck size={90} aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  );
}