import * as SecureStore from 'expo-secure-store';
import api from './api';
import {
  OfferResponse, FareResponse, RideResponse,
  CreateOfferRequest, RideTrackingResponse, Wallet, DriverTrajectory
} from '../types/api';

// ─── Helpers SecureStore ──────────────────────────────────────────────────────

export const addAppliedOffer = async (offerId: string) => {
  try {
    const stored = await SecureStore.getItemAsync('appliedOfferIds');
    const ids: string[] = stored ? JSON.parse(stored) : [];
    if (!ids.includes(offerId)) {
      await SecureStore.setItemAsync('appliedOfferIds',
        JSON.stringify([offerId, ...ids].slice(0, 20)));
    }
  } catch { }
};

export const removeAppliedOffer = async (offerId: string) => {
  try {
    const stored = await SecureStore.getItemAsync('appliedOfferIds');
    const ids: string[] = stored ? JSON.parse(stored) : [];
    await SecureStore.setItemAsync('appliedOfferIds',
      JSON.stringify(ids.filter(id => id !== offerId)));
  } catch { }
};

export const addActiveTrip = async (tripId: string, offerId?: string) => {
  try {
    const stored = await SecureStore.getItemAsync('activeTrips');
    const trips: Array<{ tripId: string; offerId?: string }> =
      stored ? JSON.parse(stored) : [];
    if (!trips.find(t => t.tripId === tripId)) {
      await SecureStore.setItemAsync('activeTrips',
        JSON.stringify([{ tripId, offerId }, ...trips].slice(0, 10)));
    }
    await SecureStore.setItemAsync('activeRideId', tripId);
  } catch { }
};

export const removeActiveTrip = async (tripId: string) => {
  try {
    const stored = await SecureStore.getItemAsync('activeTrips');
    const trips: Array<{ tripId: string; offerId?: string }> =
      stored ? JSON.parse(stored) : [];
    await SecureStore.setItemAsync('activeTrips',
      JSON.stringify(trips.filter(t => t.tripId !== tripId)));
    const current = await SecureStore.getItemAsync('activeRideId');
    if (current === tripId) await SecureStore.deleteItemAsync('activeRideId');
  } catch { }
};

export const clearPassengerRideData = async () => {
  try {
    await SecureStore.deleteItemAsync('currentOfferId');
    await SecureStore.deleteItemAsync('activeRideId');
  } catch { }
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const rideService = {

  estimateFare: async (depart: string, arrivee: string): Promise<FareResponse> => {
    const body = { depart, arrivee, heure: 'matin', meteo: 0, type_zone: 0, congestion_user: 1 };
    console.log('[rideService] estimateFare:', body);
    const res = await api.post<FareResponse>('/api/v1/fares/estimate', body);
    console.log('[rideService] estimateFare response:', res.data);
    return res.data;
  },

  createOffer: async (data: CreateOfferRequest): Promise<OfferResponse> => {
    const res = await api.post<OfferResponse>('/api/v1/offers', data);
    await SecureStore.setItemAsync('currentOfferId', res.data.id);
    return res.data;
  },

  getOfferById: async (id: string): Promise<OfferResponse> => {
    const res = await api.get<OfferResponse>(`/api/v1/offers/${id}`);
    return res.data;
  },

  getOfferBids: async (offerId: string): Promise<OfferResponse> => {
    const res = await api.get<OfferResponse>(`/api/v1/offers/${offerId}/bids`);
    return res.data;
  },

  cancelOffer: async (offerId: string): Promise<void> => {
    await api.post(`/api/v1/offers/${offerId}/cancel`);
    await clearPassengerRideData();
  },

  getAvailableOffers: async (page = 0, size = 50): Promise<OfferResponse[]> => {
    const res = await api.get<OfferResponse[]>(
      `/api/v1/offers/available?page=${page}&size=${size}`);
    return res.data;
  },

  getLandingOffers: async (limit = 10): Promise<OfferResponse[]> => {
    const res = await api.get<OfferResponse[]>(`/api/v1/offers/landing?limit=${limit}`);
    return res.data;
  },

  selectDriver: async (offerId: string, driverId: string): Promise<OfferResponse> => {
    const res = await api.patch<OfferResponse>(
      `/api/v1/offers/${offerId}/select-driver?driverId=${driverId}`);
    return res.data;
  },

  applyToOffer: async (offerId: string): Promise<OfferResponse> => {
    const res = await api.post<OfferResponse>(`/api/v1/offers/${offerId}/apply`);
    await addAppliedOffer(offerId);
    return res.data;
  },

  // Le chauffeur annule la candidature qu'il vient d'envoyer (avant sélection par le passager)
  withdrawApplication: async (offerId: string): Promise<OfferResponse> => {
    const res = await api.post<OfferResponse>(`/api/v1/offers/${offerId}/withdraw`);
    await removeAppliedOffer(offerId);
    return res.data;
  },

  // Chauffeur confirme pickup → crée le Trip
  // POST /api/v1/offers/{id}/accept?driverId={driverId}
  driverAccepts: async (offerId: string, driverId: string): Promise<RideResponse> => {
    const res = await api.post<RideResponse>(
      `/api/v1/offers/${offerId}/accept?driverId=${driverId}`);
    const ride = res.data;
    await removeAppliedOffer(offerId);
    await addActiveTrip(ride.id, offerId);
    return ride;
  },

  getRideByOffer: async (offerId: string): Promise<RideResponse> => {
    const res = await api.get<RideResponse>(`/api/v1/offers/${offerId}/ride`);
    return Array.isArray(res.data) ? res.data[0] : res.data;
  },

  getRideDetails: async (rideId: string): Promise<RideResponse> => {
    const res = await api.get<RideResponse>(`/api/v1/trips/${rideId}`);
    return res.data;
  },

  // Chauffeur a récupéré le client → ONGOING
  // PATCH /api/v1/trips/{id}/status { status: "ONGOING" }
  startRide: async (rideId: string): Promise<RideResponse> => {
    const res = await api.patch<RideResponse>(`/api/v1/trips/${rideId}/status`,
      { status: 'ONGOING' });
    return res.data;
  },

  // Chauffeur termine la course → COMPLETED (seul le chauffeur)
  // PATCH /api/v1/trips/{id}/status { status: "COMPLETED" }
  completeRide: async (rideId: string): Promise<RideResponse> => {
    const res = await api.patch<RideResponse>(`/api/v1/trips/${rideId}/status`,
      { status: 'COMPLETED' });
    await removeActiveTrip(rideId);
    return res.data;
  },

  updateRideStatus: async (
    rideId: string, status: 'ONGOING' | 'COMPLETED' | 'CANCELLED'
  ): Promise<RideResponse> => {
    const res = await api.patch<RideResponse>(`/api/v1/trips/${rideId}/status`, { status });
    if (status === 'COMPLETED' || status === 'CANCELLED') await removeActiveTrip(rideId);
    return res.data;
  },

  updateLocation: async (lat: number, lon: number): Promise<void> => {
    await api.post('/api/v1/location', { latitude: lat, longitude: lon });
  },

  getTrackingInfo: async (rideId: string): Promise<RideTrackingResponse> => {
    const res = await api.get<RideTrackingResponse>(`/api/v1/trips/${rideId}/location`);
    return res.data;
  },

  getCurrentPassengerRide: async (): Promise<RideResponse | null> => {
    try {
      const rideId = await SecureStore.getItemAsync('activeRideId');
      if (!rideId) return null;
      const res = await api.get<RideResponse>(`/api/v1/trips/${rideId}`);
      if (res.data.state === 'COMPLETED' || res.data.state === 'CANCELLED') {
        await clearPassengerRideData();
        return null;
      }
      return res.data;
    } catch { return null; }
  },

  submitReview: async (rideId: string, stars: number, comment: string, anonymous = false): Promise<void> => {
    await api.post(`/api/v1/reviews/ride/${rideId}`, { stars, comment, anonymous });
  },

  postReview: async (rideId: string, stars: number, comment: string, anonymous = false): Promise<void> => {
    await api.post(`/api/v1/reviews/ride/${rideId}`, { stars, comment, anonymous });
  },

  getMyWallet: async (): Promise<Wallet> => {
    const res = await api.get<Wallet>('/api/v1/wallets/me');
    return res.data;
  },

  getRideHistory: async (): Promise<RideResponse[]> => {
    const res = await api.get<RideResponse[]>('/api/v1/trips/history');
    return res.data;
  },

  getEnrichedHistory: async (): Promise<RideResponse[]> => {
    const res = await api.get<RideResponse[]>('/api/v1/trips/enriched-history');
    return res.data;
  },

  // GET /api/v1/trips/driver/{driverId}/history
  getDriverHistory: async (driverId: string): Promise<RideResponse[]> => {
    const res = await api.get<RideResponse[]>(`/api/v1/trips/driver/${driverId}/history`);
    return res.data;
  },

  getMyTrajectories: async (): Promise<DriverTrajectory[]> => {
    const res = await api.get<DriverTrajectory[]>('/api/v1/trips/trajectories/me');
    return res.data;
  },

  getMyReviews: async () => {
    const res = await api.get('/api/v1/reviews/me');
    return res.data;
  },
};

