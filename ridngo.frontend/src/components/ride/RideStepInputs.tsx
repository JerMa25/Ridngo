/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import { LocationInput } from '@/components/home/LocationInput';

interface Props {
  pickup: { name: string; lat: string; lon: string };
  setPickup: (val: any) => void;
  destination: { name: string; lat: string; lon: string };
  setDestination: (val: any) => void;
  onEstimate: () => void;
}

export const RideStepInputs = ({ pickup, setPickup, destination, setDestination, onEstimate }: Props) => {
  const [activeField, setActiveField] = useState<'pickup' | 'dest' | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }} 
      className="flex flex-col h-full"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2 text-foreground">Où allez-vous ?</h1>
        <p className="text-sm opacity-50 font-medium">Saisissez vos adresses pour obtenir une estimation.</p>
      </div>

      <div className="space-y-4 mb-8">
        <LocationInput 
          placeholder="Lieu de prise en charge"
          icon={<MapPin size={20} />}
          value={pickup.name}
          onSelect={setPickup}
          onFocus={() => setActiveField('pickup')}
        />
        <LocationInput 
          placeholder="Destination finale"
          icon={<Navigation size={20} />}
          value={destination.name}
          onSelect={setDestination}
          onFocus={() => setActiveField('dest')}
        />
      </div>

      <div className="mt-auto pt-6">
        <button 
          onClick={onEstimate} 
          disabled={!pickup.name || !destination.name} 
          className="w-full bg-orange-btn text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-orange-btn/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:grayscale transition-all uppercase tracking-widest"
        >
          Voir les prix
        </button>
      </div>
    </motion.div>
  );
};