/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React from 'react';
import Link from 'next/link';
import { 
  Car, 
  History, 
  Flame, 
  ChevronRight, 
  Gauge, 
  Map, 
  ShieldCheck, 
  Star,
  Activity
} from 'lucide-react';

interface SecondaryNavProps {
  vehicle: any;
  driver: any;
}

export const SecondaryNav = ({ vehicle, driver }: SecondaryNavProps) => {
  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
       
       {/* PANNEAU VÉHICULE - Détails techniques réels */}
       <Link href="/driver/vehicle" className="glass p-6 border-none bg-background/40 hover:bg-background/60 shadow-xl transition-all group rounded-[32px] flex flex-col gap-5 border border-white/10">
          <div className="flex justify-between items-center">
             <div className="p-3 bg-orange-btn/10 rounded-2xl text-orange-btn group-hover:scale-110 transition-transform">
                <Car size={24} />
             </div>
             {driver?.isProfileValidated && (
                <div className="flex items-center gap-1.5 bg-green-500/10 text-green-500 px-3 py-1 rounded-full border border-green-500/20">
                   <ShieldCheck size={12} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Vérifié</span>
                </div>
             )}
          </div>
          <div>
              <h3 className="text-lg font-black tracking-tight text-foreground">Mon Véhicule</h3>
              <p className="text-[10px] font-bold opacity-40 uppercase mb-4">
                {vehicle ? `${vehicle.brand} ${vehicle.modelName || ''}` : "Aucun véhicule enregistré"}
              </p>
              
              {vehicle ? (
                <div className="space-y-3">
                   <div className="flex items-center justify-between p-3 bg-foreground/5 rounded-2xl border border-foreground/5">
                      <div className="flex items-center gap-2">
                         <Gauge size={14} className="opacity-30 text-orange-btn" />
                         <span className="text-[11px] font-bold text-foreground">{vehicle.registrationNumber}</span>
                      </div>
                      <ChevronRight size={14} className="opacity-20 group-hover:translate-x-1 transition-transform" />
                   </div>
                   <div className="flex gap-2">
                      <span className="text-[8px] font-black uppercase px-2 py-1 bg-foreground/5 rounded-md opacity-60">
                        {vehicle.fuelTypeName || vehicle.fuelType || 'Essence'}
                      </span>
                      <span className="text-[8px] font-black uppercase px-2 py-1 bg-foreground/5 rounded-md opacity-60">
                        {vehicle.totalSeatNumber || 4} Places
                      </span>
                   </div>
                </div>
              ) : (
                <div className="p-3 bg-orange-btn/5 border border-dashed border-orange-btn/20 rounded-2xl text-center">
                   <p className="text-[10px] font-black text-orange-btn uppercase">Action requise</p>
                </div>
              )}
          </div>
       </Link>

       {/* PANNEAU PERFORMANCE - Statistiques réelles du driver */}
       <Link href="/driver/history" className="glass p-6 border-none bg-background/40 hover:bg-background/60 shadow-xl transition-all group rounded-[32px] flex flex-col gap-5 border border-white/10">
          <div className="flex justify-between items-center">
             <div className="p-3 bg-foreground/5 rounded-2xl group-hover:-rotate-12 transition-transform">
                <History size={24} />
             </div>
             <div className="flex items-center gap-1 text-orange-btn">
                <Star size={12} className="fill-orange-btn" />
                <span className="text-[10px] font-black">{driver?.rating?.toFixed(1) || '0.0'}</span>
             </div>
          </div>
          <div>
              <h3 className="text-lg font-black tracking-tight text-foreground">Performance</h3>
              <p className="text-[10px] font-bold opacity-40 uppercase mb-4">Activité sur la plateforme</p>
              
              <div className="grid grid-cols-2 gap-2">
                 <div className="bg-foreground/5 p-3 rounded-2xl">
                    <p className="text-[8px] font-black opacity-40 uppercase mb-1">Avis Reçus</p>
                    <p className="text-sm font-black text-foreground">{driver?.totalReviewsCount || 0}</p>
                 </div>
                 <div className="bg-orange-btn/5 p-3 rounded-2xl border border-orange-btn/10">
                    <p className="text-[8px] font-black text-orange-btn uppercase mb-1">Expérience</p>
                    <p className="text-sm font-black text-orange-btn">PRO</p>
                 </div>
              </div>
          </div>
       </Link>

       {/* PANNEAU HEATMAP - Données de trajectoire réelles */}
       <Link href="/driver/heatmap" className="glass p-6 border-none bg-background/40 hover:bg-background/60 shadow-xl transition-all group rounded-[32px] flex flex-col gap-5 border border-white/10">
          <div className="flex justify-between items-center">
             <div className="p-3 bg-orange-btn text-white rounded-2xl group-hover:scale-110 transition-transform shadow-lg shadow-orange-btn/20">
                <Flame size={24} />
             </div>
             <div className="flex items-center gap-2">
                <Activity size={14} className={driver?.isOnline ? "text-green-500 animate-pulse" : "opacity-20"} />
                <span className="text-[9px] font-black uppercase opacity-40">Analyse GPS</span>
             </div>
          </div>
          <div>
              <h3 className="text-lg font-black tracking-tight text-foreground">Zones d&apos;Influence</h3>
              <p className="text-[10px] font-bold opacity-40 uppercase mb-4">Analyse spatiale</p>
              
              <div className="bg-foreground/5 p-4 rounded-2xl flex items-center gap-4 group-hover:bg-orange-btn/5 transition-colors">
                 <Map className="text-orange-btn" size={20} />
                 <div>
                    <p className="text-[10px] font-black leading-tight text-foreground">Historique de mobilité</p>
                    <p className="text-[9px] font-bold opacity-40">Visualisez vos trajets habituels</p>
                 </div>
              </div>
          </div>
       </Link>
    </div>
  );
};