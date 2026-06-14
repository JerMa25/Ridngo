"use client"
import React from 'react';
import { motion } from 'framer-motion';
import { Navigation, Car, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const ActivityBanner = ({ currentRide }: { currentRide: any }) => (
  <motion.div 
    initial={{ y: -50, opacity: 0 }} 
    animate={{ y: 0, opacity: 1 }}
    className="max-w-6xl mx-auto bg-orange-btn p-6 rounded-[32px] text-white shadow-xl flex items-center justify-between group overflow-hidden relative"
  >
    <div className="flex items-center gap-5 relative z-10">
      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
         <Navigation size={28} />
      </div>
      <div>
        <p className="font-black uppercase text-[10px] tracking-widest opacity-80">Course Active</p>
        <p className="text-sm font-black italic">
           {currentRide.state === 'CREATED' ? "Client en attente de prise en charge" : "Trajet en cours"}
        </p>
      </div>
    </div>
    <Link 
      href={`/driver/ride/${currentRide.id}`}
      className="bg-white text-orange-btn px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all relative z-10 shadow-lg"
    >
      Suivre le trajet →
    </Link>
    <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12"><Car size={150} /></div>
  </motion.div>
);