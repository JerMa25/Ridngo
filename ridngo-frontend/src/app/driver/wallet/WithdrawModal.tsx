/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, X, XCircle } from 'lucide-react';
import { rideService } from '@/lib/rideService';

const METHODS = [
  { value: 'MTN_MOBILE_MONEY', label: 'MTN MoMo' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
];
const MIN_AMOUNT = 100;

type Step = 'form' | 'code' | 'done' | 'failed';
type Errors = Partial<Record<'amount' | 'phone' | 'name' | 'code', string>>;

/** Retrait du wallet vers le Mobile Money, en 2 étapes Kernel : code de confirmation, puis envoi. */
export default function WithdrawModal({ balance, onClose, onDone }: { balance: number; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('MTN_MOBILE_MONEY');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const full = JSON.parse(localStorage.getItem('user-full') || '{}');
      setPhone(u.phone || '');
      // le pseudo ne correspond jamais au nom du compte Mobile Money : prénom + nom du profil
      setName([full.firstName, full.lastName].filter(Boolean).join(' '));
    } catch { /* profil absent */ }
  }, []);

  const cleanPhone = phone.replace(/\s/g, '');

  // Message précis par champ plutôt qu'une erreur générique après l'appel
  const validateForm = (): Errors => {
    const e: Errors = {};
    const value = Number(amount);
    if (!amount.trim()) e.amount = 'Indiquez le montant à retirer.';
    else if (!Number.isFinite(value) || value <= 0) e.amount = 'Montant invalide.';
    else if (value < MIN_AMOUNT) e.amount = `Minimum ${MIN_AMOUNT} FCFA.`;
    else if (value > balance) e.amount = `Solde insuffisant : ${balance.toLocaleString()} FCFA disponibles.`;
    if (!cleanPhone) e.phone = 'Indiquez le numéro Mobile Money qui recevra l’argent.';
    else if (!/^\+?\d{8,15}$/.test(cleanPhone)) e.phone = 'Numéro invalide (ex. 6XXXXXXXX).';
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) e.name = 'Nom et prénom exactement comme sur le compte Mobile Money.';
    return e;
  };

  const requestCode = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validateForm();
    setErrors(e); setServerError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const res = await rideService.startWithdrawal(Number(amount), cleanPhone);
      setChallengeToken(res.challengeToken);
      setStep('code');
    } catch (err: any) {
      setServerError(err.response?.data?.detail || err.response?.data?.message || 'Retrait impossible pour le moment.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!/^\d{4,8}$/.test(code.trim())) { setErrors({ code: 'Saisissez le code reçu (4 à 8 chiffres).' }); return; }
    setErrors({}); setServerError(''); setBusy(true);
    try {
      await rideService.confirmWithdrawal({ amount: Number(amount), phoneNumber: cleanPhone, method, recipientName: name.trim(), challengeToken, code: code.trim() });
      setStep('done');
      onDone();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Le retrait a été refusé.';
      // code faux ou expiré : on reste sur l'étape du code ; autre refus (nom, solde…) : écran d'échec
      if (/code|challenge|expir/i.test(msg)) setErrors({ code: msg }); else { setServerError(msg); setStep('failed'); }
    } finally {
      setBusy(false);
    }
  };

  const field = (bad?: string) =>
    `w-full bg-foreground/5 border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-btn text-foreground text-sm font-bold mt-1 ${bad ? 'border-red-500' : 'border-foreground/10'}`;
  const label = "text-[10px] font-black uppercase tracking-widest text-foreground/40";
  const errorText = (msg?: string, id?: string) => msg ? <p id={id} role="alert" className="text-[11px] font-bold text-red-500 mt-1">{msg}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="withdraw-title"
        className="relative w-full max-w-sm bg-background text-foreground rounded-3xl shadow-2xl border border-foreground/10 p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} aria-label="Fermer" className="absolute top-4 right-4 text-foreground/40 hover:text-orange-btn"><X size={20} /></button>
        <h2 id="withdraw-title" className="text-xl font-black mb-1">Retirer de l’argent</h2>
        <p className="text-xs text-foreground/50 mb-5">Solde disponible : <span className="font-black text-foreground">{balance.toLocaleString()} FCFA</span></p>

        {step === 'form' && (
          <form onSubmit={requestCode} noValidate className="space-y-4">
            <div>
              <label htmlFor="w-amount" className={label}>Montant (FCFA)</label>
              <input id="w-amount" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`${MIN_AMOUNT} – ${balance}`}
                aria-invalid={!!errors.amount} aria-describedby="w-amount-err" className={field(errors.amount)} />
              {errorText(errors.amount, 'w-amount-err')}
              {balance >= MIN_AMOUNT && <button type="button" onClick={() => setAmount(String(balance))} className="text-[11px] font-black text-orange-btn mt-1 hover:underline">Tout retirer</button>}
            </div>
            <div role="radiogroup" aria-label="Opérateur" className="grid grid-cols-2 gap-2">
              {METHODS.map(m => (
                <button type="button" role="radio" aria-checked={method === m.value} key={m.value} onClick={() => setMethod(m.value)}
                  className={`py-2.5 rounded-xl text-xs font-black border ${method === m.value ? 'border-orange-btn bg-orange-btn/10 text-orange-btn' : 'border-foreground/10 text-foreground/60'}`}>{m.label}</button>
              ))}
            </div>
            <div>
              <label htmlFor="w-phone" className={label}>Numéro Mobile Money</label>
              <input id="w-phone" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="6XXXXXXXX"
                aria-invalid={!!errors.phone} aria-describedby="w-phone-err" className={field(errors.phone)} />
              {errorText(errors.phone, 'w-phone-err')}
            </div>
            <div>
              <label htmlFor="w-name" className={label}>Nom du titulaire du compte</label>
              <input id="w-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Nom Prénom"
                aria-invalid={!!errors.name} aria-describedby="w-name-err" className={field(errors.name)} />
              {errorText(errors.name, 'w-name-err')}
              <p className="text-[10px] text-foreground/40 mt-1">L’opérateur vérifie ce nom avant d’envoyer l’argent.</p>
            </div>
            {serverError && <p role="alert" className="text-xs font-bold text-red-500 bg-red-500/10 rounded-xl p-3">{serverError}</p>}
            <button type="submit" disabled={busy} className="w-full bg-orange-btn text-white py-3.5 rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 size={18} className="animate-spin" /> : 'Recevoir le code de confirmation'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={confirm} noValidate className="space-y-4">
            <div className="text-center space-y-2">
              <ShieldCheck size={36} className="mx-auto text-orange-btn" />
              <p className="text-sm font-bold">Un code de confirmation vient de vous être envoyé.</p>
              <p className="text-xs text-foreground/60">Retrait de {Number(amount).toLocaleString()} FCFA vers le {cleanPhone}.</p>
            </div>
            <div>
              <label htmlFor="w-code" className={label}>Code reçu</label>
              <input id="w-code" autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)}
                aria-invalid={!!errors.code} aria-describedby="w-code-err" className={`${field(errors.code)} text-center tracking-[0.4em] text-lg`} />
              {errorText(errors.code, 'w-code-err')}
            </div>
            <button type="submit" disabled={busy} className="w-full bg-orange-btn text-white py-3.5 rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 size={18} className="animate-spin" /> : 'Confirmer le retrait'}
            </button>
            <button type="button" onClick={() => { setStep('form'); setCode(''); setErrors({}); }} className="w-full text-xs font-bold text-foreground/50 hover:text-orange-btn">← Modifier le retrait</button>
          </form>
        )}

        {step === 'done' && (
          <div className="text-center space-y-3 py-2">
            <CheckCircle2 size={44} className="mx-auto text-green-500" />
            <p className="font-black">Retrait de {Number(amount).toLocaleString()} FCFA envoyé</p>
            <p className="text-xs text-foreground/60">L’argent arrive sur le {cleanPhone} dans quelques instants.</p>
            <button onClick={onClose} className="w-full bg-orange-btn text-white py-3 rounded-xl font-black">Terminer</button>
          </div>
        )}

        {step === 'failed' && (
          <div className="text-center space-y-3 py-2">
            <XCircle size={44} className="mx-auto text-red-500" />
            <p role="alert" className="text-sm font-bold">{serverError}</p>
            <button onClick={() => { setStep('form'); setServerError(''); setCode(''); }} className="w-full bg-orange-btn text-white py-3 rounded-xl font-black">Corriger et réessayer</button>
          </div>
        )}
      </div>
    </div>
  );
}
