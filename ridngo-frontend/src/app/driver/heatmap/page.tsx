/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { rideService } from '@/lib/rideService';
import { ArrowLeft, Flame, Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/home/MapView'), { ssr: false });

export default function DriverHeatmapPage() {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrajectories = async () => {
      try {
        const data = await rideService.getMyTrajectories();
        
        // On extrait et on aplatit toutes les coordonnées JSON des segments
        const allCoords = data.flatMap(t => {
          try {
            return JSON.parse(t.trajectoryDataJson);
          } catch (e) {
            return [];
          }
        });
        
        setPoints(allCoords);
      } catch (e) {
        console.error("Erreur chargement trajectoires", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTrajectories();
  }, []);

  return (
    <main className="h-screen flex flex-col text-foreground font-sans overflow-hidden">
      {/* HEADER */}
      <div className="p-6 border-b border-foreground/5 bg-background/80 backdrop-blur-md z-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/driver/dashboard" className="p-3 bg-foreground/5 rounded-2xl hover:bg-orange-btn hover:text-white transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter flex items-center gap-2">
              <Flame size={20} className="text-orange-btn animate-pulse" />
              Zones d&apos;Influence
            </h1>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Analyse de vos trajectoires récentes</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-3 bg-orange-btn/10 px-4 py-2 rounded-2xl border border-orange-btn/10 text-orange-btn">
          <Info size={16} />
          <p className="text-[10px] font-black uppercase">Plus la zone est rouge, plus vous y êtes présent</p>
        </div>
      </div>

      {/* MAP ZONE */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 z-30 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
             <Loader2 className="animate-spin text-orange-btn" size={40} />
             <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Génération de la heatmap...</p>
          </div>
        ) : points.length === 0 ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-10 text-center">
            <div className="glass p-10 border-none shadow-2xl bg-background max-w-sm">
               <Info size={40} className="mx-auto mb-4 opacity-20" />
               <p className="font-bold opacity-60">Vous n&apos;avez pas encore assez de données de trajectoire pour générer une carte de chaleur.</p>
               <Link href="/driver/dashboard" className="inline-block mt-6 text-orange-btn font-black text-xs uppercase tracking-widest">Retour au dashboard</Link>
            </div>
          </div>
        ) : null}

        <MapView heatmapPoints={points} />
      </div>
    </main>
  );
}