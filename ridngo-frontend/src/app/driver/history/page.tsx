/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState } from 'react';
import { api } from '@/lib/api-client';
import { 
  ArrowLeft, User, Loader2, 
  MapPin, CheckCircle2, Star, ChevronDown, MessageSquareQuote, EyeOff
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

// Interface pour les avis
interface ReviewInfo {
  reviewId: string;
  rideId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  anonymous: boolean;
  passengerName: string;
  passengerPhoto: string | null;
}

/**
 * SOUS-COMPOSANT : Carte de trajet pour le driver
 */
const DriverHistoryCard = ({ ride, idx, review }: { ride: any, idx: number, review?: ReviewInfo }) => {
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(!review?.anonymous);
  const [isCommentExpanded, setIsCommentExpanded] = useState(false);

  useEffect(() => {
    if (review?.anonymous) {
      setLoading(false);
      return;
    }
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
  }, [ride.rideId, review?.anonymous]);

  const commentLength = review?.comment?.length || 0;
  const isLongComment = commentLength > 100;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={12}
        className={`transition-colors ${
          i < rating 
            ? 'text-orange-btn fill-orange-btn' 
            : 'text-foreground/15'
        }`}
      />
    ));
  };

  const showAnonymous = !!review?.anonymous;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
      className="glass p-6 border-none shadow-lg hover:shadow-xl transition-all flex flex-col gap-5 rounded-[32px] overflow-hidden"
    >
      {/* --- LIGNE PRINCIPALE : Infos passager + Trajet + Prix --- */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-foreground/5 rounded-2xl flex items-center justify-center text-orange-btn shadow-inner overflow-hidden">
              {ride.partnerPhoto && !showAnonymous ? (
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
                  {showAnonymous ? "Anonyme" : `${partner?.firstName || ''} ${partner?.lastName || ''}`.trim() || "Passager"}
                </p>
              )}
              <p className="text-[10px] font-bold opacity-40 mt-1 uppercase tracking-tighter">
                 {new Date(ride.createdAt).toLocaleDateString()} • ID #{ride.rideId.slice(0, 5)}
              </p>
           </div>
        </div>

         <div className="mt-2 flex items-center justify-end gap-3 text-[10px] opacity-70">
           <span className="font-black uppercase tracking-widest">Places :</span>
           <span className="font-bold">{ride.numberOfPlaces ?? ride.offer?.numberOfPlaces ?? '—'}</span>
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
      </div>

      {/* --- SECTION AVIS DU PASSAGER --- */}
      {review && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="border-t border-foreground/5 pt-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Étoiles + Note */}
            <div className="flex items-center gap-3 bg-foreground/[0.03] px-4 py-2.5 rounded-xl shrink-0">
              <div className="flex items-center gap-0.5">
                {renderStars(review.rating)}
              </div>
              <div className="flex items-baseline gap-0.5 pl-2 border-l border-foreground/10">
                <span className="text-base font-black text-foreground tracking-tighter">{review.rating}</span>
                <span className="text-[9px] font-bold opacity-30">/5</span>
              </div>
            </div>

            {/* Badge Anonyme si applicable */}
            {review.anonymous && (
              <div className="flex items-center gap-1.5 bg-foreground/5 border border-foreground/10 rounded-xl px-3 py-1.5">
                <EyeOff size={11} className="text-foreground/40" />
                <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Avis anonyme</span>
              </div>
            )}

            {/* Commentaire déroulable */}
            {review.comment ? (
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isCommentExpanded ? 'expanded' : 'collapsed'}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 1 }}
                    className="relative"
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquareQuote size={12} className="text-orange-btn/40 mt-0.5 shrink-0" />
                      <p className={`text-xs leading-relaxed text-foreground/70 font-medium italic ${
                        !isCommentExpanded && isLongComment ? 'line-clamp-2' : ''
                      }`}>
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    </div>

                    {/* Gradient de fondu quand le texte est tronqué */}
                    {!isCommentExpanded && isLongComment && (
                      <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-[var(--glass-bg)] to-transparent pointer-events-none" />
                    )}
                  </motion.div>
                </AnimatePresence>

                {isLongComment && (
                  <button
                    onClick={() => setIsCommentExpanded(!isCommentExpanded)}
                    className="flex items-center gap-1.5 mt-1.5 text-orange-btn hover:text-orange-btn/80 transition-colors"
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {isCommentExpanded ? 'Voir moins' : 'Voir plus'}
                    </span>
                    <ChevronDown 
                      size={10} 
                      className={`transition-transform duration-300 ${isCommentExpanded ? 'rotate-180' : ''}`} 
                    />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 opacity-30">
                <MessageSquareQuote size={10} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Aucun commentaire</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default function HistoryPage() {
  const { data: rides = [], isLoading: ridesLoading } = useQuery({
    queryKey: ['driverHistory'],
    queryFn: async () => {
      const res = await api.get('/api/v1/trips/enriched-history?page=0&size=50');
      return res.data;
    },
  });

  const { data: reviewsMap = new Map(), isLoading: reviewsLoading } = useQuery({
    queryKey: ['driverReviews'],
    queryFn: async () => {
      const reviewsRes = await api.get('/api/v1/reviews/me').catch(() => ({ data: [] }));
      const map = new Map<string, ReviewInfo>();
      (reviewsRes.data as ReviewInfo[]).forEach(review => {
        if (review.rideId) {
          map.set(review.rideId, review);
        }
      });
      return map;
    },
  });

  const loading = ridesLoading || reviewsLoading;

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
            <DriverHistoryCard 
              key={ride.rideId} 
              ride={ride} 
              idx={idx} 
              review={reviewsMap.get(ride.rideId)}
            />
          ))
        )}
      </div>
    </main>
  );
}