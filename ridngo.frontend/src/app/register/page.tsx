/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, User, Mail, Lock, Phone, Camera, AtSign, Loader2 } from 'lucide-react';
import { handleAuthSubmit } from '@/lib/auth';
import { motion } from 'framer-motion';

function RegisterForm() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [role, setRole] = useState<'RIDE_AND_GO_PASSENGER' | 'RIDE_AND_GO_DRIVER'>('RIDE_AND_GO_PASSENGER');
  const [isLoading, setIsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    firstName: '', 
    lastName: '', 
    username: '',
    email: '', 
    password: '', 
    phone: '',
    photo: null as File | null
  });

  useEffect(() => {
    if (searchParams.get('role') === 'driver') setRole('RIDE_AND_GO_DRIVER');
  }, [searchParams]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, photo: file });
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res: any = await handleAuthSubmit('register', formData, role);
    if (res.success) {
      window.location.href = res.redirectUrl;
    } else {
      alert(res.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row-reverse">
      {/* Côté Image */}
      <div className="hidden md:block md:w-5/12 relative bg-bleu-nuit">
        <div className="absolute inset-0 bg-orange-btn/10 mix-blend-overlay z-10" />
        <div className="absolute bottom-12 right-12 z-20 text-white max-w-md text-right">
          <h2 className="text-5xl font-black mb-4 italic">Rejoignez le mouvement.</h2>
          <p className="text-lg opacity-80 font-medium">Le premier service de transport équitable en Afrique.</p>
        </div>
        <img src="/auth.png" alt="RideGo" className="w-full h-full object-cover opacity-60" />
      </div>

      {/* Côté Formulaire */}
      <div className="w-full md:w-7/12 flex flex-col p-6 md:p-12 lg:p-20 justify-center relative bg-background overflow-y-auto">
        <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-foreground/40 hover:text-orange-btn font-black uppercase text-[10px] tracking-widest transition-all">
          <ArrowLeft size={16} /> Retour
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full mx-auto space-y-10 py-12">
          
          <div className="text-center md:text-left">
            <div className="flex gap-2 mb-8 justify-center md:justify-start">
              <button onClick={() => setRole('RIDE_AND_GO_PASSENGER')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${role === 'RIDE_AND_GO_PASSENGER' ? 'bg-orange-btn text-white shadow-lg shadow-orange-btn/20' : 'bg-foreground/5 text-foreground/40'}`}>Passager</button>
              <button onClick={() => setRole('RIDE_AND_GO_DRIVER')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${role === 'RIDE_AND_GO_DRIVER' ? 'bg-orange-btn text-white shadow-lg shadow-orange-btn/20' : 'bg-foreground/5 text-foreground/40'}`}>Chauffeur</button>
            </div>
            <h1 className="text-4xl font-black tracking-tighter italic">{role === 'RIDE_AND_GO_DRIVER' ? "Devenir Chauffeur" : "Créer un compte"}</h1>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            
            {/* UPLOAD PHOTO */}
            <div className="flex flex-col items-center md:items-start gap-4">
               <p className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Photo de profil</p>
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="group relative w-24 h-24 rounded-[32px] bg-foreground/5 border-2 border-dashed border-foreground/10 flex items-center justify-center cursor-pointer overflow-hidden hover:border-orange-btn transition-all"
               >
                  {photoPreview ? (
                    <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <Camera className="text-foreground/20 group-hover:text-orange-btn transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <PlusCircle size={20} className="text-white" />
                  </div>
               </div>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="label-r">Prénom</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                  <input required type="text" className="input-r" placeholder="John" onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="label-r">Nom</label>
                <input required type="text" className="input-r" placeholder="Doe" onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="label-r">Nom d&apos;utilisateur (Public)</label>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                <input required type="text" className="input-r" placeholder="john_doe237" onChange={(e) => setFormData({...formData, username: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="label-r">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                  <input required type="email" className="input-r" placeholder="john@email.com" onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="label-r">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                  <input required type="tel" className="input-r" placeholder="677000000" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="label-r">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                <input required type="password" className="input-r" placeholder="••••••••" onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>

            <button disabled={isLoading} type="submit" className="w-full bg-orange-btn text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-btn/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3">
              {isLoading ? <Loader2 className="animate-spin" /> : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-sm font-bold opacity-40">
            Déjà inscrit ? <Link href="/login" className="text-orange-btn hover:underline">Se connecter</Link>
          </p>
        </motion.div>
      </div>

      <style jsx>{`
        .input-r { width: 100%; background: rgba(0,0,0,0.05); border: 1px solid transparent; padding: 1.25rem 1.25rem 1.25rem 3.25rem; border-radius: 1.25rem; outline: none; font-weight: 700; font-size: 0.875rem; transition: all 0.2s; color: var(--foreground); }
        .input-r:focus { border-color: #FF8C00; background: transparent; }
        .label-r { font-size: 10px; font-weight: 900; text-transform: uppercase; opacity: 0.4; margin-left: 0.5rem; display: block; margin-bottom: 0.25rem; }
      `}</style>
    </div>
  );
}

function PlusCircle({ size, className }: { size: number, className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest opacity-20">Chargement...</div>}>
      <RegisterForm />
    </Suspense>
  );
}