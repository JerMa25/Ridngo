/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { AppShell } from './AppShell';
import { PUBLIC } from './RouteGuard';
import { useGeolocation } from '@/hooks/useGeolocation';
import { clearOfflineCache } from '@/components/providers/QueryProvider';
import { clearSession } from '@/lib/session';

/** Pages publiques : barre du haut ; une fois connecté : sidebar (ordinateur) ou onglets en bas (téléphone). */
export const NavbarWrapper = () => {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { location, isLoading: isLoadingLocation } = useGeolocation(!!user);

  useEffect(() => {
    setMounted(true);
    const load = () => {
      // null après déconnexion : sinon la navbar continue d'afficher l'ancien compte
      const savedUser = localStorage.getItem('user');
      setUser(savedUser ? JSON.parse(savedUser) : null);
    };
    load();
    // le profil émet 'storage' après une modification (nom, photo)
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, [pathname]); // Se déclenche au changement de page pour rafraîchir le user

  if (!mounted) return null;
  if (pathname === '/login' || pathname === '/register') return null;

  if (user && !PUBLIC.includes(pathname)) {
    const logout = () => {
      clearSession();
      setUser(null);
      // rechargement complet : vide aussi le cache React Query en mémoire
      clearOfflineCache().finally(() => { window.location.href = '/'; });
    };
    return <AppShell user={user} theme={theme} setTheme={setTheme} location={location} onLogout={logout} />;
  }

  return (
    <Navbar 
      theme={theme} 
      setTheme={setTheme} 
      user={user} 
      setUser={setUser}
      location={location}
      isLoadingLocation={isLoadingLocation}
    />
  );
};
