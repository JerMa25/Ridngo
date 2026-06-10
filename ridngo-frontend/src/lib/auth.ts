/* eslint-disable @typescript-eslint/no-explicit-any */
import api from './api-client';
import { AuthResponse, UserRole, UserResponse } from '@/types/api';
import { handleApiError } from '@/utils/error-handler';

export const handleAuthSubmit = async (
  type: 'login' | 'register', 
  data: any, 
  requestedRole: UserRole = 'RIDE_AND_GO_PASSENGER'
) => {
  try {
    if (type === 'login') {
      const response = await api.post<AuthResponse>('/api/v1/auth/login', {
        identifier: data.email,
        password: data.password
      });
      return await finalizeSession(response.data);
    } else {
      // INSCRIPTION MULTIPART
      const formData = new FormData();
      
      const registerDto = {
        username: data.username,
        password: data.password,
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: [requestedRole]
      };

      formData.append('data', new Blob([JSON.stringify(registerDto)], { type: 'application/json' }));
      
      if (data.photo) {
        formData.append('file', data.photo);
      }

      const response = await api.post<AuthResponse>('/api/v1/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      return await finalizeSession(response.data);
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: handleApiError(error, 'auth')
    };
  }
};

const finalizeSession = async (authData: AuthResponse) => {
  if (!authData.accessToken) throw new Error("Token manquant");

  localStorage.setItem('accessToken', authData.accessToken);
  if (authData.refreshToken) localStorage.setItem('refreshToken', authData.refreshToken);
  
  const isDriver = authData.roles.includes('RIDE_AND_GO_DRIVER');
  const profileRes = await api.get(isDriver ? '/api/v1/users/me/driver-profile' : '/api/v1/users/me');
  
  // Le profil complet renvoyé par le backend
  const userProfile = isDriver ? profileRes.data.user : profileRes.data;

  // On stocke TOUT le profil pour les besoins futurs (numéro, etc.)
  localStorage.setItem('user-full', JSON.stringify(userProfile));
  console.log('userProfile: ', userProfile);

  // On stocke l'objet simplifié utilisé par la Navbar
  const userObj = {
    id: userProfile.id,
    name: userProfile.name || `${userProfile.firstName} ${userProfile.lastName}`,
    email: userProfile.email,
    phone: userProfile.telephone, // CRUCIAL : On ajoute le téléphone ici
    role: userProfile.roles[0].replace('RIDE_AND_GO_', '')
  };
  
  localStorage.setItem('user', JSON.stringify(userObj));

  return { 
    success: true, 
    redirectUrl: isDriver ? "/driver/dashboard" : "/ride" 
  };
};