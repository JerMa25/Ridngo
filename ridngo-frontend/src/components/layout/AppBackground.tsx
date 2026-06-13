"use client"
import React from 'react';
import { Car, MapPin, Navigation, Compass, Map, Zap, ShieldCheck } from 'lucide-react';

export const AppBackground = () => {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none select-none">
      {/* 1. Blobs de couleur - Orange RidnGo et Bleu Profond */}
      <div className="blur-blob bg-orange-btn/40 -top-[10%] -left-[10%]" style={{ animationDelay: '0s' }} />
      <div className="blur-blob bg-blue-600/30 -bottom-[10%] -right-[10%]" style={{ animationDelay: '-5s' }} />
      <div className="blur-blob bg-orange-400/20 top-[40%] left-[30%] w-[30vw] h-[30vw]" style={{ animationDelay: '-10s' }} />

      {/* 2. Overlays de texture */}
      <div className="absolute inset-0 bg-grain" />
      <div className="absolute inset-0 bg-dots" />

      {/* 3. Icônes de transport flottantes (Très subtiles) */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07] text-foreground">
        <Car size={160} className="absolute top-[5%] left-[10%] -rotate-12" />
        <MapPin size={100} className="absolute top-[55%] left-[5%] rotate-12 text-orange-btn" />
        <Navigation size={120} className="absolute top-[15%] right-[5%] rotate-[35deg]" />
        <Compass size={110} className="absolute bottom-[15%] left-[20%] -rotate-12" />
        <Zap size={140} className="absolute bottom-[10%] right-[15%] rotate-12 text-orange-btn" />
        <Map size={200} className="absolute top-[40%] right-[20%] opacity-20" />
        <ShieldCheck size={90} className="absolute top-[70%] right-[40%]" />
      </div>
    </div>
  );
};