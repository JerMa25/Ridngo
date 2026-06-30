/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect, use } from 'react';
import { rideService } from '@/lib/rideService';
import MapView from '@/components/home/MapView';
import { Loader2, CheckCircle2, Phone, Star, EyeOff, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api-client';
import toast from 'react-hot-toast';

export default function ActiveRidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ride, setRide] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  useEffect(() => {
    // 1. Charger les détails initiaux
    api.get(`/api/v1/trips/${id}`).then(res => setRide(res.data));

    // 2. Polling position
    const interval = setInterval(async () => {
      try {
        const t = await rideService.getTrackingInfo(id);
        setTracking(t);
        
        // Si la course est terminée côté serveur, on affiche l'avis
        const check = await api.get(`/api/v1/trips/${id}`);
        if (check.data.state === 'COMPLETED') setShowReview(true);
      } catch (e) {}
    }, 4000);

    return () => clearInterval(interval);
  }, [id]);

  const handleCompleteRide = async () => {
    try {
      await rideService.updateRideStatus(id, 'COMPLETED');
      setShowReview(true);
    } catch (e) {
      toast.error("Erreur lors de la clôture");
    }
  };

  const submitReview = async () => {
    try {
      await rideService.postReview(id, rating, comment, anonymous);
      window.location.href = "/ride";
    } catch (e) {
      toast('Merci pour votre note !', { icon: '👏' });
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

        {/* Bouton test évaluation (DEBUG - à supprimer en prod) */}
        <button
          onClick={() => setShowReview(true)}
          className="w-full py-3 border-2 border-orange-btn/30 text-orange-btn rounded-2xl font-black text-xs uppercase tracking-widest mt-3 hover:bg-orange-btn/10 transition-all"
        >
          Tester l&apos;évaluation
        </button>
      </div>

      <div className="flex-1 relative z-0">
         <MapView partnerPos={tracking ? { lat: tracking.latitude, lon: tracking.longitude } : undefined} />
      </div>

      {/* MODALE D'ÉVALUATION (Après COMPLETED) */}
      <AnimatePresence>
        {showReview && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass max-w-md w-full p-8 relative bg-background border-none text-center rounded-[40px] z-10 overflow-y-auto max-h-[90vh]"
            >
               <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
               <h2 className="text-3xl font-black mb-1">Trajet Terminé !</h2>
               <p className="text-sm opacity-50 mb-8">Comment s&apos;est passée votre course ?</p>
               
               {/* Étoiles */}
               <div className="flex justify-center gap-2 mb-6">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setRating(s)}>
                      <Star size={32} className={s <= rating ? "fill-orange-btn text-orange-btn" : "text-foreground/10"} />
                    </button>
                  ))}
               </div>

               {/* Commentaire */}
               <textarea 
                placeholder="Un petit commentaire... (Optionnel)"
                className="w-full bg-foreground/5 p-4 rounded-2xl mb-4 outline-none focus:ring-2 focus:ring-orange-btn font-medium resize-none text-sm"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
               />

               {/* ─── TOGGLE ANONYME ─── */}
               <button
                 onClick={() => setAnonymous(!anonymous)}
                 className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl mb-6 transition-all duration-200 border-2 ${
                   anonymous
                     ? 'border-orange-btn/60 bg-orange-btn/10'
                     : 'border-foreground/10 bg-foreground/[0.03]'
                 }`}
               >
                 <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                     anonymous ? 'bg-orange-btn' : 'bg-foreground/10'
                   }`}>
                     {anonymous
                       ? <EyeOff size={15} className="text-white" />
                       : <Eye size={15} className="text-foreground/50" />
                     }
                   </div>
                   <div className="text-left">
                     <p className={`text-xs font-black uppercase tracking-wider transition-colors ${anonymous ? 'text-orange-btn' : 'text-foreground/60'}`}>
                       {anonymous ? 'Commentaire anonyme' : 'Envoyer avec mon nom'}
                     </p>
                     <p className="text-[10px] text-foreground/40 font-medium mt-0.5">
                       {anonymous
                         ? 'Le chauffeur verra "Anonyme" à la place de votre nom'
                         : 'Le chauffeur pourra voir votre nom'
                       }
                     </p>
                   </div>
                 </div>
                 {/* Indicateur ON/OFF */}
                 <div className={`w-10 h-5 rounded-full relative transition-all duration-200 ${anonymous ? 'bg-orange-btn' : 'bg-foreground/10'}`}>
                   <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${anonymous ? 'right-0.5' : 'left-0.5'}`} />
                 </div>
               </button>

               <button
                 onClick={submitReview}
                 className="w-full py-4 bg-orange-btn text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:opacity-90 transition-opacity"
               >
                  Envoyer l&apos;évaluation
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}