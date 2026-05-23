/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { Smartphone, Car, Download, Apple, Play, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AppDownload = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Détection Android / Chrome / Edge
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 2. Détection iOS (Safari ne supporte pas beforeinstallprompt)
    const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isApple && !isStandalone) {
      setIsIOS(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert("Sur iOS, cliquez sur le bouton 'Partager' en bas de Safari, puis sur 'Sur l'écran d'accueil'.");
      return;
    }

    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto bg-orange-btn/80 rounded-[40px] p-10 md:p-24 relative overflow-hidden shadow-2xl shadow-orange-btn/30 text-white flex flex-col lg:flex-row items-center gap-16">
        
        {/* CONTENU TEXTUEL (Z-INDEX 20 pour passer devant la voiture mais derrière les mocks sur desktop) */}
        <div className="relative z-20 max-w-2xl space-y-8 flex-1">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
            <Smartphone size={32} />
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tighter">
              RidnGo dans <br /> votre poche.
            </h2>
            <p className="text-xl opacity-90 font-medium leading-relaxed">
              Téléchargez l&apos;application pour une expérience fluide, des notifications en temps réel et un suivi GPS précis.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Bouton Installation PWA (Dynamique) */}
            <AnimatePresence>
              {(isInstallable || isIOS) ? (
                <motion.button
                  key="install-btn"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleInstallClick}
                  className="px-8 py-4 bg-white text-orange-btn rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform"
                >
                  <Download size={18} />
                  {isIOS ? "Installer sur iPhone" : "Installer l'App Web"}
                </motion.button>
              ) : (
                <motion.p 
                  key="info-msg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-8 py-4 bg-white/10 text-white rounded-2xl font-extrabold uppercase text-[12px] tracking-widest flex items-center gap-3 border border-white/20"
                >
                  <Info size={18} /> Vérifiez si vous avez déjà installé l&apos;application. Sinon, veuillez utiliser Chrome ou Edge pour installer l&apos;application
                </motion.p>
              )}
            </AnimatePresence>

            {/* Liens vers les stores classiques */}
            <button className="px-8 py-4 bg-bleu-nuit text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-3 opacity-50 cursor-not-allowed">
              <Apple size={18} /> App Store
            </button>
            <button className="px-8 py-4 bg-bleu-nuit text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-3 opacity-50 cursor-not-allowed">
              <Play size={18} /> Google Play
            </button>
          </div>

          {isIOS && (
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-70">
              <Info size={14} /> Installation manuelle requise via Safari
            </p>
          )}
        </div>

        {/* VISUELS : MOCKUPS DESKTOP & MOBILE */}
        <div className="relative flex-1 w-full h-[300px] md:h-[400px] lg:h-[500px] perspective-1000">
           {/* Mockup Desktop (1920x1080) */}
           <motion.div 
             initial={{ opacity: 0, x: 100, rotateY: -10, rotateX: 5 }}
             whileInView={{ opacity: 1, x: 0, rotateY: -15, rotateX: 5 }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             className="absolute top-0 right-0 w-[80%] md:w-[500px] aspect-video bg-bleu-nuit rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white/10 overflow-hidden z-10 hidden md:block"
           >
              <img 
                src="/background-desktop.jpeg" 
                className="w-full h-full object-cover opacity-80" 
                alt="Desktop App Preview" 
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-btn/20 to-transparent" />
           </motion.div>

           {/* Mockup Mobile (1080x1920) */}
           <motion.div 
             initial={{ opacity: 0, y: 50, rotate: 5 }}
             whileInView={{ opacity: 1, y: 0, rotate: -5 }}
             transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
             className="absolute bottom-4 right-4 md:bottom-10 md:right-32 w-[140px] md:w-[200px] aspect-[9/19.5] bg-black rounded-[1rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-[6px] border-black overflow-hidden z-30 ring-4 ring-white/10"
           >
              {/* Encoche du téléphone */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-3 bg-black rounded-b-2xl z-40" />
              <img 
                src="/background-mobile.jpeg" 
                className="w-full h-full" 
                alt="Mobile App Preview" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-orange-btn/40 to-transparent" />
           </motion.div>
        </div>

        {/* Décoration Visuelle (Voiture en arrière-plan) */}
        <div className="absolute -right-20 -bottom-20 opacity-10 rotate-12 pointer-events-none z-0">
          <Car size={450} />
        </div>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </section>
  );
};