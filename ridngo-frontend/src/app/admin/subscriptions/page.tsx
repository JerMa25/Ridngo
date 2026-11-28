/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Crown, Wallet } from 'lucide-react';
import { Page, Card, Loading, Empty, Badge, Stat, fcfa, fmtDate } from '@/components/ui/Page';
import { platformService } from '@/lib/platformService';
import { useI18n } from '@/lib/i18n';

export default function AdminSubscriptions() {
  const { t, lang } = useI18n();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-subscriptions'], queryFn: platformService.admin.subscriptions });
  const { data: drivers = [] } = useQuery({ queryKey: ['admin-drivers'], queryFn: platformService.admin.drivers });
  const name = (id: string) => drivers.find((d: any) => d.id === id)?.name ?? id.slice(0, 8);
  const [now] = useState(() => Date.now());
  const active = data.filter(s => new Date(s.startsAt).getTime() <= now && new Date(s.endsAt).getTime() > now);

  if (isLoading) return <Loading />;
  return (
    <Page title={t('Abonnements')} subtitle={t('Packs mensuels et annuels payés par les chauffeurs')}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Stat icon={Crown} label={t('Abonnements actifs')} value={active.length} tone="blue" />
        <Stat icon={Wallet} label={t('Total encaissé')} value={fcfa(data.reduce((sum, s) => sum + s.amount, 0))} tone="green" />
      </div>
      <Card className="p-0 md:p-0 overflow-hidden">
        {data.length === 0 ? <Empty text={t("Aucun abonnement pour l'instant.")} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-foreground/45 text-left">
                <tr className="border-b border-foreground/10">
                  <th className="p-4">{t('Chauffeur')}</th><th className="p-4">{t('Pack')}</th><th className="p-4">{t('Montant')}</th>
                  <th className="p-4">{t('Période')}</th><th className="p-4">{t('Statut')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(s => {
                  const isActive = active.includes(s);
                  return (
                    <tr key={s.id} className="border-b border-foreground/5 last:border-0">
                      <td className="p-4 font-black">{name(s.driverId)}</td>
                      <td className="p-4">{t(s.plan === 'YEARLY' ? 'Annuel' : 'Mensuel')}</td>
                      <td className="p-4 font-black whitespace-nowrap">{fcfa(s.amount)}</td>
                      <td className="p-4 text-xs whitespace-nowrap">{fmtDate(s.startsAt, lang)} → {fmtDate(s.endsAt, lang)}</td>
                      <td className="p-4">{isActive ? <Badge tone="green">{t('Actif')}</Badge> : new Date(s.startsAt).getTime() > now ? <Badge tone="blue">{t('À venir')}</Badge> : <Badge>{t('Expiré')}</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}
