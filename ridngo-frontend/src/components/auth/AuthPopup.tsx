"use client"
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { login, confirmMfa, register, getCaptcha, resendVerification, AuthResult } from '@/lib/auth';
import { tr } from '@/lib/i18n';

type Mode = 'login' | 'register';
type Role = 'RIDE_AND_GO_PASSENGER' | 'RIDE_AND_GO_DRIVER';

/** Fenêtre unique « Yowyob One ID » : connexion (avec code MFA) et inscription, branchées sur l'auth Kernel. */
export default function AuthPopup({ mode, initialRole = 'RIDE_AND_GO_PASSENGER', notice = '' }:
  { mode: Mode; initialRole?: Role; notice?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(notice);

  // Connexion
  const [principal, setPrincipal] = useState('');
  const [password, setPassword] = useState('');
  const [mfa, setMfa] = useState<{ mfaToken: string; channel: string } | null>(null);
  const [code, setCode] = useState('');

  // Inscription
  const [role, setRole] = useState<Role>(initialRole);
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', email: '', phone: '', password: '' });
  const [captcha, setCaptcha] = useState<{ captchaToken: string; prompt: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const loadCaptcha = useCallback(async () => {
    setCaptchaAnswer('');
    try { setCaptcha(await getCaptcha()); } catch { setError(tr("Impossible de charger la vérification anti-robot.")); }
  }, []);

  useEffect(() => { if (mode === 'register') loadCaptcha(); }, [mode, loadCaptcha]);

  const handle = (res: AuthResult) => {
    if (!res.success) { setError(res.message); return; }
    if ('redirectUrl' in res) { window.location.href = res.redirectUrl; return; }
    if ('mfa' in res) { setMfa(res.mfa); setInfo(tr(res.mfa.channel === 'SMS' ? 'Un code vous a été envoyé par SMS.' : 'Un code vous a été envoyé par email.')); return; }
    setInfo(tr("Compte créé ! Confirmez votre adresse via le lien reçu par email, puis connectez-vous."));
    router.push('/login?verify=1');
  };

  const run = async (fn: () => Promise<AuthResult>) => {
    setBusy(true); setError('');
    try { handle(await fn()); } finally { setBusy(false); }
  };

  const onLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => mfa ? confirmMfa(mfa.mfaToken, code) : login(principal.trim(), password));
  };

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { setError(tr("Le mot de passe doit contenir au moins 8 caractères.")); return; }
    await run(() => register({ ...form, captchaToken: captcha?.captchaToken, captchaAnswer }, role));
    loadCaptcha(); // un défi Kernel ne sert qu'une fois
  };

  const field = "w-full bg-foreground/5 border border-foreground/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-btn text-foreground text-sm";
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/auth.png')" }} />
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        role="dialog" aria-modal="true" aria-labelledby="auth-title"
        className="relative w-full max-w-sm bg-background text-foreground rounded-3xl shadow-2xl border border-foreground/10 p-7 my-8">
        <Link href="/" aria-label={tr("Fermer")} className="absolute top-4 right-4 text-foreground/40 hover:text-orange-btn"><X size={20} /></Link>

        <div className="text-center mb-6">
          <div className="mx-auto mb-3 w-11 h-11 rounded-2xl bg-orange-btn text-white grid place-items-center font-black text-lg">Y</div>
          <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{tr("Yowyob One ID · Ride&Go")}</p>
          <h1 id="auth-title" className="text-2xl font-black mt-1">
            {mode === 'register' ? tr("Créer un compte") : mfa ? tr("Vérification") : tr("Connexion")}
          </h1>
        </div>

        {info && <p className="mb-4 text-sm rounded-xl bg-green-500/10 text-green-700 dark:text-green-400 p-3">{info}</p>}
        {error && <p role="alert" className="mb-4 text-sm rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 p-3">{error}</p>}
        {mode === 'login' && error.includes("pas encore vérifié") && principal.trim() && (
          <button type="button" disabled={busy}
            onClick={async () => {
              setBusy(true);
              try { await resendVerification(principal.trim()); setError(''); setInfo(tr("Email de vérification renvoyé. Cliquez sur le lien reçu, puis reconnectez-vous.")); }
              catch { setError(tr("Impossible de renvoyer l'email pour le moment.")); }
              finally { setBusy(false); }
            }}
            className="mb-4 w-full text-sm font-black text-orange-btn hover:underline disabled:opacity-60">
            {tr("Renvoyer l'email de vérification")}</button>
        )}

        {mode === 'login' ? (
          <form onSubmit={onLogin} className="space-y-3">
            {mfa ? (
              <input required autoFocus inputMode="numeric" autoComplete="one-time-code" aria-label={tr("Code de vérification")}
                placeholder={tr("Code reçu")} className={`${field} text-center tracking-[0.5em] text-lg`} value={code} onChange={e => setCode(e.target.value)} />
            ) : (
              <>
                <input required autoFocus aria-label={tr("Nom d'utilisateur ou email Yowyob")} autoComplete="username"
                  placeholder={tr("Nom d'utilisateur ou email Yowyob")} className={field} value={principal} onChange={e => setPrincipal(e.target.value)} />
                <input required type="password" aria-label={tr("Mot de passe")} autoComplete="current-password"
                  placeholder={tr("Mot de passe")} className={field} value={password} onChange={e => setPassword(e.target.value)} />
              </>
            )}
            <button disabled={busy} type="submit" className="w-full bg-orange-btn text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="animate-spin" size={18} /> : mfa ? tr("Valider le code") : tr("Se connecter")}
            </button>
            {mfa && (
              <button type="button" onClick={() => { setMfa(null); setCode(''); setInfo(''); }} className="w-full text-xs font-bold text-foreground/50 hover:text-orange-btn">
                {tr("← Changer de compte")}</button>
            )}
          </form>
        ) : (
          <form onSubmit={onRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-foreground/5" role="radiogroup" aria-label={tr("Je suis")}>
              {(['RIDE_AND_GO_PASSENGER', 'RIDE_AND_GO_DRIVER'] as Role[]).map(r => (
                <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
                  className={`py-2 rounded-lg text-xs font-black uppercase ${role === r ? 'bg-orange-btn text-white' : 'text-foreground/50'}`}>
                  {r === 'RIDE_AND_GO_DRIVER' ? tr("Chauffeur") : tr("Passager")}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input required aria-label={tr("Prénom")} autoComplete="given-name" placeholder={tr("Prénom")} className={field} onChange={set('firstName')} />
              <input required aria-label={tr("Nom")} autoComplete="family-name" placeholder={tr("Nom")} className={field} onChange={set('lastName')} />
            </div>
            <input required aria-label={tr("Nom d'utilisateur")} autoComplete="username" placeholder={tr("Nom d'utilisateur")} className={field} onChange={set('username')} />
            <input required type="email" aria-label={tr("Email")} autoComplete="email" placeholder={tr("Email")} className={field} onChange={set('email')} />
            <input required type="tel" aria-label={tr("Téléphone")} autoComplete="tel" placeholder={tr("Téléphone")} className={field} onChange={set('phone')} />
            <input required type="password" aria-label={tr("Mot de passe")} autoComplete="new-password" placeholder={tr("Mot de passe (8 caractères min.)")} className={field} onChange={set('password')} />
            <div className="flex items-center justify-between text-xs font-bold text-foreground/60">
              <span>{tr("Anti-robot : combien font ")}{captcha ? captcha.prompt : '…'} ?</span>
              <button type="button" onClick={loadCaptcha} aria-label={tr("Nouvelle question")} className="hover:text-orange-btn"><RefreshCw size={14} /></button>
            </div>
            <input required inputMode="numeric" aria-label={tr("Réponse anti-robot")} placeholder={tr("Réponse")} className={field} value={captchaAnswer} onChange={e => setCaptchaAnswer(e.target.value)} />
            <button disabled={busy || !captcha} type="submit" className="w-full bg-orange-btn text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="animate-spin" size={18} /> : tr("Créer mon compte")}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-foreground/50">
          {mode === 'login'
            ? <>{tr("Pas encore de compte ? ")}<Link href="/register" className="text-orange-btn font-black hover:underline">{tr("S'inscrire")}</Link></>
            : <>{tr("Déjà inscrit ? ")}<Link href="/login" className="text-orange-btn font-black hover:underline">{tr("Se connecter")}</Link></>}
        </p>
      </motion.div>
    </div>
  );
}
