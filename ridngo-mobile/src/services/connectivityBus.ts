/**
 * Petit bus d'évènements (hors React) qui permet à axios (api.ts) de signaler
 * un échec/succès réseau réel, en complément de NetInfo.
 *
 * Pourquoi : sur iPhone (Expo Go), NetInfo ne réagit pas toujours immédiatement
 * (ni de façon fiable) au mode avion. Mais un vrai appel API qui échoue avec
 * "Network Error" est une preuve directe et immédiate qu'on est hors ligne —
 * donc plus fiable que d'attendre l'évènement natif.
 */
type Listener = (online: boolean) => void;
const listeners = new Set<Listener>();

export function reportConnectivity(online: boolean) {
  listeners.forEach(l => l(online));
}

export function subscribeConnectivity(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
