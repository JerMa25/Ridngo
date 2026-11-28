/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Smartphone, X, XCircle } from 'lucide-react';
import { rideService } from '@/lib/rideService';
import { RechargeOrder } from '@/types/api';
import { tr } from '@/lib/i18n';

// ORANGE_MONEY / MTN_MOBILE_MONEY directs : acceptés par le Kernel mais aucune demande n'arrive sur le
// téléphone (testé en réel). MOBILE_MONEY passe par la page MyCoolPay, où l'opérateur est choisi.
const METHODS = [
  { value: 'MOBILE_MONEY', label: 'Mobile Money (Orange / MTN)' },
  { value: 'CARD', label: 'Carte bancaire' },
];
const QUICK_AMOUNTS = [500, 1000, 2000];
const SUCCESS = ['SUCCESS', 'SUCCEEDED', 'COMPLETED', 'PAID'];
const FAILURE = ['FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'REJECTED'];
const POLL_MS = 5000;
const POLL_MAX_MS = 3 * 60 * 1000;

type Step = 'form' | 'waiting' | 'paid' | 'failed';

/** Recharge du wallet via le paiement du Kernel (MyCoolPay / Stripe), suivie jusqu'à confirmation. */
export default function RechargeModal({ onClose, onPaid }: { onClose: () => void; onPaid: () => void }) {
  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState('500');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('MOBILE_MONEY');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<RechargeOrder | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try { setPhone(JSON.parse(localStorage.getItem('user') || '{}').phone || ''); } catch { /* profil absent */ }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Le Kernel confirme le paiement de façon asynchrone : on rafraîchit l'ordre jusqu'à un statut final
  const followOrder = (orderId: string) => {
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      try {
        const o = await rideService.refreshRechargeOrder(orderId);
        setOrder(o);
        const status = (o?.status || '').toUpperCase();
        if (SUCCESS.includes(status)) { clearInterval(pollRef.current!); setStep('paid'); onPaid(); }
        else if (FAILURE.includes(status)) { clearInterval(pollRef.current!); setStep('failed'); setError(`Paiement ${status.toLowerCase()}.`); }
      } catch { /* réseau : on retente au prochain tour */ }
      if (Date.now() - startedAt > POLL_MAX_MS) {
        clearInterval(pollRef.current!);
        setStep('failed');
        setError(tr("Pas de confirmation après 3 minutes. Si vous avez validé, le solde se mettra à jour sous peu."));
      }
    }, POLL_MS);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 100) { setError(tr("Montant minimum : 100 FCFA.")); return; }
    if (method !== 'CARD' && !/^\+?\d{8,15}$/.test(phone.replace(/\s/g, ''))) { setError(tr("Numéro Mobile Money invalide.")); return; }
    setBusy(true); setError('');
    try {
      const o = await rideService.rechargeWallet(value, phone.replace(/\s/g, ''), method);
      setOrder(o);
      setStep('waiting');
      followOrder(o.orderId);
      // MyCoolPay n'envoie la demande au téléphone qu'après validation sur sa page : on l'ouvre toujours
      if (o.redirectUrl) window.open(o.redirectUrl, '_blank', 'noopener');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || tr("Recharge impossible pour le moment."));
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full bg-foreground/5 border border-foreground/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-btn text-foreground text-sm font-bold";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === 'waiting' ? undefined : onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="recharge-title"
        className="relative w-full max-w-sm bg-background text-foreground rounded-3xl shadow-2xl border border-foreground/10 p-6">
        <button onClick={onClose} aria-label={tr("Fermer")} className="absolute top-4 right-4 text-foreground/40 hover:text-orange-btn"><X size={20} /></button>
        <h2 id="recharge-title" className="text-xl font-black mb-1">{tr("Recharger mon wallet")}</h2>
        <p className="text-xs text-foreground/50 mb-5">{tr("Paiement sécurisé par le Kernel Yowyob")}</p>

        {step === 'form' && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{tr("Montant (FCFA)")}</label>
              <input inputMode="numeric" aria-label={tr("Montant en FCFA")} value={amount} onChange={e => setAmount(e.target.value)} className={`${field} mt-1`} />
              <div className="flex gap-2 mt-2">
                {QUICK_AMOUNTS.map(a => (
                  <button type="button" key={a} onClick={() => setAmount(String(a))}
                    className={`flex-1 py-2 rounded-lg text-xs font-black ${amount === String(a) ? 'bg-orange-btn text-white' : 'bg-foreground/5 text-foreground/60'}`}>{a}</button>
                ))}
              </div>
            </div>
            <div role="radiogroup" aria-label={tr("Mode de paiement")} className="grid grid-cols-2 gap-2">
              {METHODS.map(m => (
                <button type="button" role="radio" aria-checked={method === m.value} key={m.value} onClick={() => setMethod(m.value)}
                  className={`py-2.5 rounded-xl text-xs font-black border ${method === m.value ? 'border-orange-btn bg-orange-btn/10 text-orange-btn' : 'border-foreground/10 text-foreground/60'}`}>{tr(m.label)}</button>
              ))}
            </div>
            {method !== 'CARD' && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{tr("Numéro Mobile Money")}</label>
                <input inputMode="tel" autoComplete="tel" aria-label={tr("Numéro Mobile Money")} value={phone} onChange={e => setPhone(e.target.value)} placeholder="6XXXXXXXX" className={`${field} mt-1`} />
              </div>
            )}
            {error && <p role="alert" className="text-xs font-bold text-red-500">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-orange-btn text-white py-3.5 rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 size={18} className="animate-spin" /> : `Valider ${Number(amount) > 0 ? Number(amount).toLocaleString() + ' FCFA' : ''}`}
            </button>
          </form>
        )}

        {step === 'waiting' && (
          <div className="text-center space-y-4 py-2" aria-live="polite">
            <Smartphone size={40} className="mx-auto text-orange-btn" />
            <p className="font-black">{method === 'CARD' ? tr("Finalisez le paiement par carte") : tr("Validez sur MyCoolPay, puis sur votre téléphone")}</p>
            <p className="text-xs text-foreground/60">
              {method === 'CARD'
                ? tr("Une page de paiement sécurisée vient de s’ouvrir.")
                : tr('1. Ouvrez la page de paiement et cliquez « Submit ». 2. Composez votre code secret sur le {phone} pour confirmer {amount} FCFA.', { phone, amount: Number(amount).toLocaleString() })}
            </p>
            <Loader2 size={22} className="mx-auto animate-spin text-foreground/40" />
            <p className="text-[10px] uppercase tracking-widest text-foreground/40">{tr("Statut : ")}{order?.status || tr("en attente")}</p>
            {order?.redirectUrl && (
              // clic de l'utilisateur : le navigateur ne bloque pas l'ouverture (contrairement au window.open après l'await)
              <a href={order.redirectUrl} target="_blank" rel="noopener noreferrer"
                className="w-full bg-orange-btn text-white py-3.5 rounded-xl font-black flex items-center justify-center gap-2">
                {tr("Ouvrir la page de paiement ")}<ExternalLink size={16} />
              </a>
            )}
          </div>
        )}

        {step === 'paid' && (
          <div className="text-center space-y-3 py-2">
            <CheckCircle2 size={44} className="mx-auto text-green-500" />
            <p className="font-black">{tr("Wallet rechargé de ")}{Number(amount).toLocaleString()} FCFA</p>
            <button onClick={onClose} className="w-full bg-orange-btn text-white py-3 rounded-xl font-black">{tr("Terminer")}</button>
          </div>
        )}

        {step === 'failed' && (
          <div className="text-center space-y-3 py-2">
            <XCircle size={44} className="mx-auto text-red-500" />
            <p role="alert" className="text-sm font-bold">{error}</p>
            <button onClick={() => { setStep('form'); setError(''); }} className="w-full bg-orange-btn text-white py-3 rounded-xl font-black">{tr("Réessayer")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
