/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect, use, useMemo, useRef } from 'react';
import { rideService } from '@/lib/rideService';
import { api } from '@/lib/api-client';
import { 
  ArrowLeft, Loader2, CheckCircle, Phone, 
  AlertCircle, ChevronRight, Clock, Check, MapPin, XCircle
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// 1. IMPORT DYNAMIQUE DE LA CARTE
const MapView = dynamic(() => import('@/components/home/MapView'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 flex flex-col items-center justify-center gap-2 opacity-50">
      <Loader2 className="animate-spin text-orange-btn" />
      <span className="text-[10px] font-black uppercase tracking-widest">Chargement Carte...</span>
    </div>
  )
});

// 2. COMPOSANT INTERMÉDIAIRE MÉMORISÉ
const MemoizedMap = React.memo(({ pickup, destination }: { pickup: any, destination: any }) => {
  return (
    <div className="w-full h-full">
      <MapView 
        pickup={pickup} 
        destination={destination} 
      />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.pickup.lat === nextProps.pickup.lat &&
    prevProps.pickup.lon === nextProps.pickup.lon &&
    prevProps.destination.lat === nextProps.destination.lat &&
    prevProps.destination.lon === nextProps.destination.lon
  );
});

MemoizedMap.displayName = 'MemoizedMap';


export default function OfferDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  // REF pour forcer le scroll en haut du panneau latéral
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [offer, setOffer] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- FORCE SCROLL TO TOP ON MOUNT ---
  useEffect(() => {
    // Force la fenêtre principale en haut
    window.scrollTo(0, 0);
    // Force le conteneur latéral (si existant) en haut
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = 0;
    }
  }, [loading]); // Se déclenche une fois que le chargement est fini

  // --- Fonction utilitaire pour enrichir une offre avec le nom du passager ---
  const enrichOfferWithPassengerName = async (offerData: any): Promise<any> => {
    if (offerData.passengerName || !offerData.passengerId) return offerData;
    try {
      const res = await api.get(`/api/v1/users/${offerData.passengerId}`);
      const u = res.data;
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.username || null;
      return name ? { ...offerData, passengerName: name } : offerData;
    } catch {
      return offerData;
    }
  };

  // --- CHARGEMENT & POLLING ---
  useEffect(() => {
    const init = async () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) setMe(JSON.parse(stored));

        const data = await rideService.getOfferById(id);
        const enriched = await enrichOfferWithPassengerName(data);
        setOffer(enriched);

        if (data.state === 'VALIDATED') {
          const ride = await rideService.getRideByOffer(id);
          router.push(`/driver/ride/${ride.id}`);
        }
      } catch (e) {
        console.error("Erreur init offre", e);
      } finally {
        setLoading(false);
      }
    };

    init();

    const interval: NodeJS.Timeout = setInterval(async () => {
      try {
        const updated = await rideService.getOfferById(id);
        if (updated.state === 'VALIDATED') {
          const ride = await rideService.getRideByOffer(id);
          router.push(`/driver/ride/${ride.id}`);
        } else {
          const enriched = await enrichOfferWithPassengerName(updated);
          setOffer(enriched);
        }
      } catch (e) {}
    }, 4000);

    return () => clearInterval(interval);
  }, [id, router]);


  // --- ACTIONS ---
  const handleApply = async () => {
    setActionLoading(true);
    try {
      await rideService.applyToOffer(id);
      const updated = await rideService.getOfferById(id);
      setOffer(updated);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Erreur postulation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelApplication = async () => {
    setActionLoading(true);
    try {
      try {
        await api.delete(`/api/v1/offers/${id}/apply`);
      } catch (error: any) {
        if (error?.response?.status === 404 || error?.response?.status === 400) {
          await api.delete(`/api/v1/offers/${id}`);
        } else {
          throw error;
        }
      }

      const updated = await rideService.getOfferById(id);
      setOffer(updated);
      toast.success("Votre candidature a été annulée");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Erreur lors de l'annulation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalAccept = async () => {
    setActionLoading(true);
    try {
      const profile = await api.get('/api/v1/users/me');
      const rideRes = await rideService.driverAccepts(id, profile.data.id);
      router.push(`/driver/ride/${rideRes.id}`);
    } catch (e: any) {
      toast.error("Erreur validation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyPhone = () => {
    if (offer?.passengerPhone) {
      navigator.clipboard.writeText(offer.passengerPhone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const mapProps = useMemo(() => {
    if (!offer) return null;
    return {
      pickup: { 
        lat: Number(offer.startLat) || 4.0508, 
        lon: Number(offer.startLon) || 9.7085, 
        name: offer.startPoint 
      },
      destination: { 
        lat: Number(offer.endLat) || 4.0612, 
        lon: Number(offer.endLon) || 9.7150, 
        name: offer.endPoint 
      }
    };
  }, [offer?.startLat, offer?.startLon, offer?.endLat, offer?.endLon, offer?.startPoint, offer?.endPoint]);

  if (loading) return (
    <div className="h-screen w-full bg-background flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-orange-btn" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Chargement...</p>
    </div>
  );

  if (!offer) return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-10 text-center bg-background">
       <AlertCircle size={48} className="text-red-500 mb-4" />
       <h1 className="text-2xl font-black mb-2">Offre indisponible</h1>
       <Link href="/driver/dashboard" className="text-orange-btn font-bold underline">Retour au dashboard</Link>
    </div>
  );

  const hasApplied = offer.bids?.some((bid: any) => bid.driverId === me?.id) || false;
  const isSelected = offer.state === 'DRIVER_SELECTED' && offer.selectedDriverId === me?.id;

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row bg-background text-foreground overflow-hidden">
      
      {/* GAUCHE : DÉTAILS */}
      <div className="w-full lg:w-[480px] h-1/2 lg:h-full flex flex-col border-r border-foreground/5 bg-background shadow-2xl relative z-20">
        {/* On attache la REF ici sur le div qui a le scroll */}
        <div 
          ref={sidebarRef}
          className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 no-scrollbar"
        >
          <div>
             <div className="flex justify-between items-start mb-4">
                <span className="bg-orange-btn/10 text-orange-btn px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-btn/20">
                  Offre {offer.state}
                </span>
                <div className="flex items-center gap-1.5 opacity-50">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold">
                    {(() => {
                      const t = offer.departureTime;
                      if (!t) return '--:--';
                      
                      return t.includes('T') ? t.split('T')[1].slice(0,5) : t;
                    })()}
                  </span>
                </div>
             </div>
             <h1 className="text-5xl font-black italic tracking-tighter">
                {offer.price?.toLocaleString()} <span className="text-lg opacity-30 not-italic ml-1">FCFA</span>
             </h1>
          </div>

          <div className="p-5 bg-foreground/5 rounded-[24px] border border-foreground/5 space-y-6">
             <div className="flex gap-4">
                <div className="flex flex-col items-center pt-1">
                   <div className="w-3 h-3 rounded-full border-[3px] border-orange-btn bg-background"></div>
                   <div className="w-[2px] flex-1 bg-gradient-to-b from-orange-btn/50 to-foreground/10 my-1"></div>
                   <MapPin size={14} className="text-foreground" />
                </div>
                <div className="space-y-6 flex-1 pt-0.5">
                   <div>
                      <p className="text-[9px] font-black uppercase opacity-40 tracking-wider mb-1">Départ</p>
                      <p className="font-bold text-sm leading-snug">{offer.startPoint}</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-black uppercase opacity-40 tracking-wider mb-1">Destination</p>
                      <p className="font-bold text-sm leading-snug">{offer.endPoint}</p>
                   </div>
                </div>
             </div>
          </div>

          {/* ACTIONS ZONE */}
          <div className="pt-2">
            <AnimatePresence mode="wait">
              {isSelected ? (
                <motion.div key="selected" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl flex items-center gap-3 text-green-600">
                     <CheckCircle size={24} />
                     <div>
                        <p className="font-black uppercase text-[10px] tracking-widest">Validé !</p>
                        <p className="text-xs font-bold">Le client vous a sélectionné.</p>
                     </div>
                  </div>
                  <button 
                    onClick={handleFinalAccept}
                    disabled={actionLoading}
                    className="w-full py-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" /> : "Démarrer la course"}
                  </button>
                </motion.div>
              ) : hasApplied ? (
                <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="p-6 border-2 border-dashed border-orange-btn/20 bg-orange-btn/5 rounded-2xl text-center">
                     <Loader2 className="animate-spin mx-auto text-orange-btn mb-3" />
                     <p className="font-black uppercase text-[10px] tracking-widest opacity-60">Offre envoyée</p>
                     <p className="text-xs font-bold mt-1">En attente de la réponse du client...</p>
                  </div>
                  <button
                    onClick={handleCancelApplication}
                    disabled={actionLoading}
                    className="w-full py-3 border border-red-500/20 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />} 
                    Annuler
                  </button>
                </motion.div>
              ) : (
                <motion.button 
                  key="apply"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApply}
                  disabled={actionLoading}
                  className="w-full py-5 bg-orange-btn text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-btn/20 flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
                >
                  {actionLoading ? <Loader2 className="animate-spin" /> : <>Accepter <ChevronRight size={18} /></>}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* INFO CLIENT (Si sélectionné) */}
        {isSelected && (
           <div className="p-6 bg-foreground/5 border-t border-foreground/5 mt-auto">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-btn text-white flex items-center justify-center font-black italic">
                        {offer.passengerName?.[0] || 'C'}
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase opacity-40">Client</p>
                        <p className="text-sm font-bold">{offer.passengerName || 'Client'}</p>
                    </div>
                 </div>
                 <button onClick={handleCopyPhone} className="w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center text-foreground hover:bg-green-500 hover:text-white transition-colors">
                    {copied ? <Check size={18} /> : <Phone size={18} />}
                 </button>
              </div>
           </div>
        )}
      </div>

      {/* DROITE : CARTE MÉMORISÉE */}
      <div className="w-full lg:flex-1 h-1/2 lg:h-full relative bg-gray-100">
        {mapProps && (
          <MemoizedMap 
             pickup={mapProps.pickup} 
             destination={mapProps.destination} 
          />
        )}
      </div>
    </div>
  );
}