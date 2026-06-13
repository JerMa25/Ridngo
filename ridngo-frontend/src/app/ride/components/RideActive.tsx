/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, Phone, Star, Loader2, 
  CheckCircle2, Check, User, Car, Navigation, Clock, MessageSquare
} from 'lucide-react';
import { rideService } from '@/lib/rideService';
import api from '@/lib/api-client';

interface Props {
  ride: any;
  tracking: any;
}

export const RideActive = ({ ride, tracking }: Props) => {
  const [fullDriverProfile, setFullDriverProfile] = useState<any>(null);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [fetchingDriver, setFetchingDriver] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOngoing = ride?.state === 'ONGOING';
  const isCreated = ride?.state === 'CREATED';
  const isCompleted = ride?.state === 'COMPLETED';

  // 1. Déclencher la modale d'avis dès que le chauffeur termine la course
  useEffect(() => {
    if (isCompleted) {
      setShowReview(true);
      // On supprime l'ID de l'offre locale car le cycle est fini
      localStorage.removeItem('activeOfferId');
    }
  }, [isCompleted]);

  // 2. Récupérer les informations du chauffeur
  useEffect(() => {
    const fetchDriverInfo = async () => {
      if (!ride?.driverId) return;
      try {
        // Note: On utilise la route utilisateur pour obtenir les détails du chauffeur
        const res = await api.get(`/api/v1/users/${ride.driverId}`);
        setFullDriverProfile(res.data);
      } catch (e) {
        console.error("Erreur lors de la récupération du profil chauffeur", e);
      } finally {
        setFetchingDriver(false);
      }
    };
    fetchDriverInfo();
  }, [ride?.driverId]);

  const handleCopyNumber = () => {
    const phone = fullDriverProfile?.telephone || fullDriverProfile?.user?.telephone;
    if (phone) {
      navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      // Appel à la route backend: POST /api/v1/reviews/ride/{rideId}
      await api.post(`/api/v1/reviews/ride/${ride.id}`, {
        stars: rating,
        comment: comment
      });
      alert("Merci pour votre évaluation !");
      window.location.href = "/ride"; // Reset de l'interface client
    } catch (e) {
      console.error("Erreur review", e);
      // En cas d'erreur, on redirige quand même pour ne pas bloquer l'utilisateur
      window.location.href = "/ride";
    } finally {
      setSubmittingReview(false);
    }
  };

  if (fetchingDriver) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Synchronisation du trajet...</p>
      </div>
    );
  }

  const userData = fullDriverProfile?.user || fullDriverProfile;
  const vehicleData = fullDriverProfile?.vehicle;
  const driverDetails = fullDriverProfile?.driver;

  return (
    <div className="space-y-8 font-sans text-foreground">
      
      {/* BANNIÈRE DE STATUT DYNAMIQUE */}
      <div className={`${isCreated ? 'bg-orange-btn/10 border-orange-btn/20' : 'bg-green-500/10 border-green-500/20'} p-6 rounded-[32px] border flex items-center gap-4 transition-colors duration-500 shadow-sm`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${isCreated ? 'bg-orange-btn shadow-orange-btn/20' : 'bg-green-500 shadow-green-500/20'}`}>
           {isCreated ? <Clock size={28} /> : <Navigation size={28} />}
        </div>
        <div>
           <p className={`font-black uppercase text-xs tracking-tight ${isCreated ? 'text-orange-btn' : 'text-green-600'}`}>
             {isCreated ? "Le chauffeur arrive" : "Trajet en cours"}
           </p>
           <p className="text-[10px] font-bold opacity-60 italic leading-tight">
             {isCreated ? "Récupération à votre position" : "En route vers la destination"} • ~{tracking?.etaMinutes || '--'} min
           </p>
        </div>
      </div>

      {/* INFOS CHAUFFEUR & VÉHICULE */}
      <div className="glass p-8 border-none bg-background shadow-xl text-center rounded-[40px] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-foreground"><Car size={100} /></div>

        <p className="text-[9px] font-black uppercase opacity-30 tracking-widest mb-6">Votre chauffeur certifié</p>
        
        <div className="w-24 h-24 bg-orange-btn rounded-[35px] flex items-center justify-center mx-auto mb-4 border-4 border-background shadow-2xl overflow-hidden italic text-3xl text-white font-black">
           {userData?.photoUri ? (
             <img src={userData.photoUri} className="w-full h-full object-cover" alt="Driver" />
           ) : (
             userData?.name?.charAt(0) || userData?.firstName?.charAt(0) || "D"
           )}
        </div>

        <h3 className="text-xl font-black italic tracking-tight">{userData?.name || `${userData?.firstName} ${userData?.lastName}`}</h3>
        
        <div className="flex items-center justify-center gap-3 mt-2">
           <div className="flex items-center gap-1 bg-orange-btn/10 px-2 py-1 rounded-lg">
              <Star size={12} className="fill-orange-btn text-orange-btn" />
              <span className="text-[11px] font-black text-orange-btn">{driverDetails?.rating?.toFixed(1) || '4.9'}</span>
           </div>
           <span className="text-[10px] font-bold opacity-20 uppercase tracking-tighter">Véhicule vérifié</span>
        </div>

        {vehicleData && (
          <div className="mt-6 p-4 bg-foreground/5 rounded-2xl flex items-center justify-center gap-4">
             <div className="text-left">
                <p className="text-[8px] font-black uppercase opacity-30 leading-none mb-1">Véhicule</p>
                <p className="text-xs font-bold">{vehicleData.brand} {vehicleData.modelName}</p>
             </div>
             <div className="w-[1px] h-8 bg-foreground/10" />
             <div className="text-right">
                <p className="text-[8px] font-black uppercase opacity-30 leading-none mb-1">Plaque</p>
                <p className="text-xs font-black tracking-tight">{vehicleData.registrationNumber}</p>
             </div>
          </div>
        )}
        
        <div className="mt-8">
           <button 
             onClick={handleCopyNumber}
             className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all uppercase text-[10px] tracking-widest shadow-lg ${
               copied ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-orange-btn text-white shadow-orange-btn/20 hover:scale-[1.02]'
             }`}
           >
              {copied ? <Check size={18} /> : <Phone size={18} />}
              {copied ? "Numéro copié !" : "Appeler le chauffeur"}
           </button>
        </div>
      </div>

      {/* MESSAGE D'ATTENTE */}
      <div className="p-8 border-2 border-dashed border-foreground/5 rounded-[40px] text-center">
         <Loader2 className="animate-spin mx-auto mb-4 opacity-20" size={24} />
         <p className="text-[10px] font-black uppercase opacity-30 tracking-[0.2em] leading-relaxed">
           Le chauffeur terminera la course sur son application une fois arrivé à destination.
         </p>
      </div>

      {/* MODALE D'ÉVALUATION (Déclenchée quand le chauffeur passe le trip à COMPLETED) */}
      <AnimatePresence>
        {showReview && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="glass max-w-md w-full p-10 relative bg-background border-none text-center rounded-[40px] shadow-2xl"
            >
               <div className="w-20 h-20 bg-green-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-green-500/20">
                  <CheckCircle2 size={40} />
               </div>
               <h2 className="text-3xl font-black italic tracking-tighter mb-2">Trajet terminé !</h2>
               <p className="text-sm opacity-50 mb-8 font-medium">Comment s&apos;est passée votre course avec <span className="text-foreground font-bold">{userData?.firstName || userData?.name?.split(' ')[0]}</span> ?</p>
      
               {/* SÉLECTION DES ÉTOILES */}
               <div className="flex justify-center gap-2 mb-8">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setRating(s)} className="transition-transform active:scale-90 p-1">
                      <Star size={36} className={s <= rating ? "fill-orange-btn text-orange-btn" : "text-foreground/10"} />
                    </button>
                  ))}
               </div>

               <div className="relative mb-8">
                  <MessageSquare className="absolute left-4 top-5 opacity-20" size={18} />
                  <textarea 
                    placeholder="Un commentaire sur la conduite ou la propreté ?"
                    className="w-full bg-foreground/5 p-5 pl-12 rounded-3xl outline-none focus:ring-2 focus:ring-orange-btn font-medium text-sm text-foreground"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
               </div>

               <button 
                disabled={submittingReview}
                onClick={submitReview} 
                className="w-full py-5 bg-orange-btn text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-btn/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                  {submittingReview ? <Loader2 className="animate-spin" size={20} /> : "Envoyer l'évaluation"}
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .glass {
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
        }
      `}</style>
    </div>
  );
};