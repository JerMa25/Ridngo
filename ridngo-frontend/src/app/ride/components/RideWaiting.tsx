/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, Star, Car, Clock, ShieldCheck, 
  User, XCircle, ChevronRight, Phone, Info 
} from 'lucide-react';
import api from '@/lib/api-client';
import toast from 'react-hot-toast';

import DriverProfilePopup from './DriverProfile';

interface Props {
  offer: any;
  onSelectDriver: (driverId: string) => void;
}

/**
 * SOUS-COMPOSANT : Carte individuelle d'une proposition (Bid)
 * Appelle la route /api/v1/users/drivers/{id} pour un profil complet
 */
const BidCard = ({ bid, offer, onSelectDriver }: { bid: any, offer: any, onSelectDriver: any }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  
  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        // Route demandée : /api/v1/users/drivers/{id}
        const res = await api.get(`/api/v1/users/drivers/${bid.driverId}`);
        setProfile(res.data);
      } catch (e) {
        console.error("Erreur chargement profil chauffeur complet", e);
      } finally {
        setLoading(false);
      }
    };
    fetchFullProfile();
  }, [bid.driverId]);

  if (loading) return (
    <div className="glass p-6 flex items-center justify-center bg-background/50 rounded-4xl">
      <Loader2 className="animate-spin text-orange-btn/20" size={20} />
    </div>
  );

  // Données extraites de la réponse FullDriverProfileResponse
  const driverUser = profile?.user;
  const driverStats = profile?.driver;
  const vehicle = profile?.vehicle;
  
  const isSelected = offer.selectedDriverId === bid.driverId;

  return (
  <>
    {/* Popup profil — géré dans DriverProfilePopup.tsx */}
    {showPopup && profile && (
        <DriverProfilePopup profile={profile} onClose={() => setShowPopup(false)} />
      )}

    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`glass p-5 flex flex-col gap-4 border-none shadow-xl relative overflow-hidden transition-all ${
        isSelected ? 'ring-2 ring-orange-btn bg-orange-btn/3' : 'bg-background hover:bg-foreground/2'
      }`}
    >
      {/* HEADER : IDENTITÉ & NOTE */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-btn rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden border-2 border-background">
            {driverUser?.photoUri ? (
              <img src={driverUser.photoUri} className="w-full h-full object-cover" alt="" />
            ) : (
              <User size={24} />
            )}
          </div>
          <div>
            <button onClick={() => setShowPopup(true)} className="font-black text-base text-foreground tracking-tight
            text-left hover:text-orange-btn transition-colors underline-offset-2 hover:underline">
                {driverUser?.firstName} {driverUser?.lastName}
            </button>

            <div className="flex items-center gap-2 mt-0.5">
               <div className="flex items-center gap-1 bg-orange-btn/10 px-1.5 py-0.5 rounded-lg">
                  <Star size={10} className="fill-orange-btn text-orange-btn"/>
                  <span className="text-[10px] font-black text-orange-btn">
                    {driverStats?.rating?.toFixed(1) || "0.0"}
                  </span>
               </div>
               <span className="text-[10px] font-bold opacity-30 uppercase tracking-tighter">
                 {driverStats?.totalReviewsCount || 0} avis
               </span>
            </div>
          </div>
        </div>

        <div className="text-right">
           <div className="flex items-center gap-1 text-green-600 font-black italic text-xs">
              <Clock size={12} /> ~{bid.eta || 5} min
           </div>
           <p className="text-[8px] font-bold opacity-30 uppercase">Arrivée</p>
        </div>
      </div>

      {/* DÉTAILS VÉHICULE */}
      <div className="flex items-center justify-between p-3 bg-foreground/5 rounded-2xl border border-foreground/5">
        <div className="flex items-center gap-3">
           <Car size={16} className="opacity-30" />
           <div className="min-w-0">
              <p className="text-[10px] font-black text-foreground uppercase truncate">
                {vehicle?.brand} {vehicle?.modelName}
              </p>
              <p className="text-[9px] font-bold opacity-40 uppercase">
                {vehicle?.fuelTypeId?.split('-')[0] || "Standard"}
              </p>
           </div>
        </div>
        <div className="px-3 py-1 bg-background rounded-lg border border-foreground/10">
           <span className="text-[10px] font-black tracking-widest">{vehicle?.registrationNumber || "--- ---"}</span>
        </div>
      </div>

      {/* ACTION : CHOISIR OU ATTENTE */}
      <div className="pt-2">
        {isSelected ? (
          <div className="w-full py-4 bg-orange-btn/10 border border-orange-btn/20 text-orange-btn rounded-2xl flex items-center justify-center gap-3 animate-pulse">
             <ShieldCheck size={18} />
             <span className="text-xs font-black uppercase tracking-widest">En attente du chauffeur...</span>
          </div>
        ) : (
          <button 
            onClick={() => onSelectDriver(bid.driverId)} 
            className="w-full py-4 bg-foreground text-background dark:bg-white dark:text-bleu-nuit rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-orange-btn hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Choisir ce chauffeur
          </button>
        )}
      </div>
    </motion.div>
  </>
  );
};

/**
 * COMPOSANT PRINCIPAL : RideWaiting
 */
export default function RideWaiting({ offer, onSelectDriver }: Props) {
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOffer = async () => {
    if (!offer?.id) return;
    const confirmCancel = confirm("Voulez-vous vraiment annuler votre demande ?");
    if (!confirmCancel) return;

    setIsCancelling(true);
    try {
      await api.delete(`/api/v1/offers/${offer.id}`);
      localStorage.removeItem('activeOfferId');
      window.location.reload();
    } catch (error: any) {
      toast.error("Erreur lors de l'annulation.");
      setIsCancelling(false);
    }
  };

  return (
    <motion.div 
      key="waiting" 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }} 
      className="space-y-6"
    >
      {/* HEADER RADAR */}
      <div className="flex items-center gap-4 py-5 px-6 bg-orange-btn/10 rounded-3xl text-orange-btn border border-orange-btn/10 shadow-sm">
        <Loader2 className="animate-spin" size={20} />
        <div className="flex flex-col">
          <span className="font-black uppercase text-xs tracking-widest">Radar actif</span>
          <span className="text-[10px] font-bold opacity-70 italic">Analyse des chauffeurs...</span>
        </div>
      </div>
      
      {/* LISTE DES PROPOSITIONS */}
      {(!offer?.bids || offer.bids.length === 0) ? (
        <div className="text-center py-20 opacity-30 flex flex-col items-center gap-4">
           <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center animate-pulse text-foreground">
              <Car size={32} />
           </div>
           <p className="italic font-bold text-sm tracking-tight px-10 leading-relaxed text-foreground">
             Votre offre est visible. Les chauffeurs vont bientôt répondre.
           </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase opacity-40 ml-2 tracking-[0.2em]">
            {offer.bids.length} chauffeur(s) à proximité
          </p>

          {offer.bids.map((bid: any) => (
            <BidCard 
                key={bid.driverId} 
                bid={bid} 
                offer={offer} 
                onSelectDriver={onSelectDriver} 
            />
          ))}
        </div>
      )}
      
      {/* ANNULER L'OFFRE */}
      <button 
        disabled={isCancelling}
        className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] opacity-30 hover:opacity-100 hover:text-red-500 transition-all disabled:opacity-10"
        onClick={handleCancelOffer}
      >
        {isCancelling ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
        Annuler ma demande
      </button>

      <style jsx>{`
        .glass {
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 32px;
        }
      `}</style>
    </motion.div>
  );
}

export { RideWaiting }; // Export pour l'import nommé si besoin