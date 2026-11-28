"use client"
import React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

/** Conteneur standard des pages de l'espace connecté. */
export const Page = ({ title, subtitle, actions, children }: { title?: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) => (
  <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6 text-foreground">
    {(title || actions) && (
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          {title && <h2 className="text-2xl md:text-3xl font-black tracking-tight">{title}</h2>}
          {subtitle && <p className="text-sm text-foreground/55 font-medium mt-1">{subtitle}</p>}
        </div>
        {actions}
      </div>
    )}
    {children}
  </main>
);

export const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <section className={`glass p-5 md:p-6 ${className}`}>{children}</section>
);

export const Stat = ({ label, value, hint, icon: Icon, tone = 'orange' }: { label: string; value: React.ReactNode; hint?: string; icon: LucideIcon; tone?: 'orange' | 'green' | 'blue' | 'red' }) => {
  const tones = { orange: 'bg-orange-btn/10 text-orange-btn', green: 'bg-green-500/10 text-green-500', blue: 'bg-blue-500/10 text-blue-500', red: 'bg-red-500/10 text-red-500' };
  return (
    <div className="glass p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${tones[tone]}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/45">{label}</p>
        <p className="text-2xl font-black tracking-tight mt-0.5">{value}</p>
        {hint && <p className="text-[11px] font-bold text-foreground/45 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
};

export const Loading = () => (
  <div className="min-h-app flex items-center justify-center"><Loader2 className="animate-spin text-orange-btn" size={32} /></div>
);

export const Empty = ({ text }: { text: string }) => (
  <p className="text-center text-sm font-bold text-foreground/40 py-10">{text}</p>
);

export const Badge = ({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'green' | 'orange' | 'red' | 'blue' }) => {
  const tones = { gray: 'bg-foreground/10 text-foreground/60', green: 'bg-green-500/15 text-green-600 dark:text-green-400', orange: 'bg-orange-btn/15 text-orange-btn', red: 'bg-red-500/15 text-red-500', blue: 'bg-blue-500/15 text-blue-500' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${tones[tone]}`}>{children}</span>;
};

export const fcfa = (n?: number | null) => `${Math.round(n ?? 0).toLocaleString('fr-FR')} FCFA`;
export const fmtDate = (iso?: string | null, lang = 'fr') =>
  iso ? new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
