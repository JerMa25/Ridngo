/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useEffect, useState } from 'react';
import { rideService } from '@/lib/rideService';
import { motion } from 'framer-motion';
import { MapPin, Banknote, User, LayoutDashboard, UserPlus, LogIn } from 'lucide-react';
import Link from 'next/link';

export const LandingOffers = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedUser) setUser(JSON.parse(savedUser));

    rideService.getLandingOffers().then(data => {
      setOffers(data);
    }).finally(() => setLoading(false));
  }, []);

  // Logique du bouton dynamique
  const renderCTA = () => {
    if (!user) {
      return (
        <Link href="/login" className="flex items-center gap-2 px-6 py-3 bg-orange-btn text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">
          <LogIn size={16} /> Se connecter en tant que chauffeur
        </Link>
      );
    }
    if (user.role === 'PASSENGER') {
      return (
        <Link href="/register?role=driver" className="flex items-center gap-2 px-6 py-3 bg-orange-btn text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">
          <UserPlus size={16} /> Devenir chauffeur
        </Link>
      );
    }
    return (
      <Link href="/driver/dashboard" className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">
        <LayoutDashboard size={16} /> Accéder à mon radar
      </Link>
    );
  };

  return (
    <section className="py-24 px-6 bg-foreground/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-4">
            <h2 className="text-orange-btn font-black tracking-[0.3em] text-xs uppercase">Opportunités Chauffeurs</h2>
            <p className="text-4xl font-black text-foreground">Dernières offres publiées</p>
          </div>
          {renderCTA()}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-20">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-foreground/10 rounded-[32px] animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {offers.map((offer, idx) => (
              <motion.div 
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass p-6 border-none bg-background shadow-xl rounded-[32px] space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div className="w-10 h-10 bg-orange-btn/10 rounded-xl flex items-center justify-center text-orange-btn">
                    <User size={20} />
                  </div>
                  <span className="text-xl font-black italic text-foreground">{offer.price} F</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin size={14} className="text-orange-btn mt-1" />
                    <p className="text-xs font-bold line-clamp-1 opacity-70">{offer.startPoint}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3.5 h-3.5 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-foreground" /></div>
                    <p className="text-xs font-bold line-clamp-1">{offer.endPoint}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-foreground/5 flex items-center justify-between text-[10px] font-black uppercase opacity-40 tracking-tighter">
                   <span>Distance: 5.2 km</span>
                   <span>Publié à {new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};