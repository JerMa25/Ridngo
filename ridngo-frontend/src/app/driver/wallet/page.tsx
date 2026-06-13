/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { rideService } from '@/lib/rideService';
import { Wallet as WalletIcon, ArrowUpRight, History, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rideService.getMyWallet().then(setWallet).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-btn" /></div>;

  return (
    <main className="max-w-4xl mx-auto p-6 md:py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
           <h1 className="text-4xl font-black tracking-tighter italic">Mon Wallet</h1>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Gérez vos revenus et retraits</p>
        </div>
        <div className="w-12 h-12 bg-foreground/5 rounded-2xl flex items-center justify-center text-orange-btn">
          <WalletIcon size={24} />
        </div>
      </div>

      <div className="space-y-4">
         <div className="flex items-center gap-2 opacity-40 px-2">
            <History size={16} />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Dernières Transactions</h3>
         </div>
         <div className="glass p-10 text-center border-none shadow-sm opacity-30 italic font-medium">
            Aucune transaction récente.
         </div>
      </div>
    </main>
  );
}