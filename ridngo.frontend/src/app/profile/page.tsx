/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import api from '@/lib/api-client';
import { UserResponse, UpdateUserProfileRequest } from '@/types/api';
import { 
  User, Phone, Save, Loader2, LogOut, Mail, 
  Shield, AlertCircle, Key, Lock, Settings, Camera,
  Car, Wallet as WalletIcon, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
  const [fullProfile, setFullProfile] = useState<any>(null); // Contient l'objet complet du backend
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'parameters' | 'security'>('parameters');

  // State pour le formulaire de mise à jour
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  });

  // State pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const stored = localStorage.getItem('user');
      const isDriver = stored ? JSON.parse(stored).role === 'DRIVER' : false;

      // On appelle la route spécifique selon le rôle
      const endpoint = isDriver ? '/api/v1/users/me/driver-profile' : '/api/v1/users/me';
      const res = await api.get(endpoint);

      // Le format diffère : res.data (Passager) vs res.data.user (Chauffeur)
      const userData = isDriver ? res.data.user : res.data;
      
      setFullProfile(res.data);

      // On parse le nom complet pour remplir firstname/lastname si le backend ne les donne pas séparément
      // Note: Normalement res.data a firstName/lastName suite à la MAJ du registre
      setEditData({
        firstName: userData.firstName || userData.name?.split(' ')[0] || '',
        lastName: userData.lastName || userData.name?.split(' ').slice(1).join(' ') || '',
        phone: userData.telephone || ''
      });

    } catch (err) {
      console.error("Erreur profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updateReq: UpdateUserProfileRequest = {
        firstName: editData.firstName,
        lastName: editData.lastName,
        phone: editData.phone
      };
      await api.put('/api/v1/users/profile', updateReq);
      alert("Profil mis à jour !");
      fetchProfile();
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("La confirmation ne correspond pas.");
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/api/v1/users/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      alert("Mot de passe modifié !");
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      alert(err.response?.data?.message || "Erreur mot de passe.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-orange-btn" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Accès sécurisé au profil...</p>
    </div>
  );

  // Extraction propre des infos selon la structure
  const user = fullProfile?.user || fullProfile; // Gère le nesting driver-profile
  const driverData = fullProfile?.driver;
  const vehicle = fullProfile?.vehicle;

  return (
    <main className="max-w-6xl mx-auto p-6 md:py-12 text-foreground">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLONNE GAUCHE : IDENTITÉ & STATS RAPIDES */}
          <div className="space-y-6">
            <div className="glass p-8 text-center border-none shadow-xl bg-background relative overflow-hidden">
              {/* Photo de profil ou Initiales */}
              <div className="relative w-32 h-32 mx-auto mb-6 group">
                <div className="w-full h-full bg-orange-btn rounded-[40px] flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-orange-btn/20 overflow-hidden italic">
                  {user?.photoUri ? (
                    <img src={user.photoUri} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    user?.name?.charAt(0) || user?.firstName?.charAt(0)
                  )}
                </div>
                <button className="absolute bottom-0 right-0 p-3 bg-foreground text-background rounded-2xl shadow-xl hover:scale-110 transition-transform">
                   <Camera size={18} />
                </button>
              </div>

              <h2 className="text-2xl font-black tracking-tight">{user?.name || `${user?.firstName} ${user?.lastName}`}</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                 <span className="text-[10px] font-black uppercase text-orange-btn tracking-[0.2em]">
                    {user?.roles[0]?.replace('RIDE_AND_GO_', '')}
                 </span>
                 {driverData?.isProfileValidated && <CheckCircle2 size={14} className="text-green-500" />}
              </div>
            </div>

            {/* NAVIGATION TABS */}
            <div className="glass p-2 border-none shadow-md bg-background/50 flex flex-col gap-1">
               <button 
                onClick={() => setActiveTab('parameters')}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'parameters' ? 'bg-orange-btn text-white shadow-lg shadow-orange-btn/20' : 'hover:bg-foreground/5 opacity-60'}`}
               >
                 <div className="flex items-center gap-3"><Settings size={18} /> Paramètres</div>
                 <ChevronRight size={14} />
               </button>
               <button 
                onClick={() => setActiveTab('security')}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'security' ? 'bg-orange-btn text-white shadow-lg shadow-orange-btn/20' : 'hover:bg-foreground/5 opacity-60'}`}
               >
                 <div className="flex items-center gap-3"><Lock size={18} /> Sécurité</div>
                 <ChevronRight size={14} />
               </button>
            </div>

            {/* INFO COMPLÉMENTAIRES (Spécifiques Driver) */}
            {driverData && (
              <div className="glass p-6 border-none shadow-sm space-y-4 bg-foreground/5">
                <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">Informations Pro</p>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3 opacity-70 text-xs font-bold"><Car size={16}/> Véhicule</div>
                   <span className="text-xs font-black">{vehicle?.brand || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3 opacity-70 text-xs font-bold"><Shield size={16}/> Permis</div>
                   <span className="text-xs font-black">{driverData.licenseNumber || '---'}</span>
                </div>
              </div>
            )}

            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 p-5 bg-red-500/10 text-red-500 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-red-500 hover:text-white transition-all group shadow-sm"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              Déconnexion
            </button>
          </div>

          {/* COLONNE DROITE : CONTENU DYNAMIQUE */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {activeTab === 'parameters' ? (
                <motion.div 
                  key="parameters"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="glass p-8 md:p-12 border-none shadow-2xl bg-background"
                >
                   <div className="flex items-center gap-4 mb-10">
                      <div className="w-12 h-12 bg-orange-btn/10 text-orange-btn rounded-2xl flex items-center justify-center">
                        <User size={24} />
                      </div>
                      <h3 className="text-3xl font-black tracking-tighter italic">Informations personnelles</h3>
                   </div>

                   <form onSubmit={handleUpdate} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="label-p">Prénom</label>
                          <input 
                            value={editData.firstName} 
                            onChange={e => setEditData({...editData, firstName: e.target.value})} 
                            className="input-profile" 
                            placeholder="John"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="label-p">Nom de famille</label>
                          <input 
                            value={editData.lastName} 
                            onChange={e => setEditData({...editData, lastName: e.target.value})} 
                            className="input-profile" 
                            placeholder="Doe"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 opacity-50">
                            <label className="label-p">Email (Non modifiable)</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                                <input readOnly value={user?.email} className="input-profile pl-12 cursor-not-allowed" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="label-p">Téléphone</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                                <input 
                                    value={editData.phone} 
                                    onChange={e => setEditData({...editData, phone: e.target.value})} 
                                    className="input-profile pl-12" 
                                    placeholder="+237 ..." 
                                />
                            </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <button 
                          disabled={saving} 
                          type="submit" 
                          className="w-full bg-orange-btn text-white py-6 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-btn/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="animate-spin" size={24} /> : <><Save size={20} /> Enregistrer les modifications</>}
                        </button>
                      </div>
                   </form>
                </motion.div>
              ) : (
                <motion.div 
                  key="security"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="glass p-8 md:p-12 border-none shadow-2xl bg-background"
                >
                   <div className="flex items-center gap-4 mb-10">
                      <div className="w-12 h-12 bg-foreground/5 text-foreground/60 rounded-2xl flex items-center justify-center">
                        <Key size={24} />
                      </div>
                      <h3 className="text-2xl font-black tracking-tighter italic">Sécurité du compte</h3>
                   </div>

                   <form onSubmit={handleChangePassword} className="space-y-6">
                      <div className="space-y-2">
                        <label className="label-p">Mot de passe actuel</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                          <input 
                            type="password"
                            required
                            value={passwordData.currentPassword} 
                            onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} 
                            className="input-profile pl-12" 
                            placeholder="••••••••" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="label-p">Nouveau mot de passe</label>
                          <input 
                            type="password"
                            required
                            value={passwordData.newPassword} 
                            onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} 
                            className="input-profile" 
                            placeholder="Min. 8 caractères"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="label-p">Confirmation</label>
                          <input 
                            type="password"
                            required
                            value={passwordData.confirmPassword} 
                            onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} 
                            className="input-profile" 
                            placeholder="Répétez"
                          />
                        </div>
                      </div>

                      <div className="pt-4">
                        <button 
                          disabled={changingPassword} 
                          type="submit" 
                          className="w-full bg-foreground text-background py-6 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-orange-btn hover:text-white transition-all flex items-center justify-center gap-3"
                        >
                          {changingPassword ? <Loader2 className="animate-spin" size={24} /> : <><Key size={20} /> Mettre à jour le mot de passe</>}
                        </button>
                      </div>
                   </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 p-6 bg-foreground/5 rounded-3xl flex items-start gap-4">
              <AlertCircle className="text-orange-btn shrink-0" size={20} />
              <p className="text-[11px] font-medium opacity-50 leading-relaxed italic">
                La sécurité de vos données est notre priorité. Si vous remarquez une activité suspecte, veuillez modifier votre mot de passe immédiatement et contacter l&apos;administration RidnGo.
              </p>
            </div>
          </div>
        </div>

      <style jsx>{`
        .input-profile {
          width: 100%;
          background: rgba(0,0,0,0.05);
          border: 1px solid transparent;
          padding: 1.25rem;
          border-radius: 1.25rem;
          outline: none;
          font-weight: 700;
          transition: all 0.2s;
          color: var(--foreground);
        }
        .input-profile:focus {
          background: transparent;
          border-color: #FF8C00;
          box-shadow: 0 0 0 4px rgba(255, 140, 0, 0.1);
        }
        .label-p {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          opacity: 0.4;
          margin-left: 0.5rem;
          display: block;
          margin-bottom: 0.25rem;
        }
      `}</style>
    </main>
  );
}

function ChevronRight({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}