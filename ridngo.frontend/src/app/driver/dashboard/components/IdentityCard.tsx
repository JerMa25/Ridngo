/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React from 'react';
import { Radar, Power, ShieldCheck, Star, CheckCircle2, Zap, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const IdentityCard = ({ user, driver, vehicle, toggleStatus }: any) => {
  const isOnline = driver?.isOnline;

  return (
    <div className="lg:col-span-2 relative group h-full">
      {/* Aura plus discrète */}
      <div className={`absolute -inset-0.5 rounded-[32px] blur-xl opacity-20 transition-all duration-1000 ${
        isOnline ? 'bg-orange-btn' : 'bg-red-500'
      }`} />

      {/* Padding réduit de p-10 à p-5/p-6 */}
      <div className="relative glass h-full p-5 md:p-6 border-none flex flex-col md:flex-row items-center gap-6 bg-background/60 shadow-2xl rounded-[30px] overflow-hidden justify-between">
        
        {/* Radar réduit */}
        <div className="absolute -right-6 -top-6 p-8 opacity-[0.05] pointer-events-none rotate-12">
           <Radar size={180} className={isOnline ? 'animate-spin' : ''} style={{ animationDuration: '10s' }} />
        </div>

        {/* SECTION GAUCHE : AVATAR & INFO */}
        <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
          <div className="relative group/avatar flex-shrink-0">
            {/* Anneau réduit */}
            <AnimatePresence>
              {isOnline && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 rounded-[28px] border border-orange-btn"
                />
              )}
            </AnimatePresence>

            {/* Avatar réduit (w-32 -> w-20) */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[24px] bg-foreground/5 p-1 relative z-10">
              <div className="w-full h-full rounded-[20px] overflow-hidden bg-orange-btn flex items-center justify-center border-2 border-background shadow-inner">
                {user?.photoUri ? (
                  <img src={user.photoUri} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <span className="text-3xl font-black text-white">{user?.name?.[0]}</span>
                )}
              </div>
            </div>

            {/* Badge statut réduit */}
            <motion.div 
              initial={false}
              animate={{ backgroundColor: isOnline ? '#22c55e' : '#ef4444' }}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border-2 border-background z-20 text-white"
            >
               <Power size={14} className={isOnline ? 'animate-pulse' : ''} />
            </motion.div>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tighter text-foreground italic leading-none">
                {user?.name?.split(' ')[0]} <span className="text-orange-btn">{user?.name?.split(' ')[1]}</span>
              </h1>
              {driver?.isSyndicated && (
                <ShieldCheck size={16} className="text-blue-500" />
              )}
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">
               {driver?.licenseNumber || 'ID-VÉRIFIÉ'}
            </p>

            {/* Mini-Stats intégrées horizontalement */}
            <div className="flex gap-3 mt-1">
                <div className="flex items-center gap-1.5 bg-foreground/5 px-2 py-1 rounded-lg">
                    <Star size={10} className="fill-orange-btn text-orange-btn" />
                    <span className="text-xs font-black">{driver?.rating?.toFixed(1) || '5.0'}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-foreground/5 px-2 py-1 rounded-lg">
                    <CheckCircle2 size={10} className="text-green-500" />
                    <span className="text-xs font-black">{driver?.totalReviewsCount || 0} Avis</span>
                </div>
            </div>
          </div>
        </div>

        {/* SECTION DROITE : BOUTON COMPACT */}
        <div className="w-full md:w-auto relative z-10 flex-shrink-0">
           <button 
              onClick={toggleStatus} 
              className={`w-full md:w-auto group relative px-6 py-4 md:px-8 md:py-4 rounded-[20px] font-black text-[10px] md:text-xs uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 overflow-hidden ${
                isOnline 
                ? 'bg-foreground text-background hover:bg-red-500 hover:text-white' 
                : 'bg-orange-btn text-white shadow-orange-btn/20 hover:shadow-orange-btn/40'
              }`}
           >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isOnline ? (
                  <>STOP <ShieldAlert size={16}/> </>
                ) : (
                  <>GO <Zap size={16} className="fill-white" /> </>
                )}
              </span>
           </button>
        </div>
      </div>
    </div>
  );
};