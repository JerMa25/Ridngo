import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { reportConnectivity } from './connectivityBus';

// Trousseau iOS lisible dès le premier déverrouillage : sinon les lectures échouent téléphone verrouillé
// ("User interaction is not allowed") pendant le suivi de course en arrière-plan.
export const KEYCHAIN: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

// Défini au build via EXPO_PUBLIC_API_URL (voir eas.json) ; sinon IP locale pour le dev sur réseau local
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.62.212.154:8080';
export const VEHICLE_URL = process.env.EXPO_PUBLIC_VEHICLE_API_URL || 'https://traefikdev.yowyob.com/vehicule';

// Connexion / inscription passent par le Kernel (jusqu'à 60 s côté backend) : 15 s coupait des requêtes
// qui auraient abouti. On attend un peu plus que le backend pour recevoir son vrai message d'erreur.
export const REQUEST_TIMEOUT_MS = 65000;

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: REQUEST_TIMEOUT_MS,
});

export const vehicleApi: AxiosInstance = axios.create({
  baseURL: VEHICLE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

const authInterceptor = async (config: any) => {
  try {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return config;
};

api.interceptors.request.use(authInterceptor);
vehicleApi.interceptors.request.use(authInterceptor);

api.interceptors.response.use(
  r => {
    reportConnectivity(true); // toute réponse serveur reçue = on est bien en ligne
    return r;
  },
  async error => {
    // Pas de `error.response` = la requête n'a pas atteint le serveur (pas de réseau,
    // DNS, timeout...). On le marque explicitement pour que les écrans puissent
    // distinguer "hors ligne" d'une vraie erreur serveur et basculer sur le cache.
    if (!error.response) {
      error.isOffline = true;
      reportConnectivity(false);
      return Promise.reject(error);
    }
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest.url?.includes('/api/v1/auth')) {
      return Promise.reject(error);
    }
    if (originalRequest._retry) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) return Promise.reject(error);

    isRefreshing = true;
    try {
      const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefresh } = res.data;
      await SecureStore.setItemAsync('accessToken', accessToken, KEYCHAIN);
      await SecureStore.setItemAsync('refreshToken', newRefresh, KEYCHAIN);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      processQueue(null, accessToken);
      return api(originalRequest);
    } catch (e) {
      processQueue(e, null);
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('user');
      sessionExpiredListener?.();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

// AuthContext s'y abonne pour renvoyer vers l'accueil quand le refresh échoue
let sessionExpiredListener: (() => void) | null = null;
export const onSessionExpired = (listener: (() => void) | null) => { sessionExpiredListener = listener; };

export default api;