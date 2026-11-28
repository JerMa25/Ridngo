/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect, use } from 'react';
import { rideService } from '@/lib/rideService';
import { api } from '@/lib/api-client';
import { MapPin, Navigation, Phone, Loader2, User, ArrowLeft, Flag } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation'; // CORRECT IMPORT
import { toast } from 'react-hot-toast';
import { useNavigation, formatDistance } from '@/lib/navigation';
import { ChatWidget } from '@/app/ride/components/ChatWidget';
import { tr } from '@/lib/i18n';

/** Doit rester aligné sur RideService.ARRIVAL_RADIUS_M côté backend. */
const ARRIVAL_RADIUS_M = 150;

const MapView = dynamic(() => import('@/components/home/MapView'), { ssr: false });

export default function DriverRidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter(); // Initialize router
  const [ride, setRide] = useState<any>(null);
  const [passenger, setPassenger] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get(`/api/v1/trips/${id}`);
        setRide(res.data);
        // départ / destination / téléphone du passager sont portés par l'offre
        rideService.getOfferById(res.data.offerId).then(setOffer).catch(() => {});

        const passRes = await api.get(`/api/v1/users/${res.data.passengerId}`);
        setPassenger(passRes.data);
      } catch (e) { 
        console.error("Erreur initialisation:", e); 
      } finally { 
        setLoading(false); 
      }
    };
    init();

    const interval = setInterval(async () => {
      try {
        const t = await rideService.getTrackingInfo(id);
        setTracking(t);
        
        const check = await api.get(`/api/v1/trips/${id}`);
        if (check.data.state === 'CANCELLED') {
           router.push("/driver/dashboard");
        }
      } catch (e) {}
    }, 5000);

    return () => clearInterval(interval);
  }, [id, router]);

  const goingToPickup = ride?.state === 'CREATED';
  const pickup = offer?.startLat != null ? { lat: offer.startLat, lon: offer.startLon } : null;
  const destination = offer?.endLat != null ? { lat: offer.endLat, lon: offer.endLon } : null;
  const nav = useNavigation(goingToPickup ? pickup : destination, !!ride && ride.state !== 'COMPLETED');
  const arrived = nav.toTarget !== null && nav.toTarget <= ARRIVAL_RADIUS_M;
  const passengerPhone = passenger?.telephone || offer?.passengerPhone;

  const updateStatus = async (newStatus: 'ONGOING' | 'COMPLETED') => {
    setActionLoading(true);
    try {
      await rideService.updateRideStatus(id, newStatus);
      
      if (newStatus === 'COMPLETED') {
        toast.success(tr("Course terminée avec succès !"));
        router.push("/driver/dashboard"); // Redirection vers le dashboard
      } else {
        setRide((prev: any) => ({ ...prev, state: newStatus }));
      }
    } catch (e: any) { 
      console.error("Erreur statut:", e);
      toast.error(e.response?.data?.detail || e.response?.data?.message || tr("Erreur lors de la mise à jour du statut")); 
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="h-app flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-orange-btn" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{tr("Chargement de la course...")}</p>
    </div>
  );

  return (
    <div className="h-app flex flex-col lg:flex-row text-foreground overflow-hidden font-sans">
      
      {/* PANEL INFOS GAUCHE */}
      <div className="w-full lg:w-[450px] bg-background shadow-2xl z-20 p-6 lg:p-10 flex flex-col border-r border-foreground/5 overflow-y-auto no-scrollbar">
        <Link href="/driver/dashboard" className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 mb-8 hover:opacity-100 transition-opacity">
          <ArrowLeft size={16} /> {tr(" Dashboard")}</Link>

        <div className="mb-8">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500">{tr("Course en direct")}</span>
           </div>
           <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
             {ride?.state === 'CREATED' ? tr("Récupération client") : tr("Trajet en cours")}
           </h1>
        </div>

        <div className="space-y-6 flex-1">
           {/* PASSAGER CARD */}
           <div className="p-6 glass border-none bg-foreground/5 rounded-[32px] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-orange-btn rounded-2xl flex items-center justify-center text-white text-xl font-black italic shadow-lg shadow-orange-btn/20 overflow-hidden">
                      {passenger?.photoUri ? <img src={passenger.photoUri} className="w-full h-full object-cover" /> : passenger?.name?.[0]}
                   </div>
                   <div>
                      <p className="text-sm font-black tracking-tight">{passenger?.name || tr("Client")}</p>
                      <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{tr("Passager vérifié")}</p>
                   </div>
                </div>
                <a href={`tel:${passengerPhone}`} aria-label={tr("Appeler le passager")} className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 hover:scale-110 transition-transform">
                   <Phone size={20} />
                </a>
              </div>
              <div className="pt-3 border-t border-foreground/5">
                <p className="text-[9px] font-black uppercase opacity-30 mb-0.5 tracking-tighter">{tr("Contact direct")}</p>
                <p className="text-xs font-bold">{passengerPhone || tr("Non renseigné")}</p>
              </div>
           </div>

           {/* GUIDAGE */}
           <div className="bg-orange-btn text-white rounded-[24px] p-5 shadow-xl shadow-orange-btn/20" aria-live="polite">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{goingToPickup ? tr("Vers le passager") : tr("Vers la destination")}</p>
              <p className="text-lg font-black leading-tight mt-1">{nav.geoError || nav.instruction}</p>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div><p className="text-[8px] font-black uppercase opacity-70">{tr("Restant")}</p><p className="font-black">{nav.remaining != null ? formatDistance(nav.remaining) : '—'}</p></div>
                <div><p className="text-[8px] font-black uppercase opacity-70">{tr("Parcouru")}</p><p className="font-black">{formatDistance(nav.traveled)}</p></div>
                <div><p className="text-[8px] font-black uppercase opacity-70">{tr("Arrivée")}</p><p className="font-black">{nav.etaMinutes ? `${nav.etaMinutes} min` : '—'}</p></div>
              </div>
           </div>

           {/* ACTIONS CHAUFFEUR */}
           <div className="space-y-4">
              {ride?.state === 'CREATED' ? (
                <button 
                  disabled={actionLoading}
                  onClick={() => updateStatus('ONGOING')}
                  className="w-full py-6 bg-orange-btn text-white rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-btn/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {actionLoading ? <Loader2 className="animate-spin" /> : <><Navigation size={20}/> {tr(" J'ai récupéré le client")}</>}
                </button>
              ) : (
                <>
                {!arrived && (
                  <p className="text-[11px] font-bold text-center opacity-60">
                    {tr("Vous pourrez terminer la course à moins de ")}{ARRIVAL_RADIUS_M} {tr(" m de la destination")}{nav.toTarget != null ? ` (encore ${formatDistance(nav.toTarget)})` : ''}.
                  </p>
                )}
                <button 
                  disabled={actionLoading || !arrived}
                  onClick={() => updateStatus('COMPLETED')}
                  className="w-full py-6 bg-foreground text-background dark:bg-white dark:text-bleu-nuit rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-foreground"
                >
                  {actionLoading ? <Loader2 className="animate-spin" /> : <><Flag size={20}/> {tr(" Terminer la course")}</>}
                </button>
                </>
              )}
           </div>
        </div>

        <div className="mt-8 pt-8 border-t border-foreground/5">
           <div className="flex items-center gap-3 opacity-60">
              <MapPin size={16} className="text-orange-btn" />
              <p className="text-xs font-bold truncate">{tr("Destination : ")}{offer?.endPoint || ride?.endPoint || "..."}</p>
           </div>
        </div>
      </div>

      {/* CARTE GPS */}
      <div className="flex-1 relative z-0 min-h-[55vh] lg:min-h-0">
         <MapView
           pickup={pickup ? { ...pickup, name: offer?.startPoint } : undefined}
           destination={destination ? { ...destination, name: offer?.endPoint } : undefined}
           partnerPos={nav.position || (tracking ? { lat: tracking.latitude, lon: tracking.longitude } : undefined)} />
         
         <div className="absolute bottom-6 right-6 glass p-6 border-none shadow-2xl flex items-center gap-6 bg-background/80 backdrop-blur-md">
            <div className="text-center">
               <p className="text-[8px] font-black uppercase opacity-40 tracking-widest">{tr("Distance")}</p>
               <p className="text-xl font-black italic">{tracking?.distanceKm?.toFixed(1) || '0'} <span className="text-xs">{tr("km")}</span></p>
            </div>
            <div className="w-[1px] h-10 bg-foreground/10" />
            <div className="text-center">
               <p className="text-[8px] font-black uppercase opacity-40 tracking-widest">{tr("Arrivée")}</p>
               <p className="text-xl font-black italic">{tracking?.etaMinutes || '--'} <span className="text-xs">{tr("min")}</span></p>
            </div>
         </div>
      </div>
      
      <style jsx>{`
        .glass {
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
        }
      `}</style>
      {/* même chat que côté passager : sans lui le chauffeur ne voyait jamais les messages */}
      {ride?.id && ride?.driverId && <ChatWidget rideId={ride.id} userId={ride.driverId} userRole="DRIVER" />}
    </div>
  );
}