/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Page, Card, Loading, Empty, Badge, fmtDate } from '@/components/ui/Page';
import { platformService, apiError } from '@/lib/platformService';
import { useI18n } from '@/lib/i18n';

const FILTERS = ['Tous', 'À valider', 'Validés', 'En ligne', 'Abonnés'] as const;

export default function AdminDrivers() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Tous');
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-drivers'], queryFn: platformService.admin.drivers });

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(t(ok)); qc.invalidateQueries({ queryKey: ['admin-drivers'] }); qc.invalidateQueries({ queryKey: ['admin-overview'] }); }
    catch (e) { toast.error(apiError(e, t('Action impossible pour le moment.'))); }
  };

  const rows = data.filter((d: any) =>
    (filter === 'Tous' || (filter === 'À valider' && !d.validated) || (filter === 'Validés' && d.validated)
      || (filter === 'En ligne' && d.online) || (filter === 'Abonnés' && d.subscriptionEndsAt))
    && `${d.name} ${d.email} ${d.phone}`.toLowerCase().includes(q.toLowerCase()));

  if (isLoading) return <Loading />;
  return (
    <Page title={t('Chauffeurs')} subtitle={t('{n} chauffeurs inscrits', { n: data.length })}>
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap ${filter === f ? 'bg-orange-btn text-white' : 'bg-foreground/5 text-foreground/60'}`}>{t(f)}</button>
          ))}
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Rechercher un chauffeur…')} aria-label={t('Rechercher un chauffeur…')}
          className="w-full md:w-72 px-4 py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 outline-none focus:border-orange-btn text-sm" />
      </div>

      <Card className="p-0 md:p-0 overflow-hidden">
        {rows.length === 0 ? <Empty text={t('Aucun chauffeur ne correspond.')} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-foreground/45 text-left">
                <tr className="border-b border-foreground/10">
                  <th className="p-4">{t('Chauffeur')}</th><th className="p-4">{t('Statut')}</th><th className="p-4">{t('Courses')}</th>
                  <th className="p-4">{t('Abonnement')}</th><th className="p-4 text-right">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d: any) => (
                  <tr key={d.id} className="border-b border-foreground/5 last:border-0">
                    <td className="p-4">
                      <p className="font-black">{d.name ?? '—'}</p>
                      <p className="text-[11px] text-foreground/50">{d.email} {d.phone && `· ${d.phone}`}</p>
                    </td>
                    <td className="p-4 space-x-1 whitespace-nowrap">
                      {d.validated ? <Badge tone="green">{t('Validé')}</Badge> : <Badge tone="red">{t('À valider')}</Badge>}
                      {d.online && <Badge tone="blue">{t('En ligne')}</Badge>}
                    </td>
                    <td className="p-4 font-bold">{d.completedRides}</td>
                    <td className="p-4 text-xs font-bold">{d.subscriptionEndsAt ? t("Jusqu'au {date}", { date: fmtDate(d.subscriptionEndsAt, lang) }) : <span className="text-foreground/40">{t('Commission par course')}</span>}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      {d.validated
                        ? <button onClick={() => act(() => platformService.admin.suspendDriver(d.id), 'Chauffeur suspendu')} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[11px] font-black">{t('Suspendre')}</button>
                        : <button onClick={() => act(() => platformService.admin.validateDriver(d.id), 'Chauffeur validé')} className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-[11px] font-black">{t('Valider')}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}
