"use client"
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Minus, Phone, Clock, User as UserIcon, Users } from 'lucide-react';

interface Props {
  price: number;
  setPrice: (val: number) => void;
  passengerPhone: string;
  setPassengerPhone: (val: string) => void;
  departureTime: string;
  setDepartureTime: (val: string) => void;
  numberOfPlaces: number;
  setNumberOfPlaces: (val: number) => void;
  onBack: () => void;
  onPublish: () => void;
}

export const RidePriceSetting = ({ 
  price, setPrice, 
  passengerPhone, setPassengerPhone,
  departureTime, setDepartureTime,
  numberOfPlaces, setNumberOfPlaces,
  onBack, onPublish 
}: Props) => {
  const [isForSelf, setIsForSelf] = useState(true);
  const [myPhone, setMyPhone] = useState("");

  // 1. Récupérer le numéro de l'utilisateur connecté au chargement
  useEffect(() => {
    const stored = localStorage.getItem('user-full') || localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      // Le champ peut s'appeler 'telephone' (user-full) ou 'phone' (objet simplifié)
      const phone = user.telephone || user.phone || "";
      setMyPhone(phone);
      
      // Si on est en mode "Pour moi", on initialise directement le champ global
      if (isForSelf) {
        setPassengerPhone(phone);
      }
    }
  }, []); // Une seule fois au montage

  // 2. Gérer le switch "Pour moi" / "Pour un tiers"
  const handleToggleMode = (self: boolean) => {
    setIsForSelf(self);
    if (self) {
      setPassengerPhone(myPhone); // Remet mon numéro
    } else {
      setPassengerPhone(""); // Vide pour laisser saisir le numéro du tiers
    }
  };

  console.log('phone: ', passengerPhone, ' departureTime: ', departureTime);

  const adjustSeats = (amount: number) => {
    setNumberOfPlaces(
      Math.min(5, Math.max(1, numberOfPlaces + amount))
    );
  };

  const adjustPrice = (amount: number) => {
    const total = price * numberOfPlaces;
    const newTotal = Math.max(100, total + amount); 
    
    const newUnitPrice = newTotal / numberOfPlaces;

    setPrice(newUnitPrice);
  };

  return (
    <motion.div 
      key="price" 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }} 
      className="space-y-6"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-opacity">
        <ArrowLeft size={14}/> Retour
      </button>

      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-black italic tracking-tighter">Finalisez votre offre</h2>
        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Ajustez le prix et le contact</p>
      </div>
      
      {/* SÉLECTEUR DE PRIX */}
      <div className="flex items-center justify-between bg-foreground/5 p-4 rounded-3xl border border-foreground/5">
        <button 
          onClick={() => adjustPrice(-50)} 
          className="w-14 h-14 bg-background rounded-2xl shadow-sm flex items-center justify-center font-bold text-2xl hover:bg-orange-btn hover:text-white transition-all active:scale-90"
        >
          <Minus/>
        </button>
        
        <div className="text-center">
          <input 
            type="number" 
            value={price * numberOfPlaces} 
            onChange={(e) => {
              const total = parseInt(e.target.value || "0");
              setPrice(total);
            }} 
            className="bg-transparent text-4xl font-black text-center w-32 outline-none text-foreground" 
          />
          <p className="text-[9px] font-black text-orange-btn uppercase">FCFA</p>
        </div>
        
        <button 
          onClick={() => adjustPrice(50)} 
          className="w-14 h-14 bg-orange-btn text-white rounded-2xl shadow-md flex items-center justify-center font-bold text-2xl hover:scale-105 transition-all active:scale-90"
        >
          <Plus/>
        </button>
      </div>

      {/* SÉLECTEUR DE PLACES */}
      <div className="flex items-center justify-between bg-foreground/5 p-4 rounded-3xl border border-foreground/5">
        <button 
          onClick={() => adjustSeats(-1)}
          disabled={numberOfPlaces <= 1} 
          className="w-14 h-14 bg-background rounded-2xl shadow-sm flex items-center justify-center font-bold text-2xl hover:bg-orange-btn hover:text-white transition-all active:scale-90"
        >
          <Minus/>
        </button>
        
        <div className="text-center">
          <p className="text-4xl font-black">{numberOfPlaces}</p>
          <p className="text-[9px] font-black text-orange-btn uppercase">
            {numberOfPlaces > 1 ? "places" : "place"}
          </p>
        </div>
        
        <button 
          onClick={() => adjustSeats(1)} 
          disabled={numberOfPlaces >= 5}
          className="w-14 h-14 bg-orange-btn text-white rounded-2xl shadow-md flex items-center justify-center font-bold text-2xl hover:scale-105 transition-all active:scale-90"
        >
          <Plus/>
        </button>
      </div>

      {/* SÉLECTEUR DE MODE (MOI / TIERS) */}
      <div className="space-y-4">
        <div className="flex bg-foreground/5 p-1 rounded-2xl">
           <button 
            type="button"
            onClick={() => handleToggleMode(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isForSelf ? 'bg-background shadow-lg text-orange-btn' : 'opacity-40'}`}
           >
             <UserIcon size={14} /> Pour moi
           </button>
           <button 
            type="button"
            onClick={() => handleToggleMode(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isForSelf ? 'bg-background shadow-lg text-orange-btn' : 'opacity-40'}`}
           >
             <Users size={14} /> Pour un tiers
           </button>
        </div>

        <div className="space-y-3">
          {/* CHAMP TÉLÉPHONE */}
          <div className="relative">
            <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${passengerPhone ? 'text-orange-btn' : 'opacity-20'}`} size={16} />
            <input 
              type="tel" 
              placeholder="Numéro de téléphone (ex: 677...)"
              readOnly={isForSelf}
              value={passengerPhone}
              onChange={(e) => setPassengerPhone(e.target.value)}
              className={`w-full bg-foreground/5 border border-transparent rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-orange-btn text-sm font-bold transition-all ${isForSelf ? 'cursor-not-allowed opacity-60' : ''}`}
            />
          </div>

          {/* CHAMP HEURE DE DÉPART */}
          <div className="relative">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={16} />
            <input 
              type="time" 
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full bg-foreground/5 border border-transparent rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-orange-btn text-sm font-bold transition-all"
            />
            <p className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase opacity-20">Départ</p>
          </div>
        </div>
      </div>

      <button 
        onClick={onPublish} 
        disabled={!passengerPhone || !departureTime}
        className="w-full py-5 bg-foreground text-background dark:bg-white dark:text-bleu-nuit rounded-2xl font-black uppercase tracking-widest hover:bg-orange-btn hover:text-white transition-all shadow-xl disabled:opacity-20"
      >
        Lancer la recherche
      </button>
    </motion.div>
  );
};