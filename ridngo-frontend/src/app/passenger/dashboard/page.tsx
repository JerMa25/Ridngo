/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { rideService } from '@/lib/rideService';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, Car, Clock, Calendar, 
  ArrowRight, TrendingUp, Route, 
  ChevronRight, CheckCircle2, XCircle, 
  AlertCircle, Play
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// --- COMPOSANT : Carte Statistique ---
const StatCard = ({ icon: Icon, label, value, suffix, color, delay }: {
  icon: any; label: string; value: string | number; suffix?: string; color: string; delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="glass p-6 rounded-[28px] border-none bg-background shadow-lg hover:shadow-xl transition-all group"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-lg`}>
        <Icon size={22} className="text-white" />
      </div>
      <TrendingUp size={16} className="text-foreground/20 group-hover:text-orange-btn transition-colors" />
    </div>
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-1">{label}</p>
    <p className="text-3xl font-black tracking-tighter italic text-foreground">
      {value}<span className="text-sm font-bold not-italic text-foreground/40 ml-1">{suffix}</span>
    </p>
  </motion.div>
);

// --- COMPOSANT : Carte de Course Active ---
const ActiveRideBanner = ({ ride }: { ride: any }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="relative overflow-hidden rounded-4xl p-6 bg-linear-to-r from-orange-btn to-amber-500 text-white shadow-2xl shadow-orange-btn/30"
  >
    <div className="absolute inset-0 opacity-10">
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/20" />
      <div className="absolute -left-5 -bottom-5 w-24 h-24 rounded-full bg-white/10" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
        <p className="text-[11px] font-black uppercase tracking-[0.3em]">
          Course {ride.state === 'ONGOING' ? 'en cours' : 'en attente'}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Play size={20} />
          <p className="font-bold text-sm">Votre chauffeur est en route</p>
        </div>
        <Link 
          href={`/ride/active/${ride.offerId || ride.id}`} 
          className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/30 transition-all"
        >
          Suivre <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  </motion.div>
);

// --- COMPOSANT : Carte de Trajet Récent ---
const RecentRideCard = ({ ride, idx }: { ride: any; idx: number }) => {
  const stateConfig: Record<string, { icon: any; color: string; label: string }> = {
    'COMPLETED': { icon: CheckCircle2, color: 'text-green-500 bg-green-500/10', label: 'Terminée' },
    'CANCELLED': { icon: XCircle, color: 'text-red-500 bg-red-500/10', label: 'Annulée' },
    'ONGOING': { icon: AlertCircle, color: 'text-amber-500 bg-amber-500/10', label: 'En cours' },
    'CREATED': { icon: Clock, color: 'text-blue-400 bg-blue-400/10', label: 'En attente' },
  };
  const config = stateConfig[ride.state] || stateConfig['CREATED'];
  const StateIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08, duration: 0.35 }}
      className="glass p-5 rounded-3xl border-none bg-background shadow-lg hover:shadow-xl transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-btn/10 flex items-center justify-center">
            <Car size={18} className="text-orange-btn" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30">
              {ride.createdAt ? new Date(ride.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {ride.createdAt ? new Date(ride.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
            </p>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${config.color}`}>
          <StateIcon size={12} />
          {config.label}
        </span>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex flex-col items-center py-1">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-btn ring-4 ring-orange-btn/10" />
          <div className="w-0.5 flex-1 bg-foreground/10 my-1.5 rounded-full" />
          <div className="w-2.5 h-2.5 rounded-full bg-foreground ring-4 ring-foreground/5" />
        </div>
        <div className="flex-1 space-y-3 min-w-0">
          <p className="text-xs font-bold truncate text-foreground/60 leading-none">{ride.startPoint || 'Point de départ'}</p>
          <p className="text-xs font-bold truncate text-foreground leading-none">{ride.endPoint || 'Destination'}</p>
        </div>
        <div className="text-right flex flex-col justify-center shrink-0 pl-3 border-l border-foreground/5">
          <p className="text-xl font-black italic tracking-tighter text-orange-btn">
            {ride.price?.toLocaleString() || '—'}
          </p>
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-foreground/30">FCFA</p>
        </div>
      </div>

      {ride.distance > 0 && (
        <div className="pt-3 border-t border-foreground/5 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-foreground/30 text-[10px] font-bold">
            <Route size={12} className="text-orange-btn" />
            {ride.distance?.toFixed(1)} km
          </div>
        </div>
      )}
    </motion.div>
  );
};

// --- PAGE PRINCIPALE ---
export default function PassengerDashboard() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const { data: rides = [], isLoading: ridesLoading } = useQuery({
    queryKey: ['passengerHistory'],
    queryFn: async () => {
      const res = await api.get('/api/v1/trips/enriched-history?page=0&size=10');
      return res.data || [];
    },
  });

  const { data: activeRide = null, isLoading: rideLoading } = useQuery({
    queryKey: ['passengerActiveRide'],
    queryFn: () => rideService.getCurrentPassengerRide().catch(() => null),
  });

  const loading = ridesLoading || rideLoading;

  // Calculs statistiques
  const completedRides = rides.filter((r: any) => r.state === 'COMPLETED');
  const totalTrips = completedRides.length;
  const totalSpent = completedRides.reduce((sum: number, r: any) => sum + (r.price || 0), 0);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="animate-spin text-orange-btn" size={40} />
        <p className="text-xs font-black uppercase tracking-widest opacity-50">Chargement du dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pb-32 font-sans text-foreground bg-background">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* --- HEADER DE BIENVENUE --- */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40 mb-1">Tableau de bord</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic">
              Bonjour, <span className="text-orange-btn">{user?.name?.split(' ')[0] || (user?.username && !user.username.includes('@') ? user.username : 'Voyageur')}</span>
            </h1>
          </div>
          <Link
            href="/ride"
            className="flex items-center gap-2 bg-orange-btn px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-orange-btn/25 hover:scale-105 transition-all self-start sm:self-auto"
          >
            <Car size={16} /> Commander une course <ArrowRight size={14} />
          </Link>
        </motion.div>

        {/* --- BANNIÈRE COURSE ACTIVE --- */}
        <AnimatePresence>
          {activeRide && <ActiveRideBanner ride={activeRide} />}
        </AnimatePresence>

        {/* --- CARTES STATISTIQUES --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          <StatCard
            icon={Route}
            label="Trajets effectués"
            value={totalTrips}
            suffix="courses"
            color="bg-orange-btn"
            delay={0.1}
          />
          <StatCard
            icon={TrendingUp}
            label="Total dépensé"
            value={totalSpent.toLocaleString()}
            suffix="FCFA"
            color="bg-gradient-to-br from-amber-500 to-orange-600"
            delay={0.2}
          />
        </div>

        {/* --- SECTION COMMANDES RÉCENTES --- */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tighter italic">Commandes récentes</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mt-1">Vos derniers trajets</p>
            </div>
            {rides.length > 5 && (
              <Link
                href="/ride/history"
                className="flex items-center gap-2 text-orange-btn text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                Tout voir <ChevronRight size={14} />
              </Link>
            )}
          </div>

          {rides.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass p-16 text-center border-none shadow-xl bg-background rounded-[40px] flex flex-col items-center gap-5"
            >
              <div className="w-20 h-20 rounded-full bg-foreground/5 flex items-center justify-center">
                <Calendar size={32} className="text-foreground/20" />
              </div>
              <div>
                <p className="text-lg font-black italic text-foreground/30">Aucune course pour le moment</p>
                <p className="text-xs text-foreground/20 mt-1">Vos trajets apparaîtront ici après votre première course.</p>
              </div>
              <Link
                href="/ride"
                className="flex items-center gap-2 bg-orange-btn px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg shadow-orange-btn/20 hover:scale-105 transition-all mt-2"
              >
                <Car size={14} /> Commander maintenant
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rides.slice(0, 5).map((ride: any, idx: number) => (
                <RecentRideCard key={ride.rideId || ride.id || idx} ride={ride} idx={idx} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
