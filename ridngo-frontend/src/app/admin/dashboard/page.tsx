/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Car, Route, Wallet, Crown, Radio, BadgePercent, ShieldCheck, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { Page, Card, Stat, Loading, Empty, fcfa } from '@/components/ui/Page';
import { platformService, apiError } from '@/lib/platformService';
import { useI18n } from '@/lib/i18n';

export default function AdminOverview() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-overview'], queryFn: platformService.admin.overview, refetchInterval: 30000 });
  const { data: drivers = [] } = useQuery({ queryKey: ['admin-drivers'], queryFn: platformService.admin.drivers });
  const pending = drivers.filter((d: any) => !d.validated);

  const validate = async (id: string) => {
    try {
      await platformService.admin.validateDriver(id);
      toast.success(t('Chauffeur validé'));
      qc.invalidateQueries({ queryKey: ['admin-drivers'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    } catch (e) { toast.error(apiError(e, t('Action impossible pour le moment.'))); }
  };

  if (isLoading) return <Loading />;
  if (error || !data) return <Page><Empty text={apiError(error, t('Impossible de charger les statistiques.'))} /></Page>;

  const days = (data.ridesPerDay ?? []).map((d: any) => ({
    day: new Date(d.day).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'short' }),
    rides: Number(d.rides),
  }));
  const rate = Math.round((data.commissionRate ?? 0) * 1000) / 10;

  return (
    <Page title={t("Vue d'ensemble")} subtitle={t('Activité de la plateforme en temps réel')}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={Users} label={t('Utilisateurs')} value={data.users} />
        <Stat icon={Car} label={t('Chauffeurs')} value={data.drivers} hint={t('{n} en ligne', { n: data.driversOnline })} tone="blue" />
        <Stat icon={Route} label={t('Courses')} value={data.rides} hint={t('{n} en cours', { n: data.ridesActive })} tone="green" />
        <Stat icon={BadgePercent} label={t('Offres ouvertes')} value={data.offersOpen} hint={t('{n} au total', { n: data.offers })} />
        <Stat icon={Wallet} label={t('Volume des courses terminées')} value={fcfa(data.volume)} tone="green" />
        <Stat icon={Radio} label={t('Commission estimée')} value={fcfa(data.volume * (data.commissionRate ?? 0))} hint={t('au taux actuel de {rate} %', { rate })} />
        <Stat icon={Crown} label={t('Abonnés actifs')} value={data.subscriptionsActive} hint={t('{amount} encaissés', { amount: fcfa(data.subscriptionsRevenue) })} tone="blue" />
        <Stat icon={ShieldCheck} label={t('Chauffeurs à valider')} value={data.driversPending} tone={data.driversPending ? 'red' : 'green'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="font-black mb-4">{t('Courses des 7 derniers jours')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={30} />
                <Tooltip cursor={{ fill: 'rgba(255,140,0,0.08)' }} formatter={(v: any) => [v, t('Courses')]} />
                <Bar dataKey="rides" fill="#FF8C00" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black">{t('Chauffeurs à valider')}</h3>
            <Link href="/admin/drivers" className="text-[11px] font-black text-orange-btn flex items-center gap-1">{t('Tout voir')} <ArrowRight size={13} /></Link>
          </div>
          {pending.length === 0 ? <Empty text={t('Aucun chauffeur en attente.')} /> : (
            <ul className="space-y-2">
              {pending.slice(0, 5).map((d: any) => (
                <li key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-foreground/5">
                  <div className="min-w-0">
                    <p className="text-sm font-black truncate">{d.name ?? '—'}</p>
                    <p className="text-[11px] text-foreground/50 truncate">{d.email ?? d.phone}</p>
                  </div>
                  <button onClick={() => validate(d.id)} className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-[11px] font-black">{t('Valider')}</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black">{t('Commission Ride&Go')} : {rate} %</h3>
            <p className="text-sm text-foreground/55">{t('Prélevée sur chaque course, sauf pour les chauffeurs abonnés.')}</p>
          </div>
          <Link href="/admin/settings" className="px-4 py-2.5 rounded-xl bg-orange-btn text-white text-xs font-black">{t('Modifier les réglages')}</Link>
        </div>
      </Card>
    </Page>
  );
}
