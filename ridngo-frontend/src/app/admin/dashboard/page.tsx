/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Car, TrendingUp, AlertTriangle, LogOut, 
  ShieldCheck, Search, Filter, ShieldAlert, Plus,
  Mail, ShieldPlus, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import fr from '@/dictionaries/fr.json';
import en from '@/dictionaries/en.json';

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [activeTab, setActiveTab] = useState('stats');
  const [user, setUser] = useState<any>(null);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  
  const t = lang === 'fr' ? fr : en;

  // DONNÉES MOCKÉES
  const [dbUsers, setDbUsers] = useState([
    { id: 1, name: "Moussa T.", email: "moussa@gmail.com", role: "PASSENGER", status: "ACTIVE", date: "12/10/2025", rides: 24 },
    { id: 2, name: "Awa B.", email: "awa@gmail.com", role: "PASSENGER", status: "ACTIVE", date: "14/10/2025", rides: 12 },
    { id: 3, name: "Jordan O.", email: "driver@ridego.com", role: "DRIVER", status: "ACTIVE", date: "10/10/2025", rides: 145 },
    { id: 4, name: "Willy W.", email: "willy@ridego.com", role: "DRIVER", status: "SUSPENDED", date: "05/10/2025", rides: 88 },
    { id: 5, name: "Admin Sec", email: "sec@ridego.com", role: "ADMIN", status: "ACTIVE", date: "01/10/2025", rides: 0 },
  ]);

  const [newAdmin, setNewAdmin] = useState({ fullName: '', email: '' });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const stored = localStorage.getItem('user');
    if (!stored || JSON.parse(stored).role !== 'ADMIN') {
      window.location.href = "/login";
      return;
    }
    setUser(JSON.parse(stored));
  }, []);

  if (!mounted || !user) return null;

  const handleToggleStatus = (id: number) => {
    setDbUsers(dbUsers.map(u => u.id === id ? { ...u, status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : u));
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminAccount = {
      id: dbUsers.length + 1,
      name: newAdmin.fullName,
      email: newAdmin.email,
      role: "ADMIN",
      status: "ACTIVE",
      date: new Date().toLocaleDateString(),
      rides: 0
    };
    setDbUsers([...dbUsers, adminAccount]);
    setIsAddAdminOpen(false);
    setNewAdmin({ fullName: '', email: '' });
    alert(t.admin.addSuccess);
  };

  return (
    <div className="min-h-screen font-sans transition-colors duration-300">
      
      {/* --- SIDEBAR / TOPBAR RESPONSIVE --- */}
      <nav className="glass mx-4 mt-4 px-8 py-5 flex items-center justify-between border-none sticky top-4 z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-foreground text-background rounded-2xl flex items-center justify-center shadow-xl">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">{t.admin.welcome}</h1>
            <p className="text-[10px] font-bold text-orange-btn uppercase tracking-[0.2em]">{user.name} • Master</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest opacity-60">
            <button onClick={() => setActiveTab('stats')} className={activeTab === 'stats' ? 'text-orange-btn opacity-100' : ''}>{t.admin.stats}</button>
            <button onClick={() => setActiveTab('clients')} className={activeTab === 'clients' ? 'text-orange-btn opacity-100' : ''}>{t.admin.users}</button>
            <button onClick={() => setActiveTab('drivers')} className={activeTab === 'drivers' ? 'text-orange-btn opacity-100' : ''}>{t.admin.drivers}</button>
            <button onClick={() => setActiveTab('team')} className={activeTab === 'team' ? 'text-orange-btn opacity-100' : ''}>{t.admin.team}</button>
          </div>
          
          <div className="h-8 w-[1px] bg-foreground/10" />

          <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="text-[10px] font-black text-orange-btn">
            {lang.toUpperCase()}
          </button>

          <Link href="/" className="p-3 bg-orange-btn/10 text-orange-btn rounded-xl hover:bg-orange-btn hover:text-white transition-all">
            <LogOut size={20} />
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-10 pb-24">
        
        <AnimatePresence mode="wait">
          {/* --- VUE STATISTIQUES --- */}
          {activeTab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              {/* CARDS KPI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Inscrits", val: "2,840", icon: <Users />, color: "text-blue-500" },
                  { label: "Courses / Jour", val: "512", icon: <Car />, color: "text-orange-btn" },
                  { label: "Revenu Hebdo", val: "1.2M F", icon: <TrendingUp />, color: "text-green-500" },
                  { label: "Alertes", val: "0", icon: <AlertTriangle />, color: "text-red-500" },
                ].map((k, i) => (
                  <div key={i} className="glass p-8 border-none shadow-xl flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 bg-foreground/5 rounded-2xl ${k.color}`}>{k.icon}</div>
                      <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">+14%</span>
                    </div>
                    <div>
                      <p className="text-3xl font-black text-foreground italic">{k.val}</p>
                      <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">{k.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* GRAPHIQUE COURBE (SVG Dynamique) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 glass p-8 border-none shadow-2xl">
                    <div className="flex justify-between items-center mb-10">
                       <h3 className="font-black text-foreground uppercase tracking-widest text-sm">{t.admin.chartRides}</h3>
                       <select className="bg-foreground/5 border-none text-[10px] font-bold px-4 py-2 rounded-lg outline-none">
                          <option>7 derniers jours</option>
                          <option>30 derniers jours</option>
                       </select>
                    </div>
                    {/* Simulation Graphique Courbe */}
                    <div className="h-64 w-full relative pt-10">
                       <svg viewBox="0 0 800 200" className="w-full h-full drop-shadow-2xl">
                          <path d="M0,150 Q100,140 200,80 T400,100 T600,40 T800,90" fill="none" stroke="#FF8C00" strokeWidth="4" strokeLinecap="round" className="animate-[dash_2s_ease-in-out]" />
                          <path d="M0,150 Q100,140 200,80 T400,100 T600,40 T800,90 L800,200 L0,200 Z" fill="url(#grad)" opacity="0.1" />
                          <defs>
                            <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{stopColor:'#FF8C00', stopOpacity:1}} />
                              <stop offset="100%" style={{stopColor:'#FF8C00', stopOpacity:0}} />
                            </linearGradient>
                          </defs>
                       </svg>
                       <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] font-black opacity-20 uppercase">
                          <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
                       </div>
                    </div>
                 </div>

                 <div className="glass p-8 border-none shadow-2xl flex flex-col items-center justify-center text-center">
                    <div className="w-40 h-40 rounded-full border-[15px] border-foreground/5 relative flex items-center justify-center mb-6">
                       <div className="absolute inset-0 border-[15px] border-orange-btn rounded-full border-t-transparent border-l-transparent rotate-45" />
                       <p className="text-3xl font-black">72%</p>
                    </div>
                    <h3 className="font-black text-sm uppercase tracking-widest mb-2">Taux de conversion</h3>
                    <p className="text-[10px] opacity-40 font-medium px-4 leading-relaxed italic">Pourcentage de recherches passagers transformées en courses réelles.</p>
                 </div>
              </div>
            </motion.div>
          )}

          {/* --- VUE TABLES (CLIENTS / CHAUFFEURS / TEAM) --- */}
          {(activeTab === 'clients' || activeTab === 'drivers' || activeTab === 'team') && (
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h2 className="text-3xl font-black text-foreground uppercase tracking-tight flex items-center gap-4">
                  {activeTab === 'clients' ? t.admin.users : activeTab === 'drivers' ? t.admin.drivers : t.admin.team}
                  <span className="bg-foreground/5 text-[10px] px-3 py-1 rounded-full opacity-40 tracking-widest font-black">
                    {dbUsers.filter(u => u.role === (activeTab === 'clients' ? 'PASSENGER' : activeTab === 'drivers' ? 'DRIVER' : 'ADMIN')).length}
                  </span>
                </h2>
                <div className="flex gap-3">
                  {activeTab === 'team' && (
                    <button onClick={() => setIsAddAdminOpen(true)} className="bg-orange-btn text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-orange-btn/20 hover:scale-105 transition-all">
                      <ShieldPlus size={18} /> {t.admin.createAdmin}
                    </button>
                  )}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={18} />
                    <input type="text" placeholder="Rechercher..." className="bg-foreground/5 border-none rounded-2xl py-3 pl-12 pr-6 outline-none focus:ring-2 focus:ring-orange-btn text-sm font-bold w-full md:w-64" />
                  </div>
                </div>
              </div>

              <div className="glass p-4 md:p-8 border-none shadow-2xl overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-[10px] font-black uppercase opacity-30 tracking-[0.2em]">
                      <th className="px-6 pb-2">Identité</th>
                      <th className="px-6 pb-2">Activités</th>
                      <th className="px-6 pb-2">Statut</th>
                      <th className="px-6 pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbUsers.filter(u => u.role === (activeTab === 'clients' ? 'PASSENGER' : activeTab === 'drivers' ? 'DRIVER' : 'ADMIN')).map(u => (
                      <tr key={u.id} className="group">
                        <td className="bg-foreground/5 first:rounded-l-3xl px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-btn flex items-center justify-center text-white font-black text-lg shadow-lg">{u.name[0]}</div>
                            <div>
                              <p className="font-black text-foreground">{u.name}</p>
                              <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest italic">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="bg-foreground/5 px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black">{u.rides} trajets</span>
                            <span className="text-[9px] opacity-30 font-bold uppercase">Depuis le {u.date}</span>
                          </div>
                        </td>
                        <td className="bg-foreground/5 px-6 py-5">
                           <span className={`text-[10px] font-black px-3 py-1 rounded-full ${u.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                             {u.status}
                           </span>
                        </td>
                        <td className="bg-foreground/5 last:rounded-r-3xl px-6 py-5 text-right">
                          <button onClick={() => handleToggleStatus(u.id)} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                            u.status === 'ACTIVE' ? 'text-red-500 hover:bg-red-500/10' : 'text-green-500 hover:bg-green-500/10'
                          }`}>
                            {u.status === 'ACTIVE' ? t.admin.suspend : t.admin.activate}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- MODAL CRÉATION ADMIN --- */}
      <AnimatePresence>
        {isAddAdminOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddAdminOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass max-w-md w-full p-10 relative z-10 border-none shadow-[0_0_50px_rgba(255,140,0,0.1)]">
                <h3 className="text-3xl font-black mb-2 text-foreground">{t.admin.createAdmin}</h3>
                <p className="text-xs font-bold opacity-40 mb-8 uppercase tracking-widest">{t.admin.passDefault}</p>
                
                <form onSubmit={handleCreateAdmin} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">{t.auth.fullName}</label>
                      <input required type="text" value={newAdmin.fullName} onChange={(e)=>setNewAdmin({...newAdmin, fullName: e.target.value})} className="w-full bg-foreground/5 border-none rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-orange-btn text-foreground font-bold" placeholder="Nom du collaborateur" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Email Professionnel</label>
                      <input required type="email" value={newAdmin.email} onChange={(e)=>setNewAdmin({...newAdmin, email: e.target.value})} className="w-full bg-foreground/5 border-none rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-orange-btn text-foreground font-bold" placeholder="email@ridego.com" />
                   </div>
                   <div className="pt-4 flex gap-4">
                      <button type="button" onClick={() => setIsAddAdminOpen(false)} className="flex-1 py-4 font-black uppercase text-xs tracking-widest opacity-40 hover:opacity-100 transition-opacity">Annuler</button>
                      <button type="submit" className="flex-[2] bg-orange-btn text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-btn/20">Confirmer</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FLOATING REPORT --- */}
      <div className="fixed bottom-8 left-8 p-4 glass border-none flex items-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-2xl z-40 animate-bounce">
         <div className="w-2 h-2 bg-green-500 rounded-full" />
         System Health: 100%
      </div>

    </div>
  );
}