import * as SecureStore from 'expo-secure-store';
import api from './api';
import { BASE_URL } from './api';
import { AuthResponse, UserObj, UserRole } from '../types/api';

export const authService = {
  login: async (identifier: string, password: string): Promise<{ success: boolean; role?: string; message?: string }> => {
    try {
      const response = await api.post<AuthResponse>('/api/v1/auth/login', { identifier, password });
      return await finalizeSession(response.data);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || "Identifiants invalides";
      return { success: false, message: msg };
    }
  },

  register: async (data: {
    username: string; password: string; email: string; phone: string;
    firstName: string; lastName: string; role: UserRole; photo?: any;
  }): Promise<{ success: boolean; role?: string; message?: string }> => {
    try {
      const formData = new FormData();

      const registerDto = {
        username: data.username,
        password: data.password,
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: [data.role],
      };

      formData.append('data', {
        string: JSON.stringify(registerDto),
        type: 'application/json',
      } as any);

      if (data.photo) {
        const mimeType = data.photo.mimeType || data.photo.type || 'image/jpeg';
        const ext = mimeType.includes('png') ? 'png' : 'jpg';
        const fileName = data.photo.fileName || data.photo.name || `photo_${Date.now()}.${ext}`;
        formData.append('file', {
          uri: data.photo.uri,
          name: fileName,
          type: mimeType,
        } as any);
      }

      const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      const responseText = await res.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      if (!res.ok) {
        const msg = responseData?.message || responseData?.error || `Erreur ${res.status}`;
        return { success: false, message: msg };
      }

      return await finalizeSession(responseData as AuthResponse);
    } catch (error: any) {
      return { success: false, message: error.message || "Erreur lors de l'inscription" };
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
  },

  getUser: async (): Promise<UserObj | null> => {
    try {
      const raw = await SecureStore.getItemAsync('user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  isAuthenticated: async (): Promise<boolean> => {
    const token = await SecureStore.getItemAsync('accessToken');
    return !!token;
  },
};

const finalizeSession = async (authData: AuthResponse): Promise<{ success: boolean; role: string }> => {
  if (!authData.accessToken) throw new Error('Token manquant');
  await SecureStore.setItemAsync('accessToken', authData.accessToken);
  if (authData.refreshToken) await SecureStore.setItemAsync('refreshToken', authData.refreshToken);

  const isDriver = authData.roles?.includes('RIDE_AND_GO_DRIVER');
  const isAdmin = authData.roles?.includes('RIDE_AND_GO_ADMIN');

  let userProfile: any = {};
  try {
    const profileRes = await api.get(isDriver ? '/api/v1/users/me/driver-profile' : '/api/v1/users/me');
    userProfile = isDriver ? (profileRes.data.user || profileRes.data) : profileRes.data;
  } catch {
    userProfile = { id: authData.username, email: '', name: authData.username };
  }

  const userObj: UserObj = {
    id: userProfile.id || authData.username,
    name: userProfile.name || `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || authData.username,
    email: userProfile.email || '',
    phone: userProfile.telephone,
    role: isDriver ? 'DRIVER' : isAdmin ? 'ADMIN' : 'PASSENGER',
  };

  await SecureStore.setItemAsync('user', JSON.stringify(userObj));
  return { success: true, role: userObj.role };
};