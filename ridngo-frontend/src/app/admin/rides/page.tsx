/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Page, Card, Loading, Empty, fcfa, fmtDate } from '@/components/ui/Page';
import { platformService } from '@/lib/platformService';
import { useI18n } from '@/lib/i18n';
import { StateBadge } from '../states';

export default function AdminRides() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<'rides' | 'offers'>('rides');
  const rides = useQuery({ queryKey: ['admin-rides'], queryFn: platformService.admin.rides, refetchInterval: 15000 });
  const offers = useQuery({ queryKey: ['admin-offers'], queryFn: platformService.admin.offers, refetchInterval: 15000 });
  const current = tab === 'rides' ? rides : offers;

  return (
    <Page title={t('Courses')} subtitle={t('Suivi en direct des courses et des demandes des passagers')}>
      <div className="flex gap-2">
        {([['rides', 'Courses'], ['offers', 'Offres des passagers']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-xl text-xs font-black ${tab === k ? 'bg-orange-btn text-white' : 'bg-foreground/5 text-foreground/60'}`}>{t(label)}</button>
        ))}
      </div>
      {current.isLoading ? <Loading /> : (
        <Card className="p-0 md:p-0 overflow-hidden">
          {(current.data ?? []).length === 0 ? <Empty text={t('Rien pour le moment.')} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-foreground/45 text-left">
                  <tr className="border-b border-foreground/10">
                    <th className="p-4">{t('Trajet')}</th><th className="p-4">{t('Passager')}</th>
                    {tab === 'rides' && <th className="p-4">{t('Chauffeur')}</th>}
                    <th className="p-4">{t('Prix')}</th><th className="p-4">{t('Statut')}</th><th className="p-4">{t('Date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(current.data ?? []).map((r: any) => (
                    <tr key={r.id} className="border-b border-foreground/5 last:border-0">
                      <td className="p-4 max-w-72"><p className="font-bold truncate">{r.from ?? '—'}</p><p className="text-[11px] text-foreground/50 truncate">→ {r.to ?? '—'}</p></td>
                      <td className="p-4 font-bold">{r.passenger ?? '—'}</td>
                      {tab === 'rides' && <td className="p-4 font-bold">{r.driver ?? '—'}</td>}
                      <td className="p-4 font-black whitespace-nowrap">{fcfa(r.price)}</td>
                      <td className="p-4"><StateBadge state={r.state} /></td>
                      <td className="p-4 text-xs text-foreground/55 whitespace-nowrap">{fmtDate(r.createdAt, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </Page>
  );
}
