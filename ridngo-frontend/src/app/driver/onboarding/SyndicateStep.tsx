"use client"
import React from 'react';
import { ShieldCheck, ExternalLink, Loader2, Info } from 'lucide-react';

interface Props {
  driverId: string | null;
  isLoading: boolean;
}

export default function SyndicateStep({ driverId, isLoading }: Props) {
  
  const handleConnectSyndicate = () => {
    if (!driverId) return;
    const callback = `${window.location.origin}/driver/onboarding?action=verify`;
    const verificationLink = `${process.env.NEXT_PUBLIC_COMPLIANCE_URL}/connect?driverId=${driverId}&redirectUrl=${encodeURIComponent(callback)}`;
    window.location.href = verificationLink;
  };

  return (
    <div className="glass p-10 md:p-16 text-center border-none shadow-2xl bg-background">
      <div className="w-20 h-20 bg-orange-btn/10 text-orange-btn rounded-[30px] flex items-center justify-center mx-auto mb-8">
        <ShieldCheck size={40} />
      </div>
      
      <h2 className="text-3xl font-black italic tracking-tighter mb-4 uppercase">Vérification Syndicale</h2>
      <p className="opacity-60 font-medium max-w-md mx-auto mb-10 leading-relaxed">
        Votre véhicule a été enregistré. Maintenant, connectez-vous à <span className="font-bold text-foreground">UGate</span> pour confirmer votre adhésion au syndicat des transporteurs.
      </p>

      <div className="bg-foreground/5 p-4 rounded-2xl mb-10 flex items-start gap-3 text-left">
        <Info className="text-orange-btn shrink-0" size={18} />
        <p className="text-[11px] opacity-70 leading-tight">Cette étape est obligatoire au Cameroun pour exercer en toute légalité et garantir la sécurité du réseau RidnGo.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="animate-spin text-orange-btn" size={32} />
           <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Validation de conformité en cours...</p>
        </div>
      ) : (
        <button 
          onClick={handleConnectSyndicate}
          className="w-full bg-foreground text-background py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-orange-btn hover:text-white transition-all active:scale-95"
        >
          Ouvrir UGate Compliance <ExternalLink size={20} />
        </button>
      )}
    </div>
  );
}