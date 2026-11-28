"use client"
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import en from '@/locales/en';

export type Lang = 'fr' | 'en';
type Vars = Record<string, string | number>;

// Le texte français sert de clé : une chaîne sans traduction anglaise s'affiche telle quelle
const DICTS: Record<Lang, Record<string, string>> = { fr: {}, en };

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;

// les espaces autour du texte (JSX " Solde : ") sont conservés, la clé est le texte rogné
export const translate = (lang: Lang, text: string, vars?: Vars) => {
  const core = text.trim();
  const out = fill(DICTS[lang][core] ?? core, vars);
  return core === text ? out : text.slice(0, text.indexOf(core)) + out + text.slice(text.indexOf(core) + core.length);
};

// Langue courante pour tr() hors hooks ; l'arbre est remonté au changement de langue (voir I18nProvider)
let current: Lang = 'fr';
export const tr = (text: string, vars?: Vars) => translate(current, text, vars);

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (text: string, vars?: Vars) => string }>({
  lang: 'fr', setLang: () => {}, t: (text, vars) => fill(text, vars),
});

export const getLang = (): Lang => {
  try { return localStorage.getItem('lang') === 'en' ? 'en' : 'fr'; } catch { return 'fr'; }
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  // le rendu serveur est en français ; la langue enregistrée s'applique après le montage
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { current = getLang(); setLangState(current); }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l: Lang) => {
    current = l;
    setLangState(l);
    try { localStorage.setItem('lang', l); } catch { /* stockage indisponible */ }
  }, []);
  const t = useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);

  // key : remonte l'interface pour que chaque tr() du rendu reprenne la nouvelle langue
  return <I18nContext.Provider value={{ lang, setLang, t }}><React.Fragment key={lang}>{children}</React.Fragment></I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

/** Bouton FR / EN. */
export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
      title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
      aria-label={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
      className={`h-9 px-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-[11px] font-black tracking-widest text-foreground/70 transition-colors ${className}`}
    >
      {lang === 'fr' ? 'EN' : 'FR'}
    </button>
  );
}
