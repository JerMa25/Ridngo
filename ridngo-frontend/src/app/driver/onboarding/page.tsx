"use client"
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

import VehicleStep from './VehicleStep';
import SyndicateStep from './SyndicateStep';

export default function DriverOnboardingPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-btn" /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get('/api/v1/users/me');
        setDriverId(res.data.id);
        
        // Détecte le retour de UGate
        if (searchParams.get('action') === 'verify') {
          // eslint-disable-next-line react-hooks/immutability
          handleVerifyCompliance();
        }
      } catch (e) { console.error(e); }
    };
    init();
  }, [searchParams]);

  const handleVerifyCompliance = async () => {
    setLoading(true);
    setStep(2);
    try {
      // Route PATCH finale demandée par le backend
      await api.patch('/api/v1/users/verify-compliance');
      setStep(3);
      setTimeout(() => router.push('/driver/dashboard'), 3000);
    } catch (e) {
      toast.error("La vérification UGate n'a pas pu être confirmée. Contactez le support.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-10 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full">
        
        {/* PROGRESS */}
        <div className="flex gap-2 mb-12 px-4">
           {[1, 2, 3].map((i) => (
             <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= i ? 'bg-orange-btn' : 'bg-foreground/10'}`} />
           ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="v" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <VehicleStep onComplete={() => setStep(2)} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}>
              <SyndicateStep driverId={driverId} isLoading={loading} />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="win" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass p-16 text-center border-none shadow-2xl bg-background">
              <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-4xl font-black italic tracking-tighter mb-4">Félicitations !</h2>
              <p className="opacity-60 font-medium mb-10">Votre profil est désormais complet et certifié. Redirection vers le radar...</p>
              <Loader2 className="animate-spin text-orange-btn mx-auto" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}