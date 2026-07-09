import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Petite couche de cache locale utilisée pour le mode hors-ligne.
 * Chaque entrée est préfixée pour ne jamais entrer en collision avec
 * d'autres clés utilisées ailleurs dans l'app (SecureStore, etc.).
 */
const PREFIX = '@ridngo_cache:';

export const CacheKeys = {
  driverAvailableOffers: 'driver:available_offers',
  driverHistory: 'driver:history',
  driverProfile: 'driver:profile',
  driverVehicle: 'driver:vehicle',
  driverCurrentRide: (rideId: string) => `driver:ride:${rideId}`,
  passengerCurrentOffer: 'passenger:current_offer',
  passengerHistory: 'passenger:history',
  userProfile: 'user:profile',
} as const;

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number; // epoch ms
}

/** Sauvegarde une valeur en cache local (JSON), horodatée. */
export async function cacheSet<T>(key: string, data: T): Promise<void> {
  try {
    const envelope: CacheEnvelope<T> = { data, cachedAt: Date.now() };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch {
    // Le cache est un confort, pas une garantie : on ignore silencieusement les échecs d'écriture.
  }
}

/** Lit une valeur du cache local. Renvoie null si absente/corrompue. */
export async function cacheGet<T>(key: string): Promise<{ data: T; cachedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const envelope: CacheEnvelope<T> = JSON.parse(raw);
    return envelope;
  } catch {
    return null;
  }
}

/** Supprime une entrée du cache. */
export async function cacheClear(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // no-op
  }
}

/**
 * Enveloppe un appel réseau : essaie le réseau, retombe sur le cache en cas d'échec,
 * et met à jour le cache à chaque succès. `maxAgeMs` permet de refuser un cache trop
 * vieux plutôt que d'afficher des données périmées indéfiniment.
 */
export async function withOfflineFallback<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { maxAgeMs?: number },
): Promise<{ data: T; fromCache: boolean; stale?: boolean }> {
  try {
    const fresh = await fetcher();
    cacheSet(key, fresh); // pas besoin d'attendre l'écriture
    return { data: fresh, fromCache: false };
  } catch (err) {
    const cached = await cacheGet<T>(key);
    if (cached) {
      const isStale = !!opts?.maxAgeMs && Date.now() - cached.cachedAt > opts.maxAgeMs;
      return { data: cached.data, fromCache: true, stale: isStale };
    }
    throw err;
  }
}
