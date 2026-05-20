"use client"
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calculator, Car, UserPlus, Radar } from 'lucide-react';
import Link from 'next/link';
import { rideService } from '@/lib/rideService';

export const MarketingHero = () => {
  const [activeOffersCount, setActiveOffersCount] = useState(0);

  useEffect(() => {
    // On récupère le nombre réel de courses disponibles pour le mockup "Live"
    rideService.getLandingOffers().then(offers => {
      setActiveOffersCount(offers.length);
    }).catch(() => setActiveOffersCount(12)); // Fallback
  }, []);

  return (
    <header className="relative py-20 lg:py-32 px-6 overflow-hidden">
      <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-orange-btn/10 to-transparent -z-10 skew-x-12 translate-x-32" />
      
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 text-center lg:text-left space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-orange-btn/10 text-orange-btn px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest"
          >
            <MapPin size={14} /> Disponible à Douala & Yaoundé
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-5xl lg:text-7xl font-black leading-tight tracking-tight text-foreground"
          >
            Bougez en toute <span className="text-orange-btn italic">liberté.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-lg opacity-60 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed text-foreground"
          >
            Le premier service de VTC au Cameroun qui vous laisse négocier votre prix. Pas d&apos;algorithme caché. Juste vous et le chauffeur.
          </motion.p>
          
          {/* LES 3 BOUTONS DISTINCTS */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-4"
          >
            <Link
              href="/ride"
              className="w-full sm:w-auto px-6 py-4 bg-orange-btn text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-btn/20 hover:scale-105 transition-transform flex flex-col items-center justify-center gap-1"
            >
              <div className="flex items-center gap-2 text-[11px]">
                <Car size={18} />
                <span>Commander une course</span>
              </div>

              <span className="text-[9px] font-medium tracking-normal opacity-80">
                Estimer votre prix
              </span>
            </Link>
            
            {/* <Link href="/ride" className="w-full sm:w-auto px-6 py-4 bg-foreground text-background rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2">
              <Calculator size={18} /> Estimer votre prix
            </Link> */}

            <Link href="/register?role=driver" className="w-full sm:w-auto px-6 py-4 bg-foreground/5 text-foreground rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-foreground/10 transition-colors flex items-center justify-center gap-2">
              <UserPlus size={18} /> Devenir Chauffeur
            </Link>
          </motion.div>
        </div>

        {/* MOCKUP DYNAMIQUE CONNECTÉ AU BACKEND */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}
          className="flex-1 relative"
        >
          <div className="relative z-10 glass p-4 border-none shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 bg-background/50">
            <img src="hero-bg.jpeg" alt="Ride Preview" className="rounded-2xl w-full object-cover h-[400px] transition-all" />
            
            {/* Overlay "Live" connecté au Backend */}
            <div className="absolute -bottom-10 -left-10 glass p-6 border-none shadow-2xl flex items-center gap-5 bg-background">
              <div className="relative">
                <div className="w-14 h-14 bg-orange-btn rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Radar size={28} className="animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                </span>
              </div>
              <div>
                <p className="font-black text-xl text-foreground italic">{activeOffersCount} courses</p>
                <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em]">actuellement publiées</p>
              </div>
            </div>

            {/* Floating Info (Prix Moyen) */}
            {/* <div className="absolute top-10 -right-5 glass p-4 border-none shadow-xl bg-bleu-nuit text-white">
               <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Prix moyen constaté</p>
               <p className="text-lg font-black italic">1 500 F <span className="text-[10px] opacity-40">Douala</span></p>
            </div> */}
          </div>
        </motion.div>
      </div>
    </header>
  );
};