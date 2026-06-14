"use client"
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  onFinish: () => void;
}

export const RideStepTracking = ({ onFinish }: Props) => {
  return (
    <motion.div className="flex flex-col h-full justify-center text-center lg:text-left">
      <div className="bg-green-500/10 p-6 rounded-[30px] border border-green-500/20 mb-8">
        <div className="flex items-center gap-4 mb-2 justify-center lg:justify-start">
           <CheckCircle2 className="text-green-500" size={28} />
           <h3 className="font-black text-xl text-green-700 dark:text-green-400">Course Acceptée !</h3>
        </div>
        <p className="text-sm opacity-60 font-medium">Le chauffeur <span className="font-bold text-foreground">Moussa</span> arrive dans 3 min.</p>
      </div>

      <div className="flex items-center justify-between p-4 bg-foreground/5 shadow-sm border border-foreground/5 rounded-2xl mb-8">
         <div className="text-left">
            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Véhicule</p>
            <p className="font-bold">Toyota Corolla</p>
         </div>
         <div className="text-right">
            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Plaque</p>
            <p className="font-black bg-background px-2 py-1 rounded text-xs uppercase">LT-482-XY</p>
         </div>
      </div>

      <button onClick={onFinish} className="w-full py-4 bg-foreground text-background rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-btn hover:text-white transition-all shadow-xl">
         Simuler &quot;Arrivée&quot;
      </button>
    </motion.div>
  );
};