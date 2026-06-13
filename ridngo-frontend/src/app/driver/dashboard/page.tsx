/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { rideService } from '@/lib/rideService';
import { driverService } from '@/lib/driverService';
import { 
  Loader2, ArrowUp, Clock, Radar, MapPinOff, 
  LayoutList, LayoutGrid, ArrowDownCircle, MapPin, ChevronRight
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '@/lib/api-client';

// Composants existants
import { OfferCard } from './components/OfferCard';
import { LocationFilterModal } from './components/LocationFilterModal';
import { Pagination } from './components/Pagination';
import { ActivityBanner } from './components/ActivityBanner';
import { IdentityCard } from './components/IdentityCard';
import { WalletCard } from './components/WalletCard';
import { SecondaryNav } from './components/SecondaryNav';
import { RadarControls } from './components/RadarControls'; // Sera surchargé localement si besoin ou props ajoutées
import { DriverAnalytics } from './components/DriverAnalytics';
import Link from 'next/link';

// --- NOUVEAU COMPOSANT : CARTE COMPACTE ---
const CompactOfferCard = ({ offer }: { offer: any }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="glass p-4 rounded-2xl flex items-center justify-between border border-white/5 hover:bg-white/5 transition-colors group"
  >
    <div className="flex items-center gap-4 overflow-hidden">
      <div className="flex flex-col gap-1 min-w-0">
         <div className="flex items-center gap-2 text-foreground">
            <MapPin size={14} className="text-orange-btn shrink-0" />
            <span className="font-bold text-sm truncate">{offer.startPoint}</span>
         </div>
         <div className="w-[2px] h-3 bg-white/10 ml-[6px] rounded-full"></div>
         <div className="flex items-center gap-2 text-foreground/60">
            <MapPin size={14} className="shrink-0" />
            <span className="font-medium text-xs truncate">{offer.endPoint}</span>
         </div>
      </div>
    </div>

    <div className="flex items-center gap-4 shrink-0 pl-4 border-l border-white/5">
       <div className="text-right">
          <p className="font-black text-lg text-orange-btn">{offer.price?.toLocaleString()} <span className="text-[10px]">FCFA</span></p>
          <p className="text-[10px] opacity-50">{offer.distance ? `${offer.distance} km` : ''}</p>
       </div>
       <button className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center group-hover:bg-orange-btn group-hover:text-white transition-colors">
          <Link href={`/driver/offers/${offer.id}`} >
            <ChevronRight size={20} />
          </Link>          
       </button>
    </div>
  </motion.div>
);

const ITEMS_PER_PAGE = 9;
type SortMode = 'recent' | 'price_desc' | 'price_asc';
type ViewMode = 'grid' | 'list';

export default function DriverDashboard() {
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // États UI
  const [currentPage, setCurrentPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortMode>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid'); // Nouveau state
  
  // Filtres
  const [modalType, setModalType] = useState<'departure' | 'arrival' | null>(null);
  const [depFilter, setDepFilter] = useState<string | null>(null);
  const [arrFilter, setArrFilter] = useState<string | null>(null);

  // Ref pour le scroll
  const radarSectionRef = useRef<HTMLDivElement>(null);

  // --- INITIALISATION ---
  useEffect(() => { loadData(); }, []);

  // --- POLLING STABILISÉ ---
  useEffect(() => {
    let interval: any;
    if (fullProfile?.driver?.isOnline) {
      fetchOffers(); // Premier appel
      interval = setInterval(fetchOffers, 5000);
    } else {
      setOffers([]);
    }
    return () => clearInterval(interval);
  }, [fullProfile?.driver?.isOnline]);

  // --- GÉOLOCALISATION ---
  useEffect(() => {
    if (!fullProfile?.driver?.isOnline) return;
    const geoInterval = setInterval(() => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => rideService.updateLocation(pos.coords.latitude, pos.coords.longitude).catch(console.error),
          (err) => console.warn("GPS Error", err),
          { enableHighAccuracy: true }
        );
      }
    }, 2000);
    return () => clearInterval(geoInterval);
  }, [fullProfile?.driver?.isOnline]);

  const loadData = async () => {
    try {
      const [profileRes, activeRide] = await Promise.all([
        api.get('/api/v1/users/me/driver-profile'),
        rideService.getCurrentRide().catch(() => null)
      ]);
      setFullProfile(profileRes.data);
      setCurrentRide(Array.isArray(activeRide) ? activeRide[0] : activeRide);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- FETCH OFFERS AVEC ANTI-SAUT ---
  const fetchOffers = async () => {
    try {
      const data = await rideService.getAvailableOffers(0, 100);
      
      // 1. Déduplication
      const uniqueData = Array.from(new Map(data.map((item: any) => [item.id, item])).values());
      
      // 2. Pré-tri stable pour comparaison (par ID)
      const sortedNewData = (uniqueData as any[]).sort((a, b) => a.id.localeCompare(b.id));

      setOffers(prevOffers => {
        // 3. Comparaison profonde (Deep Compare light sur les IDs et la longueur)
        if (prevOffers.length === sortedNewData.length) {
            const prevIds = [...prevOffers].sort((a,b) => a.id.localeCompare(b.id)).map(o => o.id).join(',');
            const newIds = sortedNewData.map(o => o.id).join(',');
            if (prevIds === newIds) return prevOffers; // Rien n'a changé, on garde la ref mémoire
        }
        return sortedNewData;
      });
    } catch (e) { console.error(e); }
  };

  const toggleStatus = async () => {
    const newStatus = !fullProfile?.driver?.isOnline;
    try {
      await driverService.toggleOnlineStatus(newStatus);
      setFullProfile({ ...fullProfile, driver: { ...fullProfile.driver, isOnline: newStatus } });
      if (newStatus) fetchOffers();
    } catch (e) { alert("Erreur réseau"); }
  };

  // --- SCROLL ACTION ---
  const scrollToRadar = () => {
    radarSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- LOGIQUE DE TRI ET FILTRE (MEMOIZÉE) ---
  const uniqueDeps = useMemo(() => Array.from(new Set(offers.map(o => o.startPoint))), [offers]);
  const uniqueArrs = useMemo(() => Array.from(new Set(offers.map(o => o.endPoint))), [offers]);

  const filteredOffers = useMemo(() => {
    // On travaille sur une COPIE pour ne pas muter l'état
    let list = [...offers];

    // Filtres
    if (depFilter) list = list.filter(o => o.startPoint === depFilter);
    if (arrFilter) list = list.filter(o => o.endPoint === arrFilter);

    // Tri Stable
    list.sort((a, b) => {
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'price_asc') return a.price - b.price;
        
        // Mode 'recent' : Date puis ID pour stabilité absolue
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        if (dateA !== dateB) return dateB - dateA; // Plus récent d'abord
        return a.id.localeCompare(b.id); // Fallback stable
    });

    return list;
  }, [offers, depFilter, arrFilter, sortBy]);

  const paginatedOffers = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return filteredOffers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOffers, currentPage]);

  const totalPages = Math.ceil(filteredOffers.length / ITEMS_PER_PAGE);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="animate-spin text-orange-btn" size={40} />
      <p className="text-xs font-black uppercase tracking-widest opacity-50">Chargement...</p>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 pb-32 font-sans text-foreground bg-background">
      
      {/* --- BANNIÈRE COURSE ACTIVE --- */}
      <AnimatePresence>
        {currentRide && <div className="mb-6"><ActivityBanner currentRide={currentRide} /></div>}
      </AnimatePresence>

      {/* --- HEADER BOUTON RACCOURCI (NOUVEAU) --- */}
      <div className="flex justify-end max-w-6xl mx-auto">
         <button 
            onClick={scrollToRadar}
            className="flex items-center gap-2 bg-orange-btn/10 text-orange-btn px-4 py-2 rounded-full hover:bg-orange-btn hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-orange-btn/20"
         >
            Voir les demandes ({filteredOffers.length})
            <ArrowDownCircle size={16} />
         </button>
      </div>

      {/* --- CARTES PRINCIPALES --- */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-stretch">
        <IdentityCard 
          user={fullProfile?.user} 
          driver={fullProfile?.driver} 
          vehicle={fullProfile?.vehicle} 
          toggleStatus={toggleStatus} 
        />
        <WalletCard balance={fullProfile?.wallet?.balance} />
      </div>

      {/* --- GRAPHIQUES --- */}
      <DriverAnalytics />

      {/* --- NAVIGATION SECONDAIRE --- */}
      <SecondaryNav vehicle={fullProfile?.vehicle} driver={fullProfile?.driver} />

      {/* --- SECTION RADAR (REF POUR SCROLL) --- */}
      <div ref={radarSectionRef} className="max-w-6xl mx-auto space-y-6 pt-8 border-t border-white/5 scroll-mt-24">
        
        {/* CONTROLES AVEC SELECTEUR DE VUE (SURCHARGE/EXTENSION) */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
             {/* On réutilise RadarControls pour la gauche */}
             <div className="flex-1">
                <RadarControls 
                  isOnline={fullProfile?.driver?.isOnline}
                  filteredCount={filteredOffers.length}
                  sortBy={sortBy}
                  togglePriceSort={() => {
                      if (sortBy === 'price_desc') setSortBy('price_asc');
                      else if (sortBy === 'price_asc') setSortBy('recent');
                      else setSortBy('price_desc');
                      setCurrentPage(0);
                  }}
                  setModalType={setModalType}
                  depFilter={depFilter}
                  arrFilter={arrFilter}
                  resetFilters={() => { setDepFilter(null); setArrFilter(null); setCurrentPage(0); }}
                  modalType={modalType}
                />
             </div>

             {/* NOUVEAU : Toggle Grid/List */}
             {fullProfile?.driver?.isOnline && (
                 <div className="flex bg-foreground/5 p-1 rounded-xl self-start xl:self-center">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-orange-btn text-white shadow-lg' : 'text-foreground/50 hover:text-foreground'}`}
                        title="Vue Grille"
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-orange-btn text-white shadow-lg' : 'text-foreground/50 hover:text-foreground'}`}
                        title="Vue Liste"
                    >
                        <LayoutList size={18} />
                    </button>
                 </div>
             )}
        </div>

        {/* --- CONTENU DES OFFRES --- */}
        <div className={`min-h-[300px] ${viewMode === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
          
          {!fullProfile?.driver?.isOnline ? (
             <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30 gap-4">
                <MapPinOff size={50} />
                <p className="font-black uppercase tracking-widest text-sm">Radar désactivé</p>
             </div>
          ) : paginatedOffers.length === 0 ? (
             <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-40 gap-4">
                <Radar size={50} className="animate-spin-slow text-orange-btn" />
                <p className="font-black uppercase tracking-widest text-sm">Recherche en cours...</p>
             </div>
          ) : (
            <>
              <AnimatePresence mode='popLayout'>
                {paginatedOffers.map((offer) => (
                    viewMode === 'grid' ? (
                        <OfferCard key={offer.id} offer={offer} />
                    ) : (
                        <CompactOfferCard key={offer.id} offer={offer} />
                    )
                ))}
              </AnimatePresence>
              
              {/* Pagination (centrée en bas) */}
              <div className="col-span-full pt-4">
                <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={setCurrentPage} 
                />
              </div>
            </>
          )}
        </div>
      </div>

      <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="fixed bottom-8 right-8 w-12 h-12 glass rounded-2xl flex items-center justify-center hover:bg-orange-btn hover:text-white transition-all shadow-xl z-50">
         <ArrowUp size={24} />
      </button>

      {/* MODALES */}
      <LocationFilterModal isOpen={modalType === 'departure'} onClose={() => setModalType(null)} locations={uniqueDeps} onSelect={(loc: string) => { setDepFilter(loc); setCurrentPage(0); }} title="Départ" />
      <LocationFilterModal isOpen={modalType === 'arrival'} onClose={() => setModalType(null)} locations={uniqueArrs} onSelect={(loc: string) => { setArrFilter(loc); setCurrentPage(0); }} title="Destination" />

      <style jsx global>{`
        .animate-spin-slow { animation: spin 4s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}