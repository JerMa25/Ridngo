/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { handleAuthSubmit } from '@/lib/auth';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ identifier: '', password: '' });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res: any = await handleAuthSubmit('login', {
      email: formData.identifier, // On repasse l'identifiant via le champ attendu par handleAuthSubmit
      password: formData.password
    });
    if (res.success) {
      window.location.href = res.redirectUrl;
    } else {
      alert(res.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      <div className="hidden md:block md:w-1/2 relative">
        <div className="absolute inset-0 bg-orange-btn/20 mix-blend-multiply z-10" />
        <div className="absolute bottom-12 left-12 z-20 text-white max-w-md">
          <h2 className="text-5xl font-black mb-4">L&apos;Afrique en mouvement.</h2>
          <p className="text-lg opacity-90">Sûr, local et fiable.</p>
        </div>
        <img src="/auth.png" alt="RideGo" className="w-full h-full object-cover" />
      </div>

      <div className="w-full md:w-1/2 flex flex-col p-8 md:p-16 lg:p-24 justify-center relative">
        <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-foreground/60 hover:text-orange-btn font-bold uppercase text-[10px] tracking-widest transition-all">
          <ArrowLeft size={16} /> Accueil
        </Link>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-md w-full mx-auto">
          <h1 className="text-4xl font-black mb-2">Bon retour !</h1>
          <p className="text-foreground/50 mb-10 font-medium">Connectez-vous pour accéder à votre espace.</p>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Email ou Nom d&apos;utilisateur</label>
              <input required type="text" placeholder="Utilisateur ou email" className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-orange-btn text-foreground" onChange={(e) => setFormData({...formData, identifier: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Mot de passe</label>
              <div className="relative">
                <input required type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-orange-btn text-foreground" onChange={(e) => setFormData({...formData, password: e.target.value})} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-orange-btn">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button disabled={isLoading} type="submit" className="w-full bg-orange-btn text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-orange-btn/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              {isLoading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="mt-10 text-center text-sm font-medium text-foreground/50">
            Pas encore de compte ? <Link href="/register" className="text-orange-btn font-black hover:underline">S&apos;inscrire</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}