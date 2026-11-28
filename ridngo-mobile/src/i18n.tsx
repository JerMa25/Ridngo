import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import en from './locales/en';

export type Lang = 'fr' | 'en';
type Vars = Record<string, string | number>;

// Le texte français sert de clé : une chaîne sans traduction anglaise s'affiche telle quelle
const DICTS: Record<Lang, Record<string, string>> = { fr: {}, en };

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;

// Langue courante hors composants (services, Alert)
let current: Lang = 'fr';
// les espaces autour du texte (JSX " Solde : ") sont conservés, la clé est le texte rogné
const translate = (lang: Lang, text: string, vars?: Vars) => {
  const core = text.trim();
  const out = fill(DICTS[lang][core] ?? core, vars);
  return core === text ? out : text.slice(0, text.indexOf(core)) + out + text.slice(text.indexOf(core) + core.length);
};
export const tr = (text: string, vars?: Vars) => translate(current, text, vars);

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: typeof tr }>({
  lang: 'fr', setLang: () => {}, t: (text, vars) => fill(text, vars),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    SecureStore.getItemAsync('lang').then(v => { if (v === 'en') { current = 'en'; setLangState('en'); } }).catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    current = l;
    setLangState(l);
    SecureStore.setItemAsync('lang', l, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }).catch(() => {});
  }, []);
  // dépend de lang pour re-rendre les écrans au changement de langue
  const t = useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
