/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const vehicleApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_VEHICLE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Drapeau pour éviter de boucler sur le refresh
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};


const authInterceptor = (config: any) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    console.log("Attaching token:", token);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
};

api.interceptors.request.use(authInterceptor);
vehicleApi.interceptors.request.use(authInterceptor);

// --- LOGIQUE REFRESH TOKEN ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si l'erreur n'est pas un 401, ou si c'est une requête vers l'auth, on rejette normalement
    if (error.response?.status !== 401 || originalRequest.url.includes('/api/v1/auth')) {
      return Promise.reject(error);
    }

    // Si on a déjà essayé de refresh une fois, on arrête pour éviter les boucles infinies
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch(err => Promise.reject(err));
    }

    originalRequest._retry = true;
    const refreshToken = localStorage.getItem('refreshToken');
    
    // CHANGEMENT ICI : Si pas de refreshToken, on ne redirige pas de force. 
    // On rejette juste l'erreur. La redirection sera gérée par les pages protégées uniquement.
    if (!refreshToken) {
      return Promise.reject(error); 
    }

    isRefreshing = true;

    try {
      const res = await api.post('/api/v1/auth/refresh', {
        refreshToken
      });

      const { accessToken, refreshToken: newRefreshToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      processQueue(null, accessToken);
      
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.clear();
      // On ne redirige vers login que si on n'est pas déjà sur une page publique
      if (window.location.pathname !== '/') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export { api, vehicleApi };
export default api;