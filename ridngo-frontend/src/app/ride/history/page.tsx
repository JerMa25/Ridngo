/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { 
  ArrowLeft, Calendar, MapPin, Loader2, 
  User, Car, Clock, CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

/**
 * SOUS-COMPOSANT : Carte de trajet avec récupération des noms réels
 */
const RideHistoryCard = ({ ride, idx }: { ride: any, idx: number }) => {
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullDetails = async () => {
      try {
        // 1. Chercher le ride par son ID pour avoir le driverId
        const rideDetail = await api.get(`/api/v1/trips/${ride.rideId}`);
        const driverId = rideDetail.data.driverId;

        // 2. Récupérer les infos du driver (firstName / lastName)
        const userRes = await api.get(`/api/v1/users/${driverId}`);
        setPartner(userRes.data);
      } catch (e) {
        console.error("Erreur enrichissement partenaire:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchFullDetails();
  }, [ride.rideId]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
      className="glass p-6 border-none bg-background shadow-lg hover:shadow-xl transition-all flex flex-col gap-6 rounded-4xl overflow-hidden relative"
    >
      <div className="flex justify-between items-start">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-btn rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden italic font-black text-xl">
               {ride.partnerPhoto ? (
                 <img src={ride.partnerPhoto} className="w-full h-full object-cover" alt="" />
               ) : (
                 <User size={24} />
               )}
            </div>
            <div>
               <p className="text-[10px] font-black uppercase opacity-30 tracking-widest">Chauffeur</p>
               {loading ? (
                 <div className="h-4 w-24 bg-foreground/5 animate-pulse rounded mt-1" />
               ) : (
                 <p className="font-black text-sm capitalize">
                    {partner?.firstName} {partner?.lastName}
                 </p>
               )}
            </div>
         </div>
         <div className="text-right">
            <p className="text-[10px] font-black uppercase opacity-30 tracking-widest">Date</p>
            <p className="font-bold text-xs">{new Date(ride.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
         </div>
      </div>

      <div className="flex gap-4">
         <div className="flex flex-col items-center py-1">
            <div className="w-2 h-2 rounded-full bg-orange-btn" />
            <div className="w-px flex-1 bg-foreground/10 my-1" />
            <div className="w-2 h-2 rounded-full bg-foreground" />
         </div>
         <div className="flex-1 space-y-4">
            <p className="text-xs font-bold truncate opacity-70 leading-none">{ride.startPoint}</p>
            <p className="text-xs font-bold truncate leading-none">{ride.endPoint}</p>
         </div>
         <div className="text-right flex flex-col justify-center">
            <p className="text-xl font-black italic tracking-tighter text-orange-btn">{ride.price} F</p>
            <p className="text-[8px] font-black uppercase opacity-30 tracking-tighter">Prix total</p>
         </div>
      </div>
      <div className="pt-3 flex items-center justify-between text-[10px] opacity-60">
        <div className="flex items-center gap-3">
          <span className="font-black uppercase tracking-widest">Places:</span>
          <span className="font-bold">{ride.numberOfPlaces ?? ride.offer?.numberOfPlaces ?? '—'}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-foreground/5 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-foreground/40 font-bold text-[10px] uppercase">
               <Car size={14} className="text-orange-btn"/> 
               {ride.vehicle?.brand} {ride.vehicle?.modelName}
            </div>
            <div className="w-1 h-1 rounded-full bg-foreground/10" />
            <div className="flex items-center gap-2 text-foreground/40 font-bold text-[10px] uppercase">
               <Clock size={14}/> {ride.distance?.toFixed(1) || '0'} KM
            </div>
         </div>
         <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${ride.state === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {ride.state}
         </span>
      </div>
    </motion.div>
  );
};

export default function PassengerHistoryPage() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/api/v1/trips/enriched-history?page=0&size=20');
        setRides(res.data);
      } catch (e) { 
        console.error("Erreur historique enrichi:", e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchHistory();
  }, []);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="animate-spin text-orange-btn" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Récupération des voyages...</p>
    </div>
  );

  return (
    <main className="max-w-4xl mx-auto p-6 md:py-12 space-y-10 font-sans text-foreground">
      <div className="flex items-center gap-5">
        <Link href="/ride" className="w-12 h-12 flex items-center justify-center bg-foreground/5 rounded-2xl hover:bg-orange-btn hover:text-white transition-all">
          <ArrowLeft size={24} />
        </Link>
        <div>
           <h1 className="text-4xl font-black tracking-tighter italic">Mes Voyages</h1>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Historique complet</p>
        </div>
      </div>

      <div className="grid gap-6">
        {rides.length === 0 ? (
          <div className="glass p-20 text-center border-none shadow-xl bg-background rounded-[40px] flex flex-col items-center gap-4">
            <Calendar size={32} className="opacity-20"/>
            <p className="opacity-30 italic font-bold">Aucune course enregistrée.</p>
          </div>
        ) : (
          rides.map((ride, idx) => (
            <RideHistoryCard key={ride.rideId} ride={ride} idx={idx} />
          ))
        )}
      </div>
    </main>
  );
}