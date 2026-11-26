import api from './api';
import { BASE_URL } from './api';
import * as SecureStore from 'expo-secure-store';

export const driverService = {
  becomeDriver: async (data: any) => {
    const response = await api.post('/api/v1/users/driver', data);
    return response.data;
  },

  getDriverProfile: async () => {
    const response = await api.get('/api/v1/users/me/driver-profile');
    return response.data;
  },

  toggleOnlineStatus: async (isOnline: boolean) => {
    const response = await api.post(`/api/v1/drivers/status/online?isOnline=${isOnline}`);
    return response.data;
  },
};

export const userService = {
  getMe: async () => {
    const res = await api.get('/api/v1/users/me');
    return res.data;
  },

  getUserById: async (userId: string) => {
    const res = await api.get(`/api/v1/users/${userId}`);
    return res.data;
  },

  updateProfile: async (data: { firstName?: string; lastName?: string; phone?: string }) => {
    const res = await api.put('/api/v1/users/profile', data);
    // la session locale garde l'ancien nom sinon (en-têtes, accueil)
    try {
      const stored = JSON.parse((await SecureStore.getItemAsync('user')) || '{}');
      const name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
      await SecureStore.setItemAsync('user', JSON.stringify({ ...stored, ...(name && { name }), ...(data.phone && { phone: data.phone }) }));
    } catch { /* session absente */ }
    return res.data;
  },

  updateProfileWithPhoto: async (data: { firstName?: string; lastName?: string; phone?: string }, photo?: any) => {
    const profile = await userService.updateProfile(data);
    if (!photo) return profile;
    // Photo stockée dans le Kernel (file-core) via POST /api/v1/users/me/photo (multipart, champ "file")
    const token = await SecureStore.getItemAsync('accessToken');
    const mimeType = photo.mimeType || photo.type || 'image/jpeg';
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const fileName = photo.fileName || photo.name || `profile_${Date.now()}.${ext}`;
    const formData = new FormData();
    formData.append('file', { uri: photo.uri, name: fileName, type: mimeType } as any);
    const headers: any = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/api/v1/users/me/photo`, { method: 'POST', headers, body: formData });
    const text = await res.text();
    if (!res.ok) {
      let msg = "Impossible d'envoyer la photo.";
      try { msg = JSON.parse(text).detail || msg; } catch {}
      throw new Error(msg);
    }
    return { ...profile, ...(text ? JSON.parse(text) : {}) };
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    await api.put('/api/v1/users/password', { currentPassword, newPassword });
  },

  getNotifications: async (page = 0, size = 10) => {
    const res = await api.get(`/api/v1/notifications?page=${page}&size=${size}`);
    return res.data;
  },

  markNotificationRead: async (id: string) => {
    await api.patch(`/api/v1/notifications/${id}/read`);
  },

  markAllRead: async () => {
    await api.patch('/api/v1/notifications/read-all');
  },

  getNotificationSettings: async () => {
    try {
      const res = await api.get('/api/v1/settings/notifications');
      return res.data;
    } catch {
      return { pushEnabled: true, emailEnabled: true, smsEnabled: false, whatsappEnabled: false };
    }
  },

  updateNotificationSettings: async (settings: {
    push?: boolean; email?: boolean; sms?: boolean; whatsapp?: boolean;
  }) => {
    try {
      await api.put('/api/v1/settings/notifications', settings);
    } catch { /* ignore */ }
  },
};

export const geocodeService = {
  search: async (query: string): Promise<Array<{ name: string; lat: number; lon: number }>> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=cm&limit=5`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      return data.map((item: any) => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));
    } catch {
      return [];
    }
  },

  reverseGeocode: async (lat: number, lon: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  },
};
