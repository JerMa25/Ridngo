"use client"
import React from 'react';
import Link from 'next/link';
import { Wallet as WalletIcon, ChevronRight, Zap } from 'lucide-react';

export const WalletCard = ({ balance }: { balance: number }) => (
  <Link href="/driver/wallet" className="group block h-full">
    {/* Padding réduit de p-8 à p-5 */}
    <div className="h-full p-5 md:p-6 border-none bg-[#1B263B] text-white shadow-2xl rounded-[30px] flex flex-col justify-between relative overflow-hidden transition-all hover:scale-[1.02] border border-white/5">
       
       {/* Décoration réduite */}
       <div className="absolute -top-4 -right-4 text-orange-btn opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
          <Zap size={100} fill="currentColor" />
       </div>
       
       {/* Header Compact */}
       <div className="flex justify-between items-start relative z-10 mb-2">
          <div className="w-8 h-6 bg-gradient-to-br from-orange-btn to-yellow-500 rounded-md flex items-center justify-center overflow-hidden shadow-inner">
             <div className="w-full h-[1px] bg-black/10"></div>
          </div>
          <p className="text-[8px] font-bold italic text-orange-btn">Premium</p>
       </div>

       {/* Solde Compact */}
       <div className="relative z-10 my-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-0.5">Solde</p>
          <div className="flex items-baseline gap-1.5">
            {/* Font réduite de text-5xl à text-3xl */}
            <p className="text-3xl md:text-4xl font-black italic tracking-tighter">
              {balance?.toLocaleString() || 0}
            </p>
            <span className="text-[10px] font-black text-orange-btn uppercase">FCFA</span>
          </div>
       </div>

       {/* Footer Compact */}
       <div className="mt-2 flex justify-between items-end relative z-10">
          <p className="text-[8px] font-mono tracking-[0.2em] text-white/30">** 2026</p>
          
          <div className="bg-orange-btn hover:bg-white hover:text-orange-btn text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
            Voir l'historique <ChevronRight size={10} />
          </div>
       </div>
    </div>
  </Link>
);