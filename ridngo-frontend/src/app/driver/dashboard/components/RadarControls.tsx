/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUp, ArrowDown, Calendar, MapPin, 
  Filter, X, ArrowUpDown, SlidersHorizontal 
} from 'lucide-react';

export const RadarControls = ({ 
  isOnline, filteredCount, sortBy, togglePriceSort, 
  modalType, setModalType, depFilter, arrFilter, resetFilters 
}: any) => {

  const hasFilters = depFilter || arrFilter;

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 px-2 py-4">
      {/* SECTION TITRE & COMPTEUR */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all duration-500 ${
            isOnline ? 'bg-orange-btn text-white shadow-[0_0_30px_rgba(255,140,0,0.3)]' : 'bg-foreground/5 opacity-30'
          }`}>
            <motion.div
              animate={isOnline ? { rotate: 360 } : {}}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            >
              <SlidersHorizontal size={28} />
            </motion.div>
          </div>
          {isOnline && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-btn opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-orange-btn border-4 border-background"></span>
            </span>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tighter italic uppercase leading-none">Scanning Live</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <p className="text-[10px] font-black text-orange-btn uppercase tracking-[0.2em]">
              {isOnline ? `${filteredCount} Demandes à proximité` : "Radar en pause"}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION FILTRES */}
      <AnimatePresence>
        {isOnline && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-wrap items-center gap-3"
          >
            {/* TRI PAR PRIX */}
            <button 
              onClick={togglePriceSort} 
              className={`btn-filter group ${sortBy.includes('price') ? 'active' : ''}`}
            >
              <div className="relative">
                {sortBy === 'price_asc' && <ArrowUp size={16} className="text-white" />}
                {sortBy === 'price_desc' && <ArrowDown size={16} className="text-white" />}
                {sortBy === 'recent' && <Calendar size={16} className="opacity-40 group-hover:opacity-100" />}
              </div>
              <span className="whitespace-nowrap">
                {sortBy === 'price_asc' ? 'Moins cher' : sortBy === 'price_desc' ? 'Plus cher' : 'Plus récents'}
              </span>
            </button>

            <div className="h-8 w-[1px] bg-foreground/10 mx-1 hidden sm:block" />

            {/* FILTRE DÉPART */}
            <button 
              onClick={() => setModalType('departure')} 
              className={`btn-filter ${depFilter ? 'active' : ''}`}
            >
              <MapPin size={16} className={depFilter ? 'text-white' : 'text-orange-btn'} />
              <span className="max-w-[120px] truncate">
                {depFilter || 'Point A'}
              </span>
            </button>

            {/* FILTRE ARRIVÉE */}
            <button 
              onClick={() => setModalType('arrival')} 
              className={`btn-filter ${arrFilter ? 'active' : ''}`}
            >
              <Filter size={16} className={arrFilter ? 'text-white' : 'opacity-40'} />
              <span className="max-w-[120px] truncate">
                {arrFilter || 'Destination'}
              </span>
            </button>

            {/* RESET FILTERS */}
            <AnimatePresence>
              {hasFilters && (
                <motion.button
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 45 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={resetFilters}
                  className="p-4 bg-red-500 text-white rounded-2xl shadow-xl hover:bg-red-600 transition-colors flex items-center justify-center"
                  title="Réinitialiser"
                >
                  <X size={18} strokeWidth={3} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};