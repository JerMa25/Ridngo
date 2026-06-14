"use client"
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Minus, Plus } from 'lucide-react';

interface Props {
  price: number;
  setPrice: (val: number) => void;
  onPublish: () => void;
  onBack: () => void;
}

export const RideStepPrice = ({ price, setPrice, onPublish, onBack }: Props) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }} 
      className="flex flex-col h-full"
    >
      <button onClick={onBack} className="text-xs font-black opacity-40 hover:opacity-100 uppercase mb-8 flex items-center gap-2 w-fit transition-opacity">
        <ChevronLeft size={16} /> Modifier l&apos;itinéraire
      </button>
      
      <div className="text-center mb-10">
        <span className="bg-orange-btn/10 text-orange-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
          Estimation conseillée
        </span>
        <div className="text-7xl font-black mt-6 italic tracking-tighter text-foreground">
          {price} <span className="text-2xl not-italic opacity-30 ml-1">F</span>
        </div>
        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-2">Vous pouvez ajuster ce montant</p>
      </div>
      
      <div className="flex items-center justify-between bg-foreground/5 p-3 rounded-[32px] mb-10 border border-foreground/5 shadow-inner">
        <button 
          onClick={() => setPrice(Math.max(100, price - 50))} 
          className="w-16 h-16 bg-background rounded-2xl shadow-sm flex items-center justify-center hover:bg-orange-btn hover:text-white transition-all active:scale-90"
        >
          <Minus size={24} />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-2xl font-black">{price} F</span>
          <span className="text-[9px] uppercase font-black text-orange-btn tracking-widest">Votre Offre</span>
        </div>
        
        <button 
          onClick={() => setPrice(price + 50)} 
          className="w-16 h-16 bg-orange-btn text-white rounded-2xl shadow-lg flex items-center justify-center hover:scale-105 transition-all active:scale-90"
        >
          <Plus size={24} />
        </button>
      </div>

      <button 
        onClick={onPublish} 
        className="w-full bg-foreground text-background dark:bg-white dark:text-bleu-nuit py-6 rounded-2xl font-black text-sm shadow-xl hover:bg-orange-btn hover:text-white transition-all uppercase tracking-[0.2em]"
      >
        Lancer la recherche
      </button>
    </motion.div>
  );
};