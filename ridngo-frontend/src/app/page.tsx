/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { Footer } from '@/components/layout/Footer';
import { MobileMenu } from '@/components/home/MobileMenu';
import { MarketingHero } from '@/components/home/MarketingHero';
import { Features } from '@/components/home/Features';
import { AppDownload } from '@/components/home/AppDownload';
import fr from '@/dictionaries/fr.json';
import { LandingOffers } from '@/components/home/LandingOffers';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const savedUserStr = localStorage.getItem('user');
    if (savedUserStr) {
      const savedUser = JSON.parse(savedUserStr);
      setUser(savedUser);

      if (savedUser.role === 'DRIVER') {
        router.replace("/driver/dashboard"); // .replace évite de pouvoir revenir en arrière sur la landing
        return; // On sort de l'effet, on ne passe pas à setIsRedirecting(false)
      }
    }

    setIsRedirecting(false);
    setMounted(true);
  }, [router]);

  if (isRedirecting || !mounted) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-orange-btn" size={40} />
      </div>
    );
  }

  if (!mounted) return null;

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen font-sans text-foreground overflow-x-hidden selection:bg-orange-btn selection:text-white">
      {/* Menu Mobile */}
      {isMenuOpen && <MobileMenu t={fr} user={user} handleLogout={handleLogout} />}

      <MarketingHero />

      <LandingOffers />

      <Features />

      <AppDownload />

      <Footer />
    </div>
  );
}