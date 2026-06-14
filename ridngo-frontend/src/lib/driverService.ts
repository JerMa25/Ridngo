import api from './api-client';
import { BecomeDriverRequest } from '@/types/api';

export const driverService = {
  // Finaliser l'onboarding du chauffeur (Véhicule + Permis)
  becomeDriver: async (data: BecomeDriverRequest) => {
    const response = await api.post('/api/v1/users/driver', data);
    return response.data;
  },

  // Vérifier le statut de son profil
  getDriverProfileStatus: async () => {
    const response = await api.get('/api/v1/users/me');
    return response.data; // Le backend renvoie UserResponse avec les rôles
  },

  // Passer en ligne/hors ligne
  toggleOnlineStatus: async (isOnline: boolean) => {
    const response = await api.post(`/api/v1/drivers/status/online?isOnline=${isOnline}`);
    return response.data;
  }
};