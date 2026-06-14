/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

export const NavbarWrapper = () => {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, [pathname]); // Se déclenche au changement de page pour rafraîchir le user

  if (!mounted) return null;

  // Optionnel : Cacher la navbar sur les pages de login/register si vous voulez un look plein écran
  const hideNav = pathname === '/login' || pathname === '/register';
  if (hideNav) return null;

  return (
    <Navbar 
      theme={theme} 
      setTheme={setTheme} 
      user={user} 
      setUser={setUser}
    />
  );
};