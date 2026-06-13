/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState } from 'react';
import { X, Search, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LocationFilterModal = ({ isOpen, onClose, locations, onSelect, title }: any) => {
  const [query, setQuery] = useState("");
  
  const filtered = locations.filter((l: string) => 
    l.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass max-w-md w-full max-h-[70vh] flex flex-col p-6 relative z-10 border-none bg-background shadow-2xl rounded-[40px]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black uppercase text-sm tracking-widest">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
          <input 
            autoFocus
            className="w-full bg-foreground/5 p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-orange-btn font-bold text-sm"
            placeholder="Rechercher un lieu..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
          <button onClick={() => { onSelect(null); onClose(); }} className="w-full text-left p-4 rounded-xl hover:bg-orange-btn hover:text-white transition-all text-xs font-black uppercase opacity-60">
            Tous les lieux
          </button>
          {filtered.map((loc: string, i: number) => (
            <button key={i} onClick={() => { onSelect(loc); onClose(); }} className="w-full text-left p-4 rounded-xl hover:bg-foreground/5 transition-all flex items-center gap-3">
              <MapPin size={14} className="text-orange-btn" />
              <span className="text-sm font-bold truncate">{loc}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};