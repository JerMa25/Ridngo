"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, Check, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { Page, Card, Loading, Badge, fcfa, fmtDate } from '@/components/ui/Page';
import { platformService, apiError, type Plan } from '@/lib/platformService';
import { useI18n } from '@/lib/i18n';

export default function DriverSubscription() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ['plans'], queryFn: platformService.plans });
  const mine = useQuery({ queryKey: ['my-subscription'], queryFn: platformService.mySubscription });
  const [pending, setPending] = useState<{ plan: Plan; challengeToken: string; reference: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [codeError, setCodeError] = useState('');

  const start = async (plan: Plan) => {
    setBusy(plan.id); setCodeError('');
    try {
      const res = await platformService.startSubscription(plan.id);
      setPending({ plan, challengeToken: res.challengeToken, reference: res.reference });
      setCode('');
    } catch (e) { toast.error(apiError(e, t('Action impossible pour le moment.'))); }
    finally { setBusy(null); }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    if (!/^\d{4,8}$/.test(code.trim())) { setCodeError(t('Saisissez le code reçu (4 à 8 chiffres).')); return; }
    setBusy('confirm'); setCodeError('');
    try {
      const sub = await platformService.confirmSubscription({ plan: pending.plan.id, reference: pending.reference, challengeToken: pending.challengeToken, code: code.trim() });
      toast.success(t("Abonnement activé jusqu'au {date}", { date: fmtDate(sub.endsAt, lang) }));
      setPending(null);
      qc.invalidateQueries({ queryKey: ['my-subscription'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
    } catch (err) { setCodeError(apiError(err, t('Paiement refusé, réessayez.'))); }
    finally { setBusy(null); }
  };

  if (plans.isLoading || mine.isLoading) return <Loading />;
  const rate = Math.round((plans.data?.commissionRate ?? 0) * 1000) / 10;
  const status = mine.data;

  return (
    <Page title={t('Abonnement')} subtitle={t('Payez une fois, roulez sans commission sur chaque course.')}>
      <Card className={status?.active ? 'border-green-500/40' : ''}>
        <div className="flex flex-wrap items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${status?.active ? 'bg-green-500/15 text-green-500' : 'bg-orange-btn/10 text-orange-btn'}`}>
            {status?.active ? <ShieldCheck size={24} /> : <Crown size={24} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black">{status?.active ? t('Abonnement actif') : t('Sans abonnement')}</p>
            <p className="text-sm text-foreground/55">
              {status?.active
                ? t("Aucune commission jusqu'au {date}.", { date: fmtDate(status.endsAt, lang) })
                : t('Une commission de {rate} % est prélevée sur chaque course acceptée.', { rate })}
            </p>
          </div>
          <Link href="/driver/wallet" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground/5 text-xs font-black"><Wallet size={15} /> {t('Recharger mon portefeuille')}</Link>
        </div>
      </Card>

      {plans.data && !plans.data.enabled ? (
        <Card><p className="text-sm font-bold text-foreground/60">{t('Les abonnements sont désactivés pour le moment.')}</p></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {plans.data?.plans.map(plan => {
            const yearly = plan.id === 'YEARLY';
            const monthly = plans.data!.plans.find(p => p.id === 'MONTHLY')?.price ?? 0;
            const saving = yearly && monthly ? Math.round((1 - plan.price / (monthly * 12)) * 100) : 0;
            return (
              <Card key={plan.id} className={yearly ? 'border-orange-btn/50' : ''}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black">{t(yearly ? 'Pack annuel' : 'Pack mensuel')}</h3>
                  {saving > 0 && <Badge tone="orange">{t('{n} % d’économie', { n: saving })}</Badge>}
                </div>
                <p className="text-3xl font-black mt-3">{fcfa(plan.price)}<span className="text-sm text-foreground/45 font-bold"> / {t(yearly ? 'an' : 'mois')}</span></p>
                <ul className="mt-4 space-y-2 text-sm">
                  {['0 % de commission sur toutes vos courses', 'Plus de code à saisir pour accepter une course', 'Renouvelable : la période s’ajoute à la suite'].map(f => (
                    <li key={f} className="flex items-start gap-2"><Check size={16} className="text-green-500 mt-0.5 shrink-0" /> {t(f)}</li>
                  ))}
                </ul>
                <button onClick={() => start(plan)} disabled={!!busy}
                  className={`mt-5 w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${yearly ? 'bg-orange-btn text-white' : 'bg-foreground/10'}`}>
                  {busy === plan.id && <Loader2 size={16} className="animate-spin" />}
                  {t(status?.active ? 'Prolonger avec ce pack' : 'Choisir ce pack')}
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {status && status.history.length > 0 && (
        <Card>
          <h3 className="font-black mb-3">{t('Historique')}</h3>
          <ul className="divide-y divide-foreground/5">
            {status.history.map(s => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-bold">{t(s.plan === 'YEARLY' ? 'Pack annuel' : 'Pack mensuel')}</span>
                <span className="text-foreground/55 text-xs">{fmtDate(s.startsAt, lang)} → {fmtDate(s.endsAt, lang)}</span>
                <span className="font-black">{fcfa(s.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {pending && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-label={t('Confirmer le paiement')}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setPending(null)} />
          <form onSubmit={confirm} className="relative w-full max-w-sm bg-background border border-foreground/10 rounded-3xl p-6 space-y-4 text-center">
            <h3 className="text-lg font-black">{t('Confirmer le paiement')}</h3>
            <p className="text-sm text-foreground/60">{t('{amount} seront débités de votre portefeuille. Saisissez le code de confirmation reçu.', { amount: fcfa(pending.plan.price) })}</p>
            <input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" autoFocus aria-invalid={!!codeError}
              aria-label={t('Code de confirmation')} placeholder="••••••"
              className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 outline-none focus:border-orange-btn text-center text-xl font-black tracking-[0.4em]" />
            {codeError && <p role="alert" className="text-xs font-bold text-red-500">{codeError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setPending(null)} className="flex-1 py-3 rounded-xl bg-foreground/5 font-black text-sm">{t('Annuler')}</button>
              <button disabled={busy === 'confirm'} className="flex-1 py-3 rounded-xl bg-orange-btn text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {busy === 'confirm' && <Loader2 size={16} className="animate-spin" />} {t('Payer')}
              </button>
            </div>
          </form>
        </div>
      )}
    </Page>
  );
}
