/* eslint-disable @typescript-eslint/no-explicit-any */
import api from './api-client';
import { AuthResponse, UserRole, UserResponse } from '@/types/api';

export const handleAuthSubmit = async (
  type: 'login' | 'register', 
  data: any, 
  requestedRole: UserRole = 'RIDE_AND_GO_PASSENGER'
) => {
  try {
    if (type === 'login') {
      const response = await api.post<AuthResponse>('/api/auth/login', {
        identifier: data.email, // L'identifiant peut être l'email ou le username
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
        firstName: data.firstName,
        lastName: data.lastName,
        service: 'RIDE_AND_GO',
        // On n'envoie pas 'roles' ou 'telephone' ici si le backend ne les attend pas dans l'objet 'data'
        // Mais si on veut les garder, on peut essayer de les inclure s'ils sont présents
        ...(data.phone && { telephone: data.phone })
      };

      formData.append('data', new Blob([JSON.stringify(registerDto)], { type: 'application/json' }));
      
      if (data.photo) {
        formData.append('file', data.photo);
      }

      const response = await api.post<AuthResponse>('/api/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      return await finalizeSession(response.data);
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: error.response?.data?.message || "Erreur d'authentification" 
    };
  }
};

const finalizeSession = async (authData: AuthResponse) => {
  if (!authData.accessToken) throw new Error("Token manquant");

  localStorage.setItem('accessToken', authData.accessToken);
  if (authData.refreshToken) localStorage.setItem('refreshToken', authData.refreshToken);
  
  // On utilise le profil utilisateur directement s'il est présent dans l'authData
  const userProfile = authData.user;
  
  if (!userProfile) {
    // Si pas de profil dans la réponse, on tente de le récupérer (fallback)
    const isDriver = authData.roles?.includes('RIDE_AND_GO_DRIVER');
    const profileRes = await api.get(isDriver ? '/api/v1/users/me/driver-profile' : '/api/v1/users/me');
    const fetchedProfile = isDriver ? profileRes.data.user : profileRes.data;
    localStorage.setItem('user-full', JSON.stringify(fetchedProfile));
    
    const userObj = {
      id: fetchedProfile.id,
      name: fetchedProfile.name || `${fetchedProfile.firstName} ${fetchedProfile.lastName}`,
      email: fetchedProfile.email,
      phone: fetchedProfile.telephone || fetchedProfile.phone,
      role: (fetchedProfile.roles?.[0] || 'PASSENGER').replace('RIDE_AND_GO_', '')
    };
    localStorage.setItem('user', JSON.stringify(userObj));
  } else {
    // On stocke le profil complet renvoyé par le backend
    localStorage.setItem('user-full', JSON.stringify(userProfile));
    console.log('userProfile from auth:', userProfile);

    // On stocke l'objet simplifié utilisé par la Navbar
    const userObj = {
      id: userProfile.id,
      name: `${userProfile.firstName} ${userProfile.lastName}`,
      email: userProfile.email,
      phone: userProfile.phone || userProfile.telephone,
      role: userProfile.roles[0].replace('RIDE_AND_GO_', '')
    };
    
    localStorage.setItem('user', JSON.stringify(userObj));
  }

  const isDriverProfile = (authData.user?.roles || authData.roles || []).includes('RIDE_AND_GO_DRIVER');
  return { 
    success: true, 
    redirectUrl: isDriverProfile ? "/driver/dashboard" : "/ride" 
  };
};