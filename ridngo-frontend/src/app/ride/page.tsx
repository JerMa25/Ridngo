/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { rideService } from '@/lib/rideService';
import { api } from '@/lib/api-client';
import { AnimatePresence } from 'framer-motion';
import { Loader2, History } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { RideSearch } from './components/RideSearch';
import { RidePriceSetting } from './components/RidePriceSetting';
import { RideWaiting } from './components/RideWaiting';
import { RideActive } from './components/RideActive';
import { TripSummary } from './components/TripSummary';

const MapView = dynamic(() => import('@/components/home/MapView'), { ssr: false });

export default function RidePage() {
  const router = useRouter();
  const [step, setStep] = useState<'search'|'price'|'waiting'|'active'|'loading'>('loading');
  
  // États de l'offre
  const [pickup, setPickup] = useState<any>(null); // Contient {name, lat, lon}
  const [dest, setDest] = useState<any>(null);   // Contient {name, lat, lon}
  const [price, setPrice] = useState(500);
  const [passengerPhone, setPassengerPhone] = useState("");
  const [departureTime, setDepartureTime] = useState(
    new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );
  const [numberOfPlaces, setNumberOfPlaces] = useState(1);
  const [offer, setOffer] = useState<any>(null);
  const [ride, setRide] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      // 1. Guard : Authentification
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      // Initialisation du téléphone par défaut de l'utilisateur
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.phone) setPassengerPhone(u.phone);
      }

      // 2. Vérifier si une course est déjà en cours
      const currentRide = await rideService.getCurrentPassengerRide();
      if (currentRide) {
        setRide(currentRide);
        setStep('active');
        return;
      }

      // 3. Vérifier si une offre est en attente
      const savedOfferId = localStorage.getItem('activeOfferId');
      if (savedOfferId) {
        try {
          const offerData = await rideService.getOfferBids(savedOfferId);
          if (offerData.state === 'CANCELLED') {
            localStorage.removeItem('activeOfferId');
            setStep('search');
          } else if (offerData.state === 'VALIDATED') {
            const rideData = await rideService.getRideByOffer(offerData.id);
            setRide(rideData);
            setStep('active');
          } else {
            setOffer(offerData);
            setStep('waiting');
          }
        } catch (e) { setStep('search'); }
      } else {
        setStep('search');
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    let interval: any;
    
    // Polling pendant l'attente de chauffeur
    if (step === 'waiting' && offer) {
      interval = setInterval(async () => {
        const updated = await rideService.getOfferBids(offer.id);
        setOffer(updated);
        if (updated.state === 'VALIDATED') {
          const rideData = await rideService.getRideByOffer(offer.id);
          setRide(rideData);
          setStep('active');
          localStorage.removeItem('activeOfferId');
        }
      }, 3500);
    }

    // Polling pendant la course
    if (step === 'active' && ride) {
      interval = setInterval(async () => {
        try {
          const [t, r] = await Promise.all([
            rideService.getTrackingInfo(ride.id),
            api.get(`/api/v1/trips/${ride.id}`)
          ]);
          setTracking(t);
          setRide(r.data); 
        } catch (e) {}
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [step, offer, ride]);

  // --- ENVOI GPS CLIENT (COURSE ACTIVE UNIQUEMENT) ---
  useEffect(() => {
    let geoInterval: any;

    if (step === 'active') {
      console.log("GPS Client Activé pour la course");
      geoInterval = setInterval(() => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              rideService.updateLocation(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => console.warn("Erreur GPS Client:", err),
            { enableHighAccuracy: true }
          );
        }
      }, 1900); // Toutes les (1.9 + overhead) secondes pour le client
    }

    return () => {
      if (geoInterval) clearInterval(geoInterval);
    };
  }, [step]);

  const handleEstimate = async () => {
    const res = await rideService.estimateFare(pickup.name, dest.name);
    setPrice(Math.round(res.prix_moyen / 50) * 50);
    setStep('price');
  };

  const handlePublishOffer = async () => {
    try {
      // On construit la requête avec les coordonnées extraites de 'pickup'
      const data = await rideService.createOffer({
        startPoint: pickup.name,
        startLat: parseFloat(pickup.lat), // Conversion en nombre
        startLon: parseFloat(pickup.lon), // Conversion en nombre
        endLat: parseFloat(dest.lat), // Conversion en nombre
        endLon: parseFloat(dest.lon), // Conversion en nombre
        endPoint: dest.name,
        price: price,
        numberOfPlaces: numberOfPlaces,
        passengerPhone: passengerPhone,
        departureTime: departureTime
      });
      setOffer(data);
      localStorage.setItem('activeOfferId', data.id);
      setStep('waiting');
    } catch (e: any) {
      console.error("Erreur publication:", e.response?.data);
      alert(e.response?.data?.message || "Erreur lors de la publication de l'offre");
    }
  };

  if (step === 'loading') return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-btn" size={40} /></div>;

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      <div className="w-full lg:w-[450px] bg-background shadow-2xl z-20 flex flex-col border-r border-foreground/5 overflow-y-auto no-scrollbar">
        
        {step === 'search' && (
          <div className="p-6 pb-0 flex justify-end">
            <Link href="/ride/history" className="flex items-center gap-2 px-4 py-2 bg-foreground/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-btn hover:text-white transition-all">
              <History size={14} /> Historique
            </Link>
          </div>
        )}

        <div className="p-6 lg:p-10 flex-1 flex flex-col">
          
          {step !== 'search' && (
            <TripSummary 
              pickup={pickup?.name || offer?.startPoint || ride?.startPoint || "..."} 
              destination={dest?.name || offer?.endPoint || ride?.endPoint || "..."}
              price={price || offer?.price || ride?.price}
            />
          )}

          <AnimatePresence mode="wait">
            {step === 'search' && (
              <RideSearch 
                pickup={pickup} 
                setPickup={setPickup} 
                dest={dest} 
                setDest={setDest} 
                onEstimate={handleEstimate} 
              />
            )}

            {step === 'price' && (
              <RidePriceSetting 
                price={price} 
                setPrice={setPrice}
                passengerPhone={passengerPhone}
                setPassengerPhone={setPassengerPhone}
                departureTime={departureTime}
                setDepartureTime={setDepartureTime}
                numberOfPlaces={numberOfPlaces}
                setNumberOfPlaces={setNumberOfPlaces} 
                onBack={() => setStep('search')} 
                onPublish={handlePublishOffer} 
              />
            )}

            {step === 'waiting' && (
              <RideWaiting 
                offer={offer} 
                onSelectDriver={(id) => rideService.selectDriver(offer.id, id)} 
              />
            )}

            {step === 'active' && (
              <RideActive 
                ride={ride} 
                tracking={tracking} 
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 relative z-0">
        <MapView 
          pickup={pickup || (offer ? { lat: 4.05, lon: 9.70, name: offer.startPoint } : undefined)}
          destination={dest || (offer ? { lat: 4.06, lon: 9.71, name: offer.endPoint } : undefined)}
          partnerPos={tracking ? { lat: tracking.latitude, lon: tracking.longitude } : undefined}
        />
      </div>
    </div>
  );
}