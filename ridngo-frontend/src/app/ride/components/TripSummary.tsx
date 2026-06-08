"use client"
import React from 'react';
import { MapPin, Navigation, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface TripSummaryProps {
  pickup: string;
  destination: string;
  price?: number;
}

export const TripSummary = ({ pickup, destination, price }: TripSummaryProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 bg-foreground/5 rounded-[24px] border border-foreground/5"
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <Navigation size={12} className="text-orange-btn" />
          <div className="w-[1px] h-3 bg-foreground/20 border-dashed" />
          <MapPin size={12} className="text-foreground/40" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black truncate text-foreground/80">{pickup?.split(',')[0]}</p>
            {price && (
               <span className="text-[10px] font-black text-orange-btn italic whitespace-nowrap">{price} F</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <ArrowRight size={10} className="opacity-20" />
            <p className="text-[10px] font-bold truncate opacity-40">{destination?.split(',')[0]}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};