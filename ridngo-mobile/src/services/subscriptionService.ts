import api from './api';

export type Plan = { id: 'MONTHLY' | 'YEARLY'; price: number; months: number };
export type Subscription = { id: string; plan: string; amount: number; startsAt: string; endsAt: string };

/** Packs chauffeur : plus de commission par course pendant la période payée (mêmes appels que le web). */
export const subscriptionService = {
  plans: async (): Promise<{ enabled: boolean; commissionRate: number; plans: Plan[] }> =>
    (await api.get('/api/v1/subscriptions/plans')).data,
  mine: async (): Promise<{ active: boolean; endsAt: string | null; history: Subscription[] }> =>
    (await api.get('/api/v1/subscriptions/me')).data,
  start: async (plan: string): Promise<{ challengeToken: string; reference: string; amount: number }> =>
    (await api.post('/api/v1/subscriptions/me/challenge', { plan })).data,
  confirm: async (body: { plan: string; reference: string; challengeToken: string; code: string }): Promise<Subscription> =>
    (await api.post('/api/v1/subscriptions/me', body)).data,
};
