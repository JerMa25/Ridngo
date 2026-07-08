/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Sun, Moon, ArrowLeft, Bell, Car, ShieldAlert, LogOut, AlertTriangle, MapPin, Loader2, LayoutDashboard, BadgePercent } from 'lucide-react';
import { UserLocation } from '@/utils/geolocation';
import { userService } from '@/lib/userService';
import { motion, AnimatePresence } from 'framer-motion';

// --- Modale de confirmation déconnexion ---
const LogoutConfirmModal = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-200 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Fond flouté */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative glass rounded-4xl p-8 max-w-sm w-full shadow-2xl border border-foreground/10 flex flex-col items-center gap-6 text-center"
      >
        {/* Icône d'alerte */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle size={30} className="text-red-500" />
        </div>

        {/* Texte */}
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground">Déconnexion</h2>
          <p className="text-sm text-foreground/50 font-medium mt-2 leading-relaxed">
            Êtes-vous sûr de vouloir vous déconnecter ?
          </p>
        </div>

        {/* Boutons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-2xl bg-foreground/5 hover:bg-foreground/10 transition-all font-black text-[11px] uppercase tracking-widest text-foreground/60"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-2xl bg-red-500 hover:bg-red-600 transition-all font-black text-[11px] uppercase tracking-widest text-white shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            Déconnecter
          </button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

export const Navbar = ({ theme, setTheme, user, setUser, location, isLoadingLocation }: any & {
  location?: UserLocation | null;
  isLoadingLocation?: boolean;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [hasUnread, setHasUnread] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (user) {
      userService.getNotifications(0, 10)
        .then(data => {
          setHasUnread(data.content.some((n: any) => !n.isRead));
        })
        .catch(() => {});
    }
  }, [user, pathname]);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setShowLogoutModal(false);
    router.push('/');
  };

  return (
    <>
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 bg-background/80 backdrop-blur-md border-b border-foreground/5 sticky top-0 z-100">
        
        {/* GAUCHE : Logo ou Retour */}
        <div className="flex items-center gap-4">
          {!isHome && (
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-foreground/5 rounded-full text-orange-btn transition-colors"
              title="Retour"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          
          <Link href="/" className="flex items-center gap-2 text-2xl font-black tracking-tighter">
            <span className="bg-orange-btn text-white px-2 rounded-lg italic">R</span>
            <span className="text-foreground hidden sm:inline">RidnGo</span>
          </Link>

          {user && location && (
            <div
              className="flex items-center gap-1.5 pl-3 ml-1 border-l border-foreground/10 max-w-45 sm:max-w-60"
              title={`${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}`}
            >
              <MapPin size={14} className="text-orange-btn shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold text-foreground/60 truncate">
                {location.label}
              </span>
            </div>
          )}

          {user && isLoadingLocation && !location && (
            <div className="flex items-center gap-1.5 pl-3 ml-1 border-l border-foreground/10">
              <Loader2 size={14} className="text-orange-btn animate-spin shrink-0" />
              <span className="text-[10px] font-bold text-foreground/40 hidden sm:inline">Localisation…</span>
            </div>
          )}
        </div>
      
        {/* CENTRE : Liens (Desktop) */}
        <div className="hidden lg:flex items-center gap-10 text-[11px] font-black uppercase tracking-widest text-foreground/60">
          {user?.role === 'PASSENGER' && (
            <Link
              href="/passenger/dashboard"
              className={`hover:text-orange-btn transition-colors flex items-center gap-2 ${
                pathname === '/passenger/dashboard' ? 'text-orange-btn' : ''
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          )}
          {user?.role === 'PASSENGER' && (
            <Link
              href="/ride"
              className="hover:text-orange-btn transition-colors flex items-center gap-2"
            >
              <Car size={16} /> Commander
            </Link>
          )}
          {user?.role === 'PASSENGER' && (
            <Link
              href="/offers"
              className={`hover:text-orange-btn transition-colors flex items-center gap-2 ${
                pathname === '/offers' ? 'text-orange-btn' : ''
              }`}
            >
              <BadgePercent size={16} />
              Mes offres
            </Link>
          )}
          {user?.role === 'DRIVER' && (
            <Link href="/driver/dashboard" className="hover:text-orange-btn transition-colors">Radar</Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link href="/admin/dashboard" className="text-orange-btn flex items-center gap-1"><ShieldAlert size={14}/> Admin</Link>
          )}
        </div>

        {/* DROITE : Actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 hover:bg-foreground/5 rounded-full text-foreground/40">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {!user ? (
            <div className="flex gap-2 ml-2">
              <Link href="/login" className="px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-foreground/5 transition text-foreground">
                Connexion
              </Link>
              <Link href="/register" className="hidden sm:block px-5 py-2 bg-orange-btn rounded-xl font-black uppercase text-[10px] tracking-widest text-white shadow-lg shadow-orange-btn/20 hover:scale-105 transition-all">
                S&apos;inscrire
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link href="/notifications" className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/60 hover:bg-orange-btn hover:text-white transition-all relative">
                <Bell size={18} />
                {hasUnread && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-background animate-pulse"></span>
                )}
              </Link>

              <Link href="/profile" className="flex items-center gap-3 bg-foreground/5 pl-2 pr-2 sm:pr-4 py-1.5 rounded-full border border-foreground/5 hover:bg-foreground/10 transition-all group">
                <div className="w-8 h-8 rounded-full bg-orange-btn flex items-center justify-center text-white font-black text-xs group-hover:scale-110 transition-transform">{user.name[0]}</div>
                <div className="hidden sm:flex flex-col -space-y-1 text-left">
                  <span className="text-[11px] font-black text-foreground">{user.name.split(' ')[0]}</span>
                  <span className="text-[9px] font-bold text-orange-btn uppercase">{user.role}</span>
                </div>
              </Link>
            
              {/* BOUTON DÉCONNEXION */}
              <button
                onClick={() => setShowLogoutModal(true)}
                title="Se déconnecter"
                className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/40 hover:bg-red-500/10 hover:text-red-500 transition-all"
              >
                <LogOut size={17} />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* MODALE DE CONFIRMATION */}
      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
};