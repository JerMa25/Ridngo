/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React from 'react';
import { motion } from 'framer-motion';
import { Navigation, MapPin } from 'lucide-react';
import { LocationInput } from '@/components/home/LocationInput';

interface Props {
  pickup: any;
  setPickup: (val: any) => void;
  dest: any;
  setDest: (val: any) => void;
  onEstimate: () => void;
}

export const RideSearch = ({ pickup, setPickup, dest, setDest, onEstimate }: Props) => (
  <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
    <div className="mb-8">
      <h1 className="text-4xl font-black italic tracking-tighter">Où allez-vous ?</h1>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mt-1">Simulez votre trajet en temps réel</p>
    </div>

    <div className="space-y-4">
      {/* ON ACTIVE LE GPS ICI */}
      <LocationInput 
        placeholder="Lieu de départ" 
        value={pickup?.name} 
        icon={<Navigation size={20}/>} 
        onSelect={setPickup} 
        showGPS={true} 
      />

      <LocationInput 
        placeholder="Destination finale" 
        value={dest?.name} 
        icon={<MapPin size={20}/>} 
        onSelect={setDest} 
        showGPS={false}
      />
    </div>

    <button 
      onClick={onEstimate} 
      disabled={!pickup || !dest} 
      className="w-full py-6 bg-orange-btn text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-orange-btn/20 hover:scale-[1.01] active:scale-95 transition-all mt-4"
    >
      Estimer le prix
    </button>
  </motion.div>
);