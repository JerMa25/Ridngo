/** Vide la session locale en gardant les préférences de l'appareil (langue, thème). */
export const clearSession = () => {
  const kept = ['lang', 'theme'].map(k => [k, localStorage.getItem(k)] as const);
  localStorage.clear();
  kept.forEach(([k, v]) => { if (v !== null) localStorage.setItem(k, v); });
};
