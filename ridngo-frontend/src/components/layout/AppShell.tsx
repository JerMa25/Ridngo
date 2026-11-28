/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Radar, Wallet, History, Crown, Map, Car, Bell, User, LayoutDashboard, BadgePercent, Search,
  Users, Settings, ShieldCheck, Route, LogOut, Sun, Moon, MoreHorizontal, X, MapPin, type LucideIcon,
} from 'lucide-react';
import { useI18n, LangSwitch } from '@/lib/i18n';
import { userService } from '@/lib/userService';
import { UserLocation } from '@/utils/geolocation';
import { LogoutConfirmModal } from './Navbar';

type Item = { href: string; label: string; icon: LucideIcon; section?: string };

/** Menu de chaque profil : les 4 premiers vont dans la barre du bas sur téléphone, le reste dans « Plus ». */
export const NAV: Record<string, Item[]> = {
  DRIVER: [
    { href: '/driver/dashboard', label: 'Radar', icon: Radar, section: 'Activité' },
    { href: '/driver/wallet', label: 'Portefeuille', icon: Wallet, section: 'Activité' },
    { href: '/driver/history', label: 'Historique', icon: History, section: 'Activité' },
    { href: '/notifications', label: 'Notifications', icon: Bell, section: 'Compte' },
    { href: '/driver/subscription', label: 'Abonnement', icon: Crown, section: 'Activité' },
    { href: '/driver/heatmap', label: 'Zones', icon: Map, section: 'Activité' },
    { href: '/driver/vehicle', label: 'Mon véhicule', icon: Car, section: 'Compte' },
    { href: '/profile', label: 'Profil', icon: User, section: 'Compte' },
  ],
  PASSENGER: [
    { href: '/ride', label: 'Commander', icon: Search, section: 'Courses' },
    { href: '/passenger/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, section: 'Courses' },
    { href: '/offers', label: 'Mes offres', icon: BadgePercent, section: 'Courses' },
    { href: '/notifications', label: 'Notifications', icon: Bell, section: 'Compte' },
    { href: '/ride/history', label: 'Historique', icon: History, section: 'Courses' },
    { href: '/profile', label: 'Profil', icon: User, section: 'Compte' },
  ],
  ADMIN: [
    { href: '/admin/dashboard', label: "Vue d'ensemble", icon: LayoutDashboard, section: 'Supervision' },
    { href: '/admin/drivers', label: 'Chauffeurs', icon: ShieldCheck, section: 'Supervision' },
    { href: '/admin/rides', label: 'Courses', icon: Route, section: 'Supervision' },
    { href: '/admin/users', label: 'Utilisateurs', icon: Users, section: 'Supervision' },
    { href: '/admin/subscriptions', label: 'Abonnements', icon: Crown, section: 'Organisation' },
    { href: '/admin/settings', label: 'Réglages', icon: Settings, section: 'Organisation' },
    { href: '/notifications', label: 'Notifications', icon: Bell, section: 'Compte' },
    { href: '/profile', label: 'Profil', icon: User, section: 'Compte' },
  ],
};

const isActive = (pathname: string, href: string) =>
  pathname === href || (href !== '/ride' && pathname.startsWith(href + '/'));

const ROLE_LABEL: Record<string, string> = { DRIVER: 'Chauffeur', PASSENGER: 'Passager', ADMIN: 'Administrateur' };

export function AppShell({ user, theme, setTheme, location, onLogout }: {
  user: any; theme?: string; setTheme: (t: string) => void; location?: UserLocation | null; onLogout: () => void;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = NAV[user.role] ?? NAV.PASSENGER;
  const current = items.find(i => isActive(pathname, i.href));
  const [hasUnread, setHasUnread] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // le contenu se décale pour laisser la place à la sidebar / aux barres (voir globals.css)
  useEffect(() => {
    document.body.dataset.shell = '1';
    return () => { delete document.body.dataset.shell; };
  }, []);

  useEffect(() => {
    userService.getNotifications(0, 10)
      .then(data => setHasUnread(data.content.some((n: any) => !n.isRead)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMoreOpen(false);
  }, [pathname]);

  const sections = items.reduce<Record<string, Item[]>>((acc, i) => {
    (acc[i.section ?? ''] ??= []).push(i);
    return acc;
  }, {});
  const avatar = (size: string) => (
    <div className={`${size} rounded-full overflow-hidden bg-orange-btn flex items-center justify-center text-white font-black text-xs shrink-0`}>
      {user.photoUri ? <img src={user.photoUri} alt="" className="w-full h-full object-cover" /> : user.name?.[0]?.toUpperCase()}
    </div>
  );

  return (
    <>
      {/* ── Sidebar (ordinateur) ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-[90] w-64 flex-col bg-background/95 backdrop-blur-xl border-r border-foreground/10">
        <Link href="/" className="flex items-center gap-2 px-6 h-16 text-xl font-black tracking-tighter shrink-0">
          <span className="bg-orange-btn text-white px-2 rounded-lg italic">R</span>
          <span className="text-foreground">RidnGo</span>
        </Link>

        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 space-y-6" aria-label={t('Navigation principale')}>
          {Object.entries(sections).map(([section, list]) => (
            <div key={section}>
              <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/35">{t(section)}</p>
              <ul className="space-y-1">
                {list.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                          active ? 'bg-orange-btn text-white shadow-lg shadow-orange-btn/20' : 'text-foreground/65 hover:bg-foreground/5 hover:text-foreground'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="flex-1">{t(label)}</span>
                        {href === '/notifications' && hasUnread && !active && <span className="w-2 h-2 rounded-full bg-red-500" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-foreground/10">
          <Link href="/profile" className="flex items-center gap-3 p-2 rounded-xl hover:bg-foreground/5 transition-colors">
            {avatar('w-9 h-9')}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-foreground truncate">{user.name}</p>
              <p className="text-[10px] font-bold text-orange-btn uppercase tracking-wider">{t(ROLE_LABEL[user.role] ?? user.role)}</p>
            </div>
          </Link>
          <button
            onClick={() => setConfirmLogout(true)}
            className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground/55 hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <LogOut size={18} /> {t('Déconnexion')}
          </button>
        </div>
      </aside>

      {/* ── Barre du haut ── */}
      <header className="fixed top-0 right-0 left-0 lg:left-64 z-[80] h-16 flex items-center justify-between gap-3 px-4 md:px-8 bg-background/85 backdrop-blur-xl border-b border-foreground/10">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="lg:hidden text-xl font-black italic bg-orange-btn text-white px-2 rounded-lg">R</Link>
          <h1 className="text-base md:text-lg font-black tracking-tight text-foreground truncate">{t(current?.label ?? 'RidnGo')}</h1>
          {location && (
            <span className="hidden md:flex items-center gap-1.5 pl-3 border-l border-foreground/10 max-w-64 text-[11px] font-bold text-foreground/55 truncate" title={`${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}`}>
              <MapPin size={13} className="text-orange-btn shrink-0" /> <span className="truncate">{location.label}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <LangSwitch />
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={t(theme === 'dark' ? 'Mode clair' : 'Mode sombre')}
            className="w-9 h-9 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-foreground/60"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link href="/notifications" aria-label={t('Notifications')} className="relative w-9 h-9 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-foreground/60">
            <Bell size={17} />
            {hasUnread && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-background" />}
          </Link>
          <Link href="/profile" aria-label={t('Profil')} className="lg:hidden">{avatar('w-9 h-9')}</Link>
        </div>
      </header>

      {/* ── Barre d'onglets (téléphone) ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[90] h-16 grid grid-cols-5 bg-background/95 backdrop-blur-xl border-t border-foreground/10 pb-[env(safe-area-inset-bottom)]" aria-label={t('Navigation principale')}>
        {items.slice(0, 4).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 text-[10px] font-black ${active ? 'text-orange-btn' : 'text-foreground/45'}`}>
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-orange-btn" />}
              <Icon size={20} />
              <span className="truncate max-w-full px-1">{t(label)}</span>
              {href === '/notifications' && hasUnread && <span className="absolute top-2.5 right-[30%] w-2 h-2 rounded-full bg-red-500" />}
            </Link>
          );
        })}
        <button onClick={() => setMoreOpen(true)} aria-expanded={moreOpen}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-black ${items.slice(4).some(i => isActive(pathname, i.href)) ? 'text-orange-btn' : 'text-foreground/45'}`}>
          <MoreHorizontal size={20} />
          {t('Plus')}
        </button>
      </nav>

      {/* ── Feuille « Plus » (téléphone) ── */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div className="lg:hidden fixed inset-0 z-[150]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
            <motion.div
              role="dialog" aria-label={t('Plus')}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-background border-t border-foreground/10 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {avatar('w-10 h-10')}
                  <div>
                    <p className="font-black text-foreground">{user.name}</p>
                    <p className="text-[10px] font-bold text-orange-btn uppercase tracking-wider">{t(ROLE_LABEL[user.role] ?? user.role)}</p>
                  </div>
                </div>
                <button onClick={() => setMoreOpen(false)} aria-label={t('Fermer')} className="w-9 h-9 rounded-full bg-foreground/5 flex items-center justify-center"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {items.slice(4).map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl text-[11px] font-black text-center ${isActive(pathname, href) ? 'bg-orange-btn text-white' : 'bg-foreground/5 text-foreground/70'}`}>
                    <Icon size={22} /> {t(label)}
                  </Link>
                ))}
              </div>
              <button onClick={() => setConfirmLogout(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 text-red-500 font-black text-sm">
                <LogOut size={17} /> {t('Déconnexion')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {confirmLogout && <LogoutConfirmModal onConfirm={onLogout} onCancel={() => setConfirmLogout(false)} />}
    </>
  );
}
