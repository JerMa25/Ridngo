/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { 
  ArrowLeft, Calendar, User, Loader2, 
  MapPin, Clock, CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

/**
 * SOUS-COMPOSANT : Carte de trajet pour le driver
 */
const DriverHistoryCard = ({ ride, idx }: { ride: any, idx: number }) => {
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullDetails = async () => {
      try {
        // 1. Chercher le ride par son ID pour avoir le passengerId
        const rideDetail = await api.get(`/api/v1/trips/${ride.rideId}`);
        const passengerId = rideDetail.data.passengerId;

        // 2. Récupérer les infos du passager (firstName / lastName)
        const userRes = await api.get(`/api/v1/users/${passengerId}`);
        setPartner(userRes.data);
      } catch (e) {
        console.error("Erreur enrichissement passager:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchFullDetails();
  }, [ride.rideId]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
      className="glass p-6 border-none shadow-lg hover:shadow-xl transition-all flex flex-col md:flex-row justify-between md:items-center gap-6 rounded-[32px] overflow-hidden"
    >
      <div className="flex items-center gap-5">
         <div className="w-14 h-14 bg-foreground/5 rounded-2xl flex items-center justify-center text-orange-btn shadow-inner overflow-hidden">
            {ride.partnerPhoto ? (
              <img src={ride.partnerPhoto} className="w-full h-full object-cover" alt="" />
            ) : (
              <User size={24} />
            )}
         </div>
         <div>
            <p className="text-[9px] font-black uppercase opacity-30 tracking-widest leading-none mb-1">Passager</p>
            {loading ? (
              <div className="h-4 w-28 bg-foreground/5 animate-pulse rounded mt-1" />
            ) : (
              <p className="font-black text-base capitalize">
                {partner?.firstName} {partner?.lastName}
              </p>
            )}
            <p className="text-[10px] font-bold opacity-40 mt-1 uppercase tracking-tighter">
               {new Date(ride.createdAt).toLocaleDateString()} • ID #{ride.rideId.slice(0, 5)}
            </p>
         </div>
      </div>

      <div className="flex-1 space-y-3 px-2">
         <div className="flex items-start gap-3">
            <MapPin size={14} className="text-orange-btn mt-0.5 shrink-0" />
            <div>
               <p className="text-xs font-bold leading-tight line-clamp-1">{ride.startPoint}</p>
               <p className="text-[9px] font-bold opacity-30 uppercase mt-1">Vers : {ride.endPoint?.split(',')[0]}</p>
            </div>
         </div>
      </div>

      <div className="flex items-center justify-between md:flex-col md:items-end gap-3 bg-foreground/5 md:bg-transparent p-4 md:p-0 rounded-2xl">
         <div className="text-right order-2 md:order-1">
            <p className="text-2xl font-black italic tracking-tighter text-foreground">{ride.price?.toLocaleString()} F</p>
            <p className="text-[8px] font-black uppercase opacity-30 tracking-[0.2em] leading-none mt-1 text-right">Net Chauffeur</p>
         </div>
         <div className={`order-1 md:order-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${ride.state === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
           {ride.state === 'COMPLETED' && <CheckCircle2 size={12}/>} {ride.state}
         </div>
      </div>
    </motion.div>
  );
};

export default function HistoryPage() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/api/v1/trips/enriched-history?page=0&size=50');
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
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-orange-btn" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Récupération de l&apos;historique...</p>
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto p-6 md:py-12 space-y-10 font-sans text-foreground">
      <div className="flex items-center gap-5">
        <Link href="/driver/dashboard" className="w-12 h-12 flex items-center justify-center bg-foreground/5 rounded-2xl hover:bg-orange-btn hover:text-white transition-all">
          <ArrowLeft size={24} />
        </Link>
        <div>
           <h1 className="text-4xl font-black tracking-tighter italic">Historique</h1>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Suivi des activités</p>
        </div>
      </div>

      <div className="grid gap-4">
        {rides.length === 0 ? (
          <div className="glass p-20 text-center opacity-30 italic font-bold rounded-[40px] border-none shadow-xl bg-background">
            Aucun trajet trouvé.
          </div>
        ) : (
          rides.map((ride, idx) => (
            <DriverHistoryCard key={ride.rideId} ride={ride} idx={idx} />
          ))
        )}
      </div>
    </main>
  );
}