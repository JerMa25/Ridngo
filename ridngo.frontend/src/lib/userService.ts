import api from './api-client';
import { UserResponse, UpdateUserProfileRequest, PagedResultNotification, NotificationSettings, SettingsDto } from '@/types/api';

export const userService = {
  // Récupérer le profil courant
  getMe: async () => {
    const res = await api.get<UserResponse>('/api/v1/users/me');
    return res.data;
  },

  // Mettre à jour le profil
  updateProfile: async (data: UpdateUserProfileRequest) => {
    const res = await api.put<UserResponse>('/api/v1/users/profile', data);
    return res.data;
  },

  // Changer le mot de passe
  changePassword: async (currentPassword: string, newPassword: string) => {
    await api.put('/api/v1/users/password', { currentPassword, newPassword });
  },

  // Récupérer les notifications paginées
  getNotifications: async (page = 0, size = 10): Promise<PagedResultNotification> => {
    const res = await api.get<PagedResultNotification>(`/api/v1/notifications?page=${page}&size=${size}`);
    return res.data;
  },

  // Marquer une notification comme lue
  markAsRead: async (id: string) => {
    await api.patch(`/api/v1/notifications/${id}/read`);
  },

  // Marquer TOUTES les notifications comme lues
  markAllAsRead: async () => {
    await api.patch(`/api/v1/notifications/read-all`);
  },

  // Récupérer les préférences de notification
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    const res = await api.get<NotificationSettings>('/api/v1/settings/notifications');
    return res.data;
  },

  // Mettre à jour les préférences
  updateNotificationSettings: async (settings: SettingsDto) => {
    await api.put('/api/v1/settings/notifications', settings);
  }
};