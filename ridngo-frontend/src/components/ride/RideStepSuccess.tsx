"use client"
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  price: number;
  onReset: () => void;
}

export const RideStepSuccess = ({ price, onReset }: Props) => {
  return (
    <motion.div className="flex flex-col h-full justify-center text-center">
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-green-500/30">
         <CheckCircle2 size={48} />
      </div>
      <h2 className="text-3xl font-black mb-2">Vous êtes arrivé !</h2>
      <p className="opacity-50 text-sm mb-10 max-w-xs mx-auto">Montant réglé : <span className="font-black text-foreground">{price} F</span></p>
      <button onClick={onReset} className="w-full py-4 bg-orange-btn text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-btn/20 hover:scale-[1.02] transition-transform">
         Nouvelle course
      </button>
    </motion.div>
  );
};