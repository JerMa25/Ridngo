import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { reportConnectivity } from './connectivityBus';

// Utilise l'adresse IP de ta machine sur ton réseau local
export const BASE_URL = 'http://10.62.212.154:8080';
export const VEHICLE_URL = 'https://vehicule-service.pynfi.com'; // À changer s'il y a un service local

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
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
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', newRefresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      processQueue(null, accessToken);
      return api(originalRequest);
    } catch (e) {
      processQueue(e, null);
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('user');
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;