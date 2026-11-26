import api from './api-client';
import { 
  OfferResponse, LandingOfferResponse, FareResponse, RideResponse, 
  CreateOfferRequest, FareRequest, RideTrackingResponse, Wallet, 
  RechargeOrder, DriverTrajectory, TransactionSummary
} from '@/types/api';

export const rideService = {
  // 1. Estimation
  estimateFare: async (pickup: string, destination: string): Promise<FareResponse> => {
    const body = {
      depart: pickup,
      arrivee: destination,
      heure: "matin",
      meteo: 0,
      type_zone: 0,
      congestion_user: 1
    };
    console.log('Estimating obje:', body);

    const response = await api.post<FareResponse>('/api/v1/fares/estimate', body);
    console.log('Estimation reçue:', response.data);

    return response.data;
  },

  // 2. Publication (Mise à jour avec passengerPhone et departureTime)
  createOffer: async (data: CreateOfferRequest): Promise<OfferResponse> => {
    console.log('Offre créée:', data);
    const response = await api.post<OfferResponse>('/api/v1/offers', data);
    console.log('Offre post-créée:', response.data);
    return response.data;
  },

  // 3. Récupérer les offres (Radar)
  getAvailableOffers: async (page = 0, size = 10): Promise<OfferResponse[]> => {
    const response = await api.get<OfferResponse[]>(`/api/v1/offers/available?page=${page}&size=${size}`);
    return response.data;
  },

  getLandingOffers: async (): Promise<LandingOfferResponse[]> => {
    const response = await api.get<LandingOfferResponse[]>(`/api/v1/offers/landing?limit=10`);
    return response.data;
  },

  // 4. Handshake : Chauffeur postule
  applyToOffer: async (offerId: string): Promise<OfferResponse> => {
    const response = await api.post<OfferResponse>(`/api/v1/offers/${offerId}/apply`);
    return response.data;
  },

  // 3. Polling Bids (Passager)
  getOfferBids: async (offerId: string): Promise<OfferResponse> => {
    console.log('getOfferBids', offerId);
    const response = await api.get<OfferResponse>(`/api/v1/offers/${offerId}/bids`);
    return response.data;
  },

  // 4. Handshake Step 1 : Passager sélectionne un driver
  selectDriver: async (offerId: string, driverId: string): Promise<OfferResponse> => {
    const response = await api.patch<OfferResponse>(`/api/v1/offers/${offerId}/select-driver?driverId=${driverId}`);
    return response.data;
  },

  // 5. Handshake Step 2 : Driver accepte définitivement
  // La commission est débitée du wallet Kernel, qui exige un code MFA : étape 1 = demander le code
  requestAcceptCode: async (offerId: string): Promise<{ challengeToken: string; commission: number }> =>
    (await api.post(`/api/v1/offers/${offerId}/accept/challenge`)).data,

  driverAccepts: async (offerId: string, challengeToken: string, code: string): Promise<RideResponse> => {
    const response = await api.post<RideResponse>(`/api/v1/offers/${offerId}/accept`, { challengeToken, code });
    return response.data;
  },

  // 6. Tracking Position
  getTrackingInfo: async (rideId: string): Promise<RideTrackingResponse> => {
    const response = await api.get<RideTrackingResponse>(`/api/v1/trips/${rideId}/location`);
    return response.data;
  },

  // Terminer la course (Changement d'état Trip)
  updateRideStatus: async (rideId: string, status: 'ONGOING' | 'COMPLETED' | 'CANCELLED'): Promise<RideResponse> => {
    const response = await api.patch<RideResponse>(`/api/v1/trips/${rideId}/status`, { status });
    return response.data;
  },

  // Noter le chauffeur (Après COMPLETED)
  postReview: async (rideId: string, stars: number, comment: string, anonymous = false) => {
    const response = await api.post(`/api/v1/reviews/ride/${rideId}`, { stars, comment, anonymous });
    return response.data;
  },

  getOfferById: async (id: string) => (await api.get<OfferResponse>(`/api/v1/offers/${id}`)).data,
  getMyWallet: async () => (await api.get<Wallet>('/api/v1/wallets/me')).data,
  rechargeWallet: async (amount: number, payerReference: string, method = 'MOBILE_MONEY') =>
    (await api.post<RechargeOrder>('/api/v1/wallets/me/recharge', { amount, payerReference, method })).data,
  startWithdrawal: async (amount: number, phoneNumber: string) =>
    (await api.post<{ challengeToken: string }>('/api/v1/wallets/me/withdrawals/challenge', { amount, phoneNumber })).data,
  confirmWithdrawal: async (payload: { amount: number; phoneNumber: string; method: string; recipientName: string; challengeToken: string; code: string }) =>
    (await api.post<{ status: string }>('/api/v1/wallets/me/withdrawals', payload)).data,
  refreshRechargeOrder: async (orderId: string) =>
    (await api.post<RechargeOrder>(`/api/v1/wallets/recharge-orders/${orderId}/refresh`)).data,
  getMyWalletTransactions: async () => 
    (await api.get<TransactionSummary[]>('/api/v1/wallets/me/transactions')).data,
  getMyRechargeOrders: async () =>
    (await api.get<RechargeOrder[]>('/api/v1/wallets/me/recharge-orders')).data,
  getRideDetails: async (rideId: string) => (await api.get<RideResponse>(`/api/v1/trips/${rideId}`)).data,

  getRideByOffer: async (offerId: string): Promise<RideResponse> => {
    const response = await api.get<RideResponse>(`/api/v1/offers/${offerId}/ride`);
    // Si c'est un tableau, on prend le premier élément. Sinon on prend l'objet.
    const data = Array.isArray(response.data) ? response.data[0] : response.data;
    
    if (!data || !data.id) {
        throw new Error("Aucune course trouvée pour cette offre");
    }
    return data;
  },

  // Récupérer l'historique (paginé)
  getMyHistory: async (page = 0, size = 10): Promise<RideResponse[]> => {
    const response = await api.get<RideResponse[]>(`/api/v1/trips/history?page=${page}&size=${size}`);
    return response.data;
  },

  // Récupérer la course active du driver
  getCurrentRide: async (): Promise<RideResponse | null> => {
    const res = await api.get<RideResponse>('/api/v1/trips/driver/current');
    return res.data;
  },

  getCurrentPassengerRide: async (): Promise<RideResponse | null> => {
    try {
      const response = await api.get<RideResponse[]>('/api/v1/trips/history?page=0&size=1');
      const latest = response.data[0];
      if (!latest) return null;
      // l'historique mêle les courses faites comme chauffeur : ne reprendre que celles du passager
      const me = JSON.parse(localStorage.getItem('user') || '{}');
      if (me.id && latest.passengerId !== me.id) return null;
      
      if (latest.state === 'CREATED' || latest.state === 'ONGOING') {
        return latest;
      }
      
      if (latest.state === 'COMPLETED') {
        // Vérifier si cette course a déjà été notée
        const reviewedRides = JSON.parse(localStorage.getItem('reviewedRides') || '{}');
        if (!reviewedRides[latest.id]) {
          return latest;
        }
      }
      return null;
    } catch (e) { console.error(e); return null; }
  },

  // Terminer la course (Uniquement passager)
  completeRide: async (rideId: string) => {
    return (await api.patch(`/api/v1/trips/${rideId}/status`, { status: 'COMPLETED' })).data;
  },

  updateLocation: async (lat: number, lon: number): Promise<boolean> => {
    try {
      const response = await api.post<boolean>('/api/v1/location', { 
        latitude: lat, 
        longitude: lon 
      });
      return response.data;
    } catch (e) {
      console.error("Erreur envoi GPS au serveur", e);
      return false;
    }
  },

  getMyTrajectories: async (): Promise<DriverTrajectory[]> => {
    const response = await api.get<DriverTrajectory[]>('/api/v1/trips/trajectories/me');
    return response.data;
  },
};