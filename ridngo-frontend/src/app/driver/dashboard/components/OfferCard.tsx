/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ChevronRight, User, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export const OfferCard = ({ offer }: { offer: any }) => {
  const router = useRouter();
  return (
  <motion.div 
    layout 
    initial={{ opacity: 0, scale: 0.9 }} 
    animate={{ opacity: 1, scale: 1 }} 
    whileHover={{ y: -5 }} 
    onClick={() => router.push(`/driver/offers/${offer.id}`)}
    role="button"
    tabIndex={0}
    className="glass p-6 border-none bg-background shadow-xl flex flex-col justify-between rounded-4xl relative overflow-hidden group cursor-pointer"
  >
    {/* Flèche d'indication d'action au survol */}
    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
       <ChevronRight className="text-orange-btn" />
    </div>
    
    <div>
      {/* INFOS PASSAGER ET PRIX */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          {/* PHOTO DE PROFIL CLIENT */}
          <div className="w-12 h-12 bg-orange-btn/10 rounded-2xl flex items-center justify-center text-orange-btn overflow-hidden border border-orange-btn/10 shadow-inner">
            {offer.passengerPhoto ? (
              <img 
                src={offer.passengerPhoto} 
                alt={offer.passengerName || "Profil"} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <User size={24} />
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Client</p>
            <p className="text-xs font-bold truncate max-w-25 text-foreground">
              {offer.passengerName || "Anonyme"}
            </p>
          </div>
        </div>

        <div className="text-right">
           <p className="text-[9px] font-black uppercase opacity-30 tracking-widest">Offre</p>
           <span className="text-2xl font-black text-orange-btn italic tracking-tighter">
             {offer.price} F
           </span>
        </div>
      </div>

      {/* HEURE DE DÉPART + NOMBRE DE PLACES */}
      <div className="mb-6 flex items-center justify-between gap-4">
  
        {/* LEFT SIDE */}
        <div className="flex items-center gap-2 bg-foreground/5 border border-foreground/5 rounded-xl px-3 py-1.5">
          <Clock size={14} className="text-orange-btn" />
          <p className="text-[10px] font-black uppercase tracking-tight text-foreground/70">
            Départ :
            <span className="text-foreground ml-1">
              {(() => {
                const t = offer.departureTime;
                if (!t) return 'Dès que possible';
                return t.includes('T') ? t.split('T')[1].slice(0,5) : t;
              })()}
            </span>
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2 bg-foreground/5 border border-foreground/5 rounded-xl px-3 py-1.5">
          <Users size={14} className="text-orange-btn" />
          <p className="text-[10px] font-black uppercase tracking-tight text-foreground/70">
            Nombre de places :
            <span className="text-foreground ml-1">
              {offer?.numberOfPlaces ?? "Non défini"}
            </span>
          </p>
        </div>

      </div>

      {/* ITINÉRAIRE */}
      <div className="space-y-4 mb-8">
        <div className="relative pl-5 border-l border-dashed border-orange-btn/30">
          <div className="absolute -left-1 top-0 w-2 h-2 rounded-full bg-orange-btn" />
          <p className="text-[8px] font-black uppercase opacity-30 tracking-widest mb-0.5">De</p>
          <p className="text-xs font-bold truncate leading-tight text-foreground">{offer.startPoint}</p>
        </div>
        <div className="relative pl-5">
          <div className="absolute -left-1 top-0 w-2 h-2 rounded-full bg-foreground" />
          <p className="text-[8px] font-black uppercase opacity-30 tracking-widest mb-0.5">À</p>
          <p className="text-xs font-bold truncate leading-tight text-foreground">{offer.endPoint}</p>
        </div>
      </div>
    </div>

    {/* BOUTON D'ACTION */}
    <div className="w-full py-4 bg-foreground text-background dark:bg-white dark:text-bleu-nuit rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center transition-all shadow-lg active:scale-95">
      Consulter l&apos;offre
    </div>
  </motion.div>
  );
}