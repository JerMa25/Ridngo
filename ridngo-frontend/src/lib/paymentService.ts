import api from './api-client';

export interface Wallet {
  id: string;
  ownerId: string;
  ownerName: string;
  balance: number;
}

export interface Transaction {
  id: string;
  walletId: string;
  amount: number;
  type: string;
  description: string;
  reference: string;
  createdAt: string;
}

export const paymentService = {
  /**
   * Récupère le wallet de l'utilisateur connecté via le backend.
   * Le backend se chargera d'appeler YowYob Pay avec le X-Tenant-Id.
   */
  getMyWallet: async (userId: string): Promise<Wallet> => {
    // Note : Le backend gère la création automatique du wallet s'il n'existe pas,
    // ou on l'appelle ici si on expose une route dédiée.
    // Pour l'instant on simule l'appel au backend :
    const res = await api.get(`/api/v1/users/${userId}/wallet`);
    return res.data;
  },

  /**
   * Récupère l'historique des transactions.
   */
  getTransactionHistory: async (walletId: string): Promise<Transaction[]> => {
    const res = await api.get(`/api/v1/wallets/${walletId}/transactions`);
    return res.data;
  }
};
