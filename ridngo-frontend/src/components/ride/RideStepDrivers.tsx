/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Star } from 'lucide-react';

interface Props {
  price: number;
  currentRide: any;
  onSelectDriver: (id: string) => void;
  onCancel: () => void;
}

export const RideStepDrivers = ({ price, currentRide, onSelectDriver, onCancel }: Props) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
       <div className="flex items-center justify-between mb-6 pb-6 border-b border-foreground/5">
          <div className="flex items-center gap-3">
             <div className="relative">
               <div className="w-3 h-3 bg-orange-btn rounded-full animate-ping absolute inset-0" />
               <div className="w-3 h-3 bg-orange-btn rounded-full relative" />
             </div>
             <span className="font-black text-sm uppercase tracking-widest animate-pulse">Recherche...</span>
          </div>
          <span className="font-black text-orange-btn text-lg">{price} F</span>
       </div>

       <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 min-h-[200px]">
          {currentRide?.proposals?.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
               <Loader2 className="animate-spin" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Radar actif</span>
            </div>
          )}
          
          {currentRide?.proposals?.map((driver:any) => (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} key={driver.id} className="p-4 bg-foreground/5 dark:bg-white/5 rounded-2xl flex justify-between items-center group hover:bg-orange-btn/5 transition-colors cursor-pointer border border-transparent hover:border-orange-btn/20 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white dark:bg-bleu-nuit rounded-xl flex items-center justify-center font-black text-lg shadow-sm">{driver.name[0]}</div>
                <div>
                  <p className="font-black text-base">{driver.name}</p>
                  <p className="text-[10px] opacity-50 font-bold uppercase">Toyota Yaris • 4.9 <Star size={10} className="inline fill-orange-btn text-orange-btn"/></p>
                </div>
              </div>
              {currentRide.status === 'SEARCHING' ? (
                 <button onClick={() => onSelectDriver(driver.id)} className="px-4 py-2 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-btn hover:text-white transition-all shadow-lg">
                   Go
                 </button>
              ) : (
                 <span className="text-[10px] font-black opacity-40 uppercase">Attente...</span>
              )}
            </motion.div>
          ))}
       </div>
       
       <button onClick={onCancel} className="w-full mt-4 py-3 text-red-500 text-xs font-black uppercase tracking-widest hover:bg-red-500/5 rounded-xl transition-colors">
         Annuler
       </button>
    </motion.div>
  );
};