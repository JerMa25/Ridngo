"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarDays,
  Car,
  Clock3,
  History as HistoryIcon,
  Loader2,
  MapPin,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api-client';
import { rideService } from '@/lib/rideService';
import { RideWaiting } from '@/app/ride/components/RideWaiting';

type ViewMode = 'current' | 'history';

type StoredOffer = {
  id: string;
  state: string;
  createdAt: string;
  startPoint: string;
  endPoint: string;
  price: number;
  numberOfPlaces: number;
  selectedDriverId?: string;
  selectedDriverName?: string;
};

const STORAGE_KEY = 'myOffersHistory';

const readStoredOffers = (): StoredOffer[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeStoredOffers = (offers: StoredOffer[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  }
};

const sortOffers = (offers: StoredOffer[]) =>
  [...offers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const upsertStoredOffer = (offerData: any, existing: StoredOffer[]) => {
  const formattedOffer: StoredOffer = {
    id: offerData.id,
    state: offerData.state || 'PENDING',
    createdAt: offerData.createdAt || new Date().toISOString(),
    startPoint: offerData.startPoint || '—',
    endPoint: offerData.endPoint || '—',
    price: offerData.price || 0,
    numberOfPlaces: offerData.numberOfPlaces || 1,
    selectedDriverId: offerData.selectedDriverId,
    selectedDriverName: offerData.bids?.find((bid: any) => bid.driverId === offerData.selectedDriverId)?.driverName || undefined,
  };

  const index = existing.findIndex((item) => item.id === offerData.id);
  const next = [...existing];
  if (index >= 0) {
    next[index] = formattedOffer;
  } else {
    next.unshift(formattedOffer);
  }

  writeStoredOffers(next);
  return next;
};

export default function OffersPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('current');
  const [offer, setOffer] = useState<any>(null);
  const [history, setHistory] = useState<StoredOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && !localStorage.getItem('accessToken')) {
        router.replace('/login');
        return;
      }

      const storedOffers = sortOffers(readStoredOffers());
      setHistory(storedOffers);

      const savedOfferId = localStorage.getItem('activeOfferId');
      if (!savedOfferId) {
        setLoading(false);
        return;
      }

      try {
        const offerData = await rideService.getOfferBids(savedOfferId);
        if (offerData?.id) {
          setOffer(offerData);
          setHistory(sortOffers(upsertStoredOffer(offerData, storedOffers)));
        }
      } catch (error) {
        console.error('Erreur chargement offre courante', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    if (!offer?.id) return;

    const interval = window.setInterval(async () => {
      try {
        const refreshed = await rideService.getOfferBids(offer.id);
        setOffer(refreshed);
        setHistory(sortOffers(upsertStoredOffer(refreshed, readStoredOffers())));
      } catch (error) {
        console.error('Erreur rafraîchissement offre', error);
      }
    }, 4000);

    return () => window.clearInterval(interval);
  }, [offer?.id]);

  const handleSelectDriver = async (driverId: string) => {
    if (!offer?.id) return;

    try {
      const updated = await rideService.selectDriver(offer.id, driverId);
      setOffer(updated);
      setHistory(sortOffers(upsertStoredOffer(updated, readStoredOffers())));
      toast.success('Chauffeur sélectionné avec succès');
    } catch (error) {
      console.error('Erreur sélection chauffeur', error);
      toast.error('Impossible de sélectionner ce chauffeur');
    }
  };

  const handleCancelOffer = async () => {
    if (!offer?.id) return;
    /*const confirmed = window.confirm('Voulez-vous vraiment annuler cette offre ?');
    if (!confirmed) return;*/
    const confirmToast = () =>
    new Promise<boolean>((resolve) => {
      toast((t) => (
        <div className="flex flex-col gap-3">
          <p>Voulez-vous vraiment annulerrr cette offre ?</p>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="px-3 py-1 rounded-lg border"
            >
              Cancel
            </button>

            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="px-3 py-1 rounded-lg bg-red-500 text-white"
            >
              Yes
            </button>
          </div>
        </div>
      ), {
        duration: Infinity,
      });
    });
    const confirmed = await confirmToast();
    if (!confirmed) return;

    setIsCancelling(true);
    try {
      await api.delete(`/api/v1/offers/${offer.id}`);
      localStorage.removeItem('activeOfferId');

      const nextHistory = readStoredOffers().map((item) =>
        item.id === offer.id ? { ...item, state: 'CANCELLED' } : item
      );
      writeStoredOffers(nextHistory);
      setHistory(sortOffers(nextHistory));
      setOffer(null);
      toast.success('Offre annulée');
    } catch (error) {
      console.error('Erreur annulation offre', error);
      toast.error('Impossible d’annuler cette offre');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-foreground/70">
          <Loader2 className="animate-spin text-orange-btn" size={36} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Chargement de vos offres…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 transition hover:bg-orange-btn hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">Passager</p>
              <h1 className="text-3xl font-black tracking-tighter md:text-4xl">Mes offres</h1>
            </div>
          </div>

          <div className="flex gap-2 rounded-2xl bg-foreground/5 p-1">
            <button
              onClick={() => setView('current')}
              className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] transition ${view === 'current' ? 'bg-orange-btn text-white shadow-lg' : 'text-foreground/50'}`}
            >
              Offre en cours
            </button>
            <button
              onClick={() => setView('history')}
              className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] transition ${view === 'history' ? 'bg-orange-btn text-white shadow-lg' : 'text-foreground/50'}`}
            >
              Historique
            </button>
          </div>
        </div>

        {view === 'current' ? (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[36px] border border-foreground/5 bg-background/80 p-6 shadow-xl backdrop-blur"
            >
              {!offer ? (
                <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-foreground/10 bg-foreground/3 p-8 text-center">
                  <Car size={36} className="text-orange-btn/40" />
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Aucune offre en cours</h2>
                    <p className="mt-2 text-sm text-foreground/50">
                      Publiez une nouvelle course depuis la page de réservation pour voir ici le radar et les chauffeurs intéressés.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-btn">Offre active</p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight">{offer.startPoint}</h2>
                      <div className="mt-2 flex items-center gap-2 text-sm text-foreground/60">
                        <MapPin size={14} className="text-orange-btn" />
                        <span>{offer.endPoint}</span>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-orange-btn/10 px-4 py-3 text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-btn/70">Prix</p>
                      <p className="text-2xl font-black text-orange-btn">{offer.price} F</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-foreground/5 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">
                        <CalendarDays size={13} className="text-orange-btn" />
                        Date
                      </div>
                      <p className="mt-2 text-sm font-bold">
                        {offer.departureTime ? new Date(offer.departureTime).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'À définir'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-foreground/5 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">
                        <Users size={13} className="text-orange-btn" />
                        Places
                      </div>
                      <p className="mt-2 text-sm font-bold">{offer.numberOfPlaces}</p>
                    </div>
                    <div className="rounded-2xl bg-foreground/5 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">
                        <ShieldCheck size={13} className="text-orange-btn" />
                        Statut
                      </div>
                      <p className="mt-2 text-sm font-bold">{offer.state === 'VALIDATED' ? 'Validée' : offer.state === 'CANCELLED' ? 'Annulée' : 'En recherche'}</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[28px] border border-foreground/5 bg-foreground/3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-orange-btn/10 p-2 text-orange-btn">
                          <Loader2 className="animate-spin" size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">Radar</p>
                          <p className="text-sm font-bold">Recherche active des chauffeurs</p>
                        </div>
                      </div>
                      <div className="rounded-full bg-orange-btn/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-orange-btn">
                        {offer.bids?.length || 0} proposition(s)
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <RideWaiting offer={offer} onSelectDriver={handleSelectDriver} />
                  </div>

                  <button
                    onClick={handleCancelOffer}
                    disabled={isCancelling}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-red-500 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    {isCancelling ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
                    Annuler l’offre
                  </button>
                </>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-[36px] border border-foreground/5 bg-background/80 p-6 shadow-xl backdrop-blur"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">Aide rapide</p>
                  <h3 className="text-xl font-black tracking-tight">Ce que vous pouvez faire</h3>
                </div>
                <div className="rounded-2xl bg-foreground/5 p-3 text-orange-btn">
                  <Clock3 size={18} />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-foreground/5 bg-foreground/3 p-4">
                  <p className="text-sm font-black">1. Suivez le radar</p>
                  <p className="mt-1 text-sm text-foreground/55">Les chauffeurs qui manifestent leur intérêt apparaissent automatiquement ici.</p>
                </div>
                <div className="rounded-2xl border border-foreground/5 bg-foreground/3 p-4">
                  <p className="text-sm font-black">2. Consultez le profil</p>
                  <p className="mt-1 text-sm text-foreground/55">Vous pouvez ouvrir les informations du chauffeur avant de le valider.</p>
                </div>
                <div className="rounded-2xl border border-foreground/5 bg-foreground/3 p-4">
                  <p className="text-sm font-black">3. Gérez votre historique</p>
                  <p className="mt-1 text-sm text-foreground/55">Chaque offre passée reste accessible depuis l’onglet historique.</p>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="grid gap-4">
            {history.length === 0 ? (
              <div className="rounded-[36px] border border-dashed border-foreground/10 bg-foreground/3 p-12 text-center">
                <HistoryIcon size={30} className="mx-auto text-orange-btn/40" />
                <h2 className="mt-4 text-xl font-black tracking-tight">Aucun historique pour le moment</h2>
                <p className="mt-2 text-sm text-foreground/50">Vos offres passées apparaîtront ici une fois validées ou annulées.</p>
              </div>
            ) : (
              history.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-4xl border border-foreground/5 bg-background/80 p-6 shadow-lg backdrop-blur"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/35">Offre</p>
                      <h3 className="mt-2 text-xl font-black tracking-tight">{item.startPoint}</h3>
                      <div className="mt-2 flex items-center gap-2 text-sm text-foreground/60">
                        <MapPin size={14} className="text-orange-btn" />
                        <span>{item.endPoint}</span>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-orange-btn/10 px-4 py-3 text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-btn/70">Prix</p>
                      <p className="text-xl font-black text-orange-btn">{item.price} F</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-foreground/5 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">
                        <CalendarDays size={13} className="text-orange-btn" />
                        Date
                      </div>
                      <p className="mt-2 text-sm font-bold">{new Date(item.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="rounded-2xl bg-foreground/5 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">
                        <Users size={13} className="text-orange-btn" />
                        Places
                      </div>
                      <p className="mt-2 text-sm font-bold">{item.numberOfPlaces}</p>
                    </div>
                    <div className="rounded-2xl bg-foreground/5 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">
                        <Wallet size={13} className="text-orange-btn" />
                        Chauffeur
                      </div>
                      <p className="mt-2 text-sm font-bold">{item.selectedDriverName || 'En attente'}</p>
                    </div>
                    <div className="rounded-2xl bg-foreground/5 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">
                        <ShieldCheck size={13} className="text-orange-btn" />
                        Statut
                      </div>
                      <p className="mt-2 text-sm font-bold">{item.state === 'VALIDATED' ? 'Validée' : item.state === 'CANCELLED' ? 'Annulée' : 'En recherche'}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
