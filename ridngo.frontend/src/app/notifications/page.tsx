/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { 
  Check, ChevronDown, Mail, 
  Settings, Bell, Smartphone, MessageSquare, AtSign, Loader2, X, PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '@/lib/userService';
import { Notification, NotificationSettings } from '@/types/api';

export default function NotificationsPage() {
  // --- ÉTATS POUR LA PAGINATION ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // --- ÉTATS UI ---
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Charger la première page au montage ou au changement de filtre
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    loadInitialData();
  }, [filter]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Appel page 0, taille 10
      const data = await userService.getNotifications(0, 10);
      setNotifications(data.content);
      // Vérifie s'il existe une page suivante
      setHasMore(data.currentPage < data.totalPages - 1);
      setPage(0);
    } catch (e) { 
      console.error("Erreur chargement initial", e); 
    }
    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await userService.getNotifications(nextPage, 10);
      
      // CONCATÉNATION : On ajoute les nouveaux messages à la suite des anciens
      setNotifications(prev => [...prev, ...data.content]);
      setPage(nextPage);
      setHasMore(data.currentPage < data.totalPages - 1);
    } catch (e) { 
      console.error("Erreur load more", e); 
    }
    setLoadingMore(false);
  };

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await userService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) { console.error(e); }
  };

  const handleMarkAllRead = async () => {
    try {
      await userService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) { console.error(e); }
  };

  const toggleExpand = (id: string, isRead: boolean) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!isRead) handleMarkRead(id);
    }
  };

  const openSettings = async () => {
    setShowSettings(true);
    try {
      const data = await userService.getNotificationSettings();
      setSettings(data);
    } catch (e) { console.error(e); }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      await userService.updateNotificationSettings({
        email: settings.emailEnabled,
        sms: settings.smsEnabled,
        push: settings.pushEnabled,
        whatsapp: settings.whatsappEnabled
      });
      setShowSettings(false);
    } catch (e) { alert("Erreur lors de la sauvegarde"); }
    setSavingSettings(false);
  };

  // Filtrage local pour la réactivité
  const filteredNotifs = filter === 'ALL' 
    ? notifications 
    : notifications.filter(n => !n.isRead);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen text-foreground font-sans">
      
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* TITRE ET OUTILS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic">Messagerie</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Centre de notifications RidnGo</p>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={openSettings} className="w-12 h-12 flex items-center justify-center bg-foreground/5 rounded-2xl hover:text-orange-btn transition-all group" title="Réglages">
                <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
             </button>

             <div className="flex bg-foreground/5 p-1.5 rounded-2xl border border-foreground/5">
                <button 
                  onClick={() => setFilter('ALL')} 
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'ALL' ? 'bg-background shadow-lg text-orange-btn' : 'opacity-40'}`}
                >
                  Tous
                </button>
                <button 
                  onClick={() => setFilter('UNREAD')} 
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'UNREAD' ? 'bg-background shadow-lg text-orange-btn' : 'opacity-40'}`}
                >
                  Non lus {unreadCount > 0 && `(${unreadCount})`}
                </button>
             </div>
          </div>
        </div>

        {/* ACTIONS GLOBALES */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={handleMarkAllRead} 
              className="w-full py-4 bg-orange-btn/10 text-orange-btn text-[10px] font-black uppercase tracking-[0.2em] rounded-3xl border border-orange-btn/20 hover:bg-orange-btn hover:text-white transition-all mb-8 shadow-sm"
            >
              Tout marquer comme lu
            </motion.button>
          )}
        </AnimatePresence>

        {/* LISTE DES MESSAGES */}
        <div className="space-y-4">
          {loading ? (
             <div className="text-center py-20 opacity-40">
                <Loader2 className="animate-spin mx-auto mb-4" size={32}/>
                <p className="text-xs font-black uppercase tracking-widest">Récupération des données...</p>
             </div>
          ) : filteredNotifs.length === 0 ? (
             <div className="glass p-20 text-center border-none shadow-xl flex flex-col items-center gap-4 bg-background/50 rounded-[40px]">
                <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center opacity-20">
                  <Mail size={32} />
                </div>
                <span className="text-sm font-bold uppercase tracking-widest opacity-30">Boîte de réception vide</span>
             </div>
          ) : (
             <div className="space-y-3">
               {filteredNotifs.map((notif) => (
                 <motion.div 
                   key={notif.id}
                   layout
                   onClick={() => toggleExpand(notif.id, notif.isRead)}
                   className={`group relative bg-background rounded-[32px] border transition-all cursor-pointer overflow-hidden ${!notif.isRead ? 'border-orange-btn/30 bg-orange-btn/[0.01] shadow-md' : 'border-foreground/5 opacity-70'}`}
                 >
                   {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-btn shadow-[2px_0_10px_rgba(255,140,0,0.5)]" />}
                   <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                         <div className="flex-1">
                            <h3 className={`text-base tracking-tight ${!notif.isRead ? 'font-black' : 'font-bold opacity-60'}`}>{notif.title}</h3>
                            <p className={`text-sm mt-1 leading-relaxed ${expandedId === notif.id ? '' : 'line-clamp-1 opacity-50 font-medium'}`}>
                               {notif.message}
                            </p>
                         </div>
                         <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-[9px] font-black opacity-30 uppercase tracking-tighter">
                               {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                            {!notif.isRead && <div className="w-2 h-2 rounded-full bg-orange-btn animate-pulse" />}
                         </div>
                      </div>

                      <AnimatePresence>
                        {expandedId === notif.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-5 border-t border-foreground/5 mt-5 flex justify-end">
                             {!notif.isRead && (
                               <button onClick={(e) => handleMarkRead(notif.id, e)} className="px-6 py-2 bg-green-500/10 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-green-500 hover:text-white transition-all">
                                 <Check size={14} /> Lu
                               </button>
                             )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                 </motion.div>
               ))}
               
               {/* BOUTON DE PAGINATION (LOAD MORE) */}
               {hasMore && (
                 <button 
                  onClick={loadMore} 
                  disabled={loadingMore} 
                  className="w-full py-8 group flex flex-col items-center gap-2"
                 >
                   {loadingMore ? (
                     <Loader2 className="animate-spin text-orange-btn" size={24} />
                   ) : (
                     <>
                        <PlusCircle size={24} className="text-foreground/20 group-hover:text-orange-btn transition-colors" />
                        <span className="font-black uppercase text-[10px] tracking-[0.3em] opacity-30 group-hover:opacity-100 transition-opacity">Charger les messages précédents</span>
                     </>
                   )}
                 </button>
               )}
             </div>
          )}
        </div>
      </div>

      {/* MODALE PARAMÈTRES (SETTINGS) */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass max-w-md w-full p-8 relative z-10 border-none bg-background shadow-2xl rounded-[40px]">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter">Paramètres</h2>
                  <p className="text-[10px] font-bold uppercase opacity-40">Préférences de réception</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="w-10 h-10 flex items-center justify-center hover:bg-foreground/5 rounded-full transition-colors"><X size={20}/></button>
              </div>

              {!settings ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-orange-btn"/></div> : (
                <div className="space-y-3">
                  {[
                    { id: 'pushEnabled', label: 'Notifications Push', icon: <Bell size={18}/> },
                    { id: 'emailEnabled', label: 'Alertes E-mail', icon: <AtSign size={18}/> },
                    { id: 'smsEnabled', label: 'Messages SMS', icon: <Smartphone size={18}/> },
                    { id: 'whatsappEnabled', label: 'WhatsApp', icon: <MessageSquare size={18}/> },
                  ].map((pref) => (
                    <div key={pref.id} className="flex items-center justify-between p-4 bg-foreground/5 rounded-2xl border border-transparent hover:border-foreground/5 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center text-orange-btn shadow-sm">{pref.icon}</div>
                        <span className="text-sm font-bold tracking-tight">{pref.label}</span>
                      </div>
                      <button 
                        onClick={() => setSettings({ ...settings, [pref.id]: !((settings as any)[pref.id]) })}
                        className={`w-12 h-7 rounded-full transition-all relative ${ (settings as any)[pref.id] ? 'bg-orange-btn' : 'bg-foreground/20' }`}
                      >
                        <motion.div 
                          animate={{ x: (settings as any)[pref.id] ? 22 : 4 }}
                          className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm" 
                        />
                      </button>
                    </div>
                  ))}

                  <button 
                    disabled={savingSettings}
                    onClick={saveSettings}
                    className="w-full bg-orange-btn text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-btn/20 mt-8 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {savingSettings ? <Loader2 className="animate-spin" /> : "Enregistrer les choix"}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}