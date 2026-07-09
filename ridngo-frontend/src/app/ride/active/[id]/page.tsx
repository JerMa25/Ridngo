/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, use } from 'react';
import { rideService } from '@/lib/rideService';
import MapView from '@/components/home/MapView';
import { Loader2, CheckCircle2, Phone, MapPin, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api-client';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function ActiveRidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: ride } = useQuery({
    queryKey: ['activeRide', id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/trips/${id}`);
      return res.data;
    },
  });

  const { data: tracking } = useQuery({
    queryKey: ['rideTracking', id],
    queryFn: async () => {
      const t = await rideService.getTrackingInfo(id);
      // Vérifier si la course est terminée côté serveur
      const check = await api.get(`/api/v1/trips/${id}`);
      if (check.data.state === 'COMPLETED') setShowReview(true);
      return t;
    },
    refetchInterval: 4000,
  });

  const handleCompleteRide = async () => {
    try {
      // Optimistic UI
      queryClient.setQueryData(['activeRide', id], (old: any) => ({
        ...old,
        state: 'COMPLETED'
      }));
      await rideService.updateRideStatus(id, 'COMPLETED');
      setShowReview(true);
    } catch (e) {
      toast.error("Erreur lors de la clôture");
      // Rollback
      queryClient.invalidateQueries({ queryKey: ['activeRide', id] });
    }
  };

  const submitReview = async () => {
    try {
      await rideService.postReview(id, rating, comment);
      window.location.href = "/ride"; // Retour accueil client
    } catch (e) {
      //alert("Merci pour votre note !");
      toast('Merci pour votre note !', {
        icon: '👏',
      });
      window.location.href = "/ride";
    }
  };

  if (!ride) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-btn" /></div>;

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      
      <div className="w-full lg:w-[450px] bg-background shadow-2xl z-20 p-6 lg:p-10 flex flex-col">
        <div className="flex-1 space-y-8">
           <div className="flex items-center justify-between">
              <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-full text-[10px] font-black uppercase animate-pulse">Course Active</div>
              <span className="font-black text-xl italic">{tracking?.etaMinutes || '--'} min restants</span>
           </div>

           <div className="space-y-4">
              <div className="p-4 bg-foreground/5 rounded-2xl">
                 <p className="text-[10px] font-black opacity-40 uppercase">Destination</p>
                 <p className="font-bold text-sm truncate">{ride.endPoint || "Adresse de destination"}</p>
              </div>
           </div>

           <div className="p-6 glass border-none text-center">
              <div className="w-20 h-20 bg-orange-btn rounded-[30px] mx-auto mb-4 flex items-center justify-center text-white text-3xl font-black italic">R</div>
              <h3 className="font-black text-lg">Votre partenaire</h3>
              <p className="text-xs opacity-50 mb-6">Contactez-le en cas de besoin</p>
              <button className="w-full py-4 bg-orange-btn text-white rounded-2xl font-black flex items-center justify-center gap-3">
                 <Phone size={20}/> Appeler
              </button>
           </div>
        </div>

        {/* Bouton visible UNIQUEMENT pour le client (Passenger) */}
        {ride.passengerId && (
          <button 
            onClick={handleCompleteRide}
            className="w-full py-6 bg-foreground text-background rounded-3xl font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all shadow-xl mt-6"
          >
            Terminer la course
          </button>
        )}
      </div>

      <div className="flex-1 relative z-0">
         <MapView partnerPos={tracking ? { lat: tracking.latitude, lon: tracking.longitude } : undefined} />
      </div>

      {/* MODALE D'ÉVALUATION (Après COMPLETED) */}
      <AnimatePresence>
        {showReview && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass max-w-md w-full p-10 relative bg-background border-none text-center rounded-[40px]">
               <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6" />
               <h2 className="text-3xl font-black mb-2">Trajet Terminé !</h2>
               <p className="text-sm opacity-50 mb-10">Comment s&apos;est passée votre course ?</p>
               
               <div className="flex justify-center gap-2 mb-8">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setRating(s)}>
                      <Star size={32} className={s <= rating ? "fill-orange-btn text-orange-btn" : "text-foreground/10"} />
                    </button>
                  ))}
               </div>

               <textarea 
                placeholder="Un petit commentaire... (Optionnel)"
                className="w-full bg-foreground/5 p-4 rounded-2xl mb-8 outline-none focus:ring-2 focus:ring-orange-btn font-medium"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
               />

               <button onClick={submitReview} className="w-full py-5 bg-orange-btn text-white rounded-2xl font-black uppercase tracking-widest shadow-xl">
                  Envoyer l&apos;évaluation
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}