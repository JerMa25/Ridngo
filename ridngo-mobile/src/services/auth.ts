import * as SecureStore from 'expo-secure-store';
import api from './api';
import { BASE_URL } from './api';
import { AuthResponse, UserObj, UserRole } from '../types/api';

export type AuthResult = {
  success: boolean; role?: string; message?: string;
  mfa?: { mfaToken: string; channel: string }; verifyEmail?: boolean;
};

// Spring ProblemDetail met le message dans `detail`
const errorMessage = (error: any, fallback: string) =>
  error.response?.data?.detail || error.response?.data?.message || error.message || fallback;

export const authService = {
  /** Connexion Kernel : session directe, ou 202 CONFIRM_MFA (code envoyé par email/SMS). */
  login: async (identifier: string, password: string): Promise<AuthResult> => {
    try {
      const response = await api.post('/api/v1/auth/login', { principal: identifier, password });
      if (response.status === 202 && response.data?.nextStep === 'CONFIRM_MFA') {
        return { success: false, mfa: { mfaToken: response.data.mfaToken, channel: response.data.channel } };
      }
      return await finalizeSession(response.data);
    } catch (error: any) {
      return { success: false, message: errorMessage(error, "Identifiants invalides") };
    }
  },

  confirmMfa: async (mfaToken: string, code: string): Promise<AuthResult> => {
    try {
      const response = await api.post<AuthResponse>('/api/v1/auth/login/mfa', { mfaToken, code: code.trim() });
      return await finalizeSession(response.data);
    } catch (error: any) {
      return { success: false, message: errorMessage(error, "Code de vérification incorrect.") };
    }
  },

  resendVerification: async (principal: string): Promise<void> => {
    await api.post('/api/v1/auth/email-verification/resend', { principal });
  },

  getCaptcha: async (): Promise<{ captchaToken: string; prompt: string }> =>
    (await api.post('/api/v1/auth/captcha')).data,

  register: async (data: {
    username: string; password: string; email: string; phone: string;
    firstName: string; lastName: string; role: UserRole; photo?: any;
    captchaToken?: string; captchaAnswer?: string;
  }): Promise<AuthResult> => {
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
        captchaToken: data.captchaToken,
        captchaAnswer: data.captchaAnswer,
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
        const msg = responseData?.detail || responseData?.message || responseData?.error || `Erreur ${res.status}`;
        return { success: false, message: msg };
      }

      // Compte créé, mais le Kernel exige la confirmation de l'email avant toute connexion
      if (!responseData?.accessToken) return { success: true, verifyEmail: true };
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