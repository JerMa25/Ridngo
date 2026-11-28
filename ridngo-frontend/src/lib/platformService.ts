/* eslint-disable @typescript-eslint/no-explicit-any */
import api from './api-client';

export type PlatformSettings = { commissionRate: number; monthlyPrice: number; yearlyPrice: number; subscriptionsEnabled: boolean; updatedAt?: string };
export type Plan = { id: 'MONTHLY' | 'YEARLY'; price: number; months: number };
export type Subscription = { id: string; driverId: string; plan: string; amount: number; startsAt: string; endsAt: string; paymentReference: string; createdAt?: string };

/** Abonnements chauffeur et console d'administration. */
export const platformService = {
  plans: async (): Promise<{ enabled: boolean; commissionRate: number; plans: Plan[] }> =>
    (await api.get('/api/v1/subscriptions/plans')).data,
  mySubscription: async (): Promise<{ active: boolean; endsAt: string | null; history: Subscription[] }> =>
    (await api.get('/api/v1/subscriptions/me')).data,
  startSubscription: async (plan: string): Promise<{ challengeToken: string; reference: string; amount: number }> =>
    (await api.post('/api/v1/subscriptions/me/challenge', { plan })).data,
  confirmSubscription: async (body: { plan: string; reference: string; challengeToken: string; code: string }): Promise<Subscription> =>
    (await api.post('/api/v1/subscriptions/me', body)).data,

  admin: {
    overview: async (): Promise<Record<string, any>> => (await api.get('/api/v1/admin/overview')).data,
    settings: async (): Promise<PlatformSettings> => (await api.get('/api/v1/admin/settings')).data,
    updateSettings: async (s: PlatformSettings): Promise<PlatformSettings> => (await api.put('/api/v1/admin/settings', s)).data,
    users: async (search = ''): Promise<any[]> => (await api.get('/api/v1/admin/users', { params: { search } })).data,
    messageUser: async (id: string, title: string, message: string) => api.post(`/api/v1/admin/users/${id}/message`, { title, message }),
    drivers: async (): Promise<any[]> => (await api.get('/api/v1/admin/drivers')).data,
    validateDriver: async (id: string) => api.patch(`/api/v1/admin/drivers/${id}/validate`),
    suspendDriver: async (id: string) => api.patch(`/api/v1/admin/drivers/${id}/suspend`),
    rides: async (): Promise<any[]> => (await api.get('/api/v1/admin/rides')).data,
    offers: async (): Promise<any[]> => (await api.get('/api/v1/admin/offers')).data,
    subscriptions: async (): Promise<Subscription[]> => (await api.get('/api/v1/admin/subscriptions')).data,
  },
};

/** Message d'erreur lisible (ProblemDetail Spring : `detail`). */
export const apiError = (e: any, fallback: string) => e?.response?.data?.detail || e?.response?.data?.message || fallback;
