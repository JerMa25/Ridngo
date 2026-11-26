/* eslint-disable @typescript-eslint/no-explicit-any */
import api from './api-client';
import { AuthResponse, UserRole } from '@/types/api';
import { handleApiError } from '@/utils/error-handler';

export type AuthResult =
  | { success: true; redirectUrl: string }
  | { success: true; mfa: { mfaToken: string; channel: string } }
  | { success: true; verifyEmail: true }
  | { success: false; message: string };

/** Connexion Kernel : session directe, ou 202 CONFIRM_MFA (code envoyé par le Kernel). */
export const login = async (principal: string, password: string): Promise<AuthResult> => {
  try {
    const res = await api.post('/api/v1/auth/login', { principal, password });
    if (res.status === 202 && res.data?.nextStep === 'CONFIRM_MFA') {
      return { success: true, mfa: { mfaToken: res.data.mfaToken, channel: res.data.channel } };
    }
    return await finalizeSession(res.data);
  } catch (error: any) {
    return { success: false, message: handleApiError(error, 'auth') };
  }
};

export const confirmMfa = async (mfaToken: string, code: string): Promise<AuthResult> => {
  try {
    const res = await api.post<AuthResponse>('/api/v1/auth/login/mfa', { mfaToken, code: code.trim() });
    return await finalizeSession(res.data);
  } catch (error: any) {
    return { success: false, message: handleApiError(error, 'auth') };
  }
};

export const resendVerification = async (principal: string): Promise<void> => {
  await api.post('/api/v1/auth/email-verification/resend', { principal });
};

export const getCaptcha = async (): Promise<{ captchaToken: string; prompt: string }> =>
  (await api.post('/api/v1/auth/captcha')).data;

export const register = async (data: any, requestedRole: UserRole = 'RIDE_AND_GO_PASSENGER'): Promise<AuthResult> => {
  try {
    const registerDto = {
      username: data.username,
      password: data.password,
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      roles: [requestedRole],
      captchaToken: data.captchaToken,
      captchaAnswer: data.captchaAnswer,
    };
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(registerDto)], { type: 'application/json' }));

    const res = await api.post<AuthResponse>('/api/v1/auth/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    // Compte LOCAL créé mais email à confirmer avant toute connexion (mode strict Kernel)
    if (!res.data?.accessToken) return { success: true, verifyEmail: true };
    return await finalizeSession(res.data);
  } catch (error: any) {
    return { success: false, message: handleApiError(error, 'auth') };
  }
};

const finalizeSession = async (authData: AuthResponse): Promise<AuthResult> => {
  if (!authData?.accessToken) throw new Error("Token manquant");

  localStorage.setItem('accessToken', authData.accessToken);
  if (authData.refreshToken) localStorage.setItem('refreshToken', authData.refreshToken);

  const isDriver = authData.roles.includes('RIDE_AND_GO_DRIVER');
  const profileRes = await api.get(isDriver ? '/api/v1/users/me/driver-profile' : '/api/v1/users/me');

  // Le profil complet renvoyé par le backend
  const userProfile = isDriver ? profileRes.data.user : profileRes.data;

  // On stocke TOUT le profil pour les besoins futurs (numéro, etc.)
  localStorage.setItem('user-full', JSON.stringify(userProfile));

  // On stocke l'objet simplifié utilisé par la Navbar
  const userObj = {
    id: userProfile.id,
    name: userProfile.name || `${userProfile.firstName} ${userProfile.lastName}`,
    username: userProfile.username || userProfile.name?.split(' ')[0] || userProfile.firstName,
    email: userProfile.email,
    phone: userProfile.telephone, // CRUCIAL : On ajoute le téléphone ici
    // Priorité ADMIN > DRIVER > PASSENGER (l'ordre des rôles renvoyés n'est pas garanti)
    role: ['ADMIN', 'DRIVER', 'PASSENGER'].find(r =>
      [...(userProfile.roles || []), ...(authData.roles || [])].includes(`RIDE_AND_GO_${r}`)) || 'PASSENGER'
  };

  localStorage.setItem('user', JSON.stringify(userObj));

  return {
    success: true,
    redirectUrl: userObj.role === 'ADMIN' ? "/admin/dashboard" : isDriver ? "/driver/dashboard" : "/ride"
  };
};
