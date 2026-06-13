/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface MobileMenuProps {
  t: any;
  user: any;
  handleLogout: () => void;
  setIsAuthOpen?: (open: boolean) => void; // Optionnel si tu n'utilises plus la modal
}

export const MobileMenu = ({ t, user, handleLogout }: MobileMenuProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="fixed inset-x-0 top-[76px] bg-background border-b border-foreground/5 z-40 lg:hidden p-6 space-y-4 shadow-xl"
    >
      <Link href="/" className="block py-2 text-lg font-bold">{t.nav.home}</Link>
      <a href="#" className="block py-2 text-lg font-bold">{t.nav.calculator}</a>
      <hr className="border-foreground/10" />
      {!user ? (
        <div className="space-y-3">
          <Link href="/login" className="block w-full text-center bg-foreground/5 py-4 rounded-xl font-bold">{t.nav.login}</Link>
          <Link href="/register" className="block w-full text-center bg-orange-btn py-4 rounded-xl text-white font-bold">{t.nav.register}</Link>
        </div>
      ) : (
        <button onClick={handleLogout} className="w-full text-left text-orange-btn font-bold py-2">{t.nav.logout}</button>
      )}
    </motion.div>
  );
};