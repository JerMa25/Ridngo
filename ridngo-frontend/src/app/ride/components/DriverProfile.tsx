/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, XCircle, Star, Phone, Car, UserCircle } from 'lucide-react';

/**
 * DriverProfilePopup
 * ------------------
 * Popup d'affichage du profil complet d'un chauffeur.
 * Appelé depuis BidCard dans RideWaiting.tsx.
 *
 * Props :
 *   profile  — objet FullDriverProfileResponse ({ user, driver, vehicle })
 *   onClose  — fonction pour fermer le popup
 *
 * Pour modifier l'apparence ou le contenu, éditez uniquement ce fichier.
 */

interface DriverProfilePopupProps {
  profile: any;
  onClose: () => void;
}

export default function DriverProfilePopup({ profile, onClose }: DriverProfilePopupProps) {
  const driverUser = profile?.user;
  const driverStats = profile?.driver;
  const vehicle = profile?.vehicle;
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const averageRating =
  reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

useEffect(() => {
  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/v1/reviews/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`, // adapte si besoin
        },
      });

      const data = await res.json();
      setReviews(data);
    } catch (err) {
      console.error("Erreur récupération reviews", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  fetchReviews();
}, []);

  return (
    <AnimatePresence>
      {/* ── Overlay ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        onClick={onClose}
      >
        {/* Fond flouté */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        {/* ── Carte ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-xs bg-background rounded-[28px] shadow-2xl border border-foreground/10 overflow-hidden"
        >
          {/* Bande accent en haut — couleur de l'app */}
          {/*<div className="h-1.5 w-full bg-orange-btn" />*/}

          <div className="p-5 flex flex-col items-center gap-4">

            {/* ── Bouton fermeture ── */}
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="absolute top-4 right-4 p-1.5 rounded-full bg-foreground/5 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <XCircle size={16} className="opacity-50" />
            </button>

            {/* ── Photo ── */}
            <div className="w-16 h-16 rounded-2xl bg-orange-btn flex items-center justify-center overflow-hidden shadow-lg border-2 border-background">
              {driverUser?.photoUri ? (
                <img
                  src={driverUser.photoUri}
                  className="w-full h-full object-cover"
                  alt={`${driverUser?.firstName} ${driverUser?.lastName}`}
                />
              ) : (
                <User size={28} className="text-white" />
              )}
            </div>

            {/* ── Séparateur ── */}
            <div className="w-full h-px bg-foreground/5" />
            <div className="w-full grid grid-cols-2 gap-3">


            <InfoRow
              icon={<User size={14} className="text-orange-btn" />}
              label="Nom"
              value={driverUser?.firstName || "—"}
            />

            <InfoRow
              icon={<UserCircle size={14} className="text-orange-btn" />}
              label="Prénom"
              value={driverUser?.lastName || "—"}
            />

            {/* ── Téléphone ── */}
            <InfoRow
              icon={<Phone size={14} className="text-orange-btn" />}
              label="Téléphone"
              value={driverUser?.telephone || "—"}
            />

            {/* ── Véhicule ── */}
            <InfoRow
              icon={<Car size={14} className="text-orange-btn" />}
              label="Véhicule"
              value={`${vehicle?.brand || ""} ${vehicle?.modelName || ""}`.trim() || "—"}
              sub={vehicle?.registrationNumber}
            />

            
          </div>

          < div className="flex items-center gap-2">
                <StarRating rating={averageRating} />
                <span className="text-[10px] opacity-50">
                  {averageRating.toFixed(1)}
                </span>
          </div>


          {/* ── Reviews ── */}
          <div className="w-full mt-4">

            <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-2">
              Avis passagers
            </p>

            {loadingReviews ? (
              <p className="text-xs opacity-50">Chargement...</p>

            ) : reviews.length === 0 ? (
              <p className="text-xs opacity-50 italic">
                Aucun commentaire pour le moment.
              </p>

            ) : (
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                {reviews.map((review) => (
                  <div
                    key={review.reviewId}
                    className="bg-foreground/5 rounded-xl p-2 flex gap-2"
                  >
                    {/* Photo */}
                    <img
                      src={review.passengerPhoto || "/default-avatar.png"}
                      className="w-8 h-8 rounded-lg object-cover"
                    />

                    {/* Contenu */}
                    <div className="flex-1">

                      <p className="text-xs font-bold">
                        {review.passengerName}
                      </p>

                      {/* Rating */}
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={
                              i < review.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "opacity-20"
                            }
                          />
                        ))}
                      </div>

                      {/* Commentaire */}
                      <p className="text-[11px] opacity-70 mt-1">
                        {review.comment}
                      </p>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * InfoRow — ligne réutilisable icon + label + valeur
 * Modifiable ici pour changer la présentation de chaque info.
 */
function InfoRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="w-full flex items-center gap-3 px-1">
      <div className="w-8 h-8 rounded-xl bg-orange-btn/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase opacity-30 tracking-widest">{label}</p>
        <p className="text-xs font-bold text-foreground">{value}</p>
        {sub && (
          <p className="text-[10px] font-bold opacity-40 tracking-widest uppercase mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => {
        const isFull = rating >= i + 1;
        const isHalf = rating >= i + 0.5 && rating < i + 1;

        return (
          <div key={i} className="relative w-4 h-4">
            {/* étoile vide */}
            <Star size={16} className="absolute text-gray-300" />

            {/* étoile pleine */}
            {isFull && (
              <Star size={16} className="absolute text-yellow-400 fill-yellow-400" />
            )}

            {/* demi étoile */}
            {isHalf && (
              <div className="absolute overflow-hidden w-1/2">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}