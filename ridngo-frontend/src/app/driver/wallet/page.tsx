/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { rideService } from '@/lib/rideService';
import { Wallet as WalletIcon, History, Loader2, Zap, ArrowUpRight, ArrowDownLeft, Landmark } from 'lucide-react';
import { Wallet, TransactionSummary, RechargeOrder } from '@/types/api';

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [rechargeOrders, setRechargeOrders] = useState<RechargeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWalletData = useCallback(async () => {
    try {
      const w = await rideService.getMyWallet();
      setWallet(w);
      
      // Charger également l'historique
      const txs = await rideService.getMyWalletTransactions();
      setTransactions(txs || []);

      const orders = await rideService.getMyRechargeOrders();
      setRechargeOrders(orders || []);
      
      return w;
    } catch (err) {
      console.error("Erreur de chargement du wallet", err);
    }
  }, []);

  useEffect(() => {
    const handleReturn = async () => {
      await loadWalletData();
      setLoading(false);
    };

    handleReturn();
  }, [loadWalletData]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-btn" />
      </div>
    );
  }

  const isWalletZero = !wallet || wallet.balance === 0;

  return (
    <main className="max-w-4xl mx-auto p-6 md:py-12 pb-32">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic">Mon Wallet</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Gérez vos revenus et retraits</p>
        </div>
        <div className="w-12 h-12 bg-foreground/5 rounded-2xl flex items-center justify-center text-orange-btn">
          <WalletIcon size={24} />
        </div>
      </div>

      {/* Carte solde + Boutons adaptatifs */}
      <div className="p-6 md:p-8 border-none bg-[#1B263B] text-white shadow-2xl rounded-[30px] relative overflow-hidden mb-8">
        <div className="absolute -top-4 -right-4 text-orange-btn opacity-10">
          <Zap size={100} fill="currentColor" />
        </div>
        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">Solde disponible</p>
          <div className="flex items-baseline gap-1.5 mb-6">
            <p className="text-4xl md:text-5xl font-black italic tracking-tighter">
              {wallet?.balance?.toLocaleString() || 0}
            </p>
            <span className="text-xs font-black text-orange-btn uppercase">FCFA</span>
          </div>

          {/* Condition d'affichage des boutons */}
          {isWalletZero ? (
            <button
              onClick={() => { window.location.href = 'https://kernel-core.yowyob.com/pay'; }}
              className="w-full bg-orange-btn hover:bg-white hover:text-orange-btn text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all cursor-pointer"
            >
              Recharger mon wallet
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { window.location.href = 'https://kernel-core.yowyob.com/pay'; }}
                className="flex-1 bg-orange-btn hover:bg-white hover:text-orange-btn text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all cursor-pointer"
              >
                Recharger
              </button>
              <button
                onClick={() => { window.location.href = 'https://kernel-core.yowyob.com/pay'; }}
                className="flex-1 bg-[#E0E1DD] hover:bg-orange-btn hover:text-white text-[#1B263B] py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all cursor-pointer"
              >
                Retirer l&apos;argent
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Détails et historique */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Historique des Transactions Blockchain */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 opacity-40 px-2">
            <History size={16} />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Opérations Blockchain</h3>
          </div>
          {transactions.length === 0 ? (
            <div className="bg-foreground/5 rounded-[20px] p-6 text-center italic text-sm text-foreground/40">
              Aucune transaction enregistrée.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-foreground/5 rounded-[20px] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.transactionType === 'RIDE_PAYMENT' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                    }`}>
                      {tx.transactionType === 'RIDE_PAYMENT' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{tx.transactionType === 'RIDE_PAYMENT' ? 'Débit course' : 'Crédit/Recharge'}</p>
                      <p className="text-[9px] opacity-40">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-black ${
                      tx.transactionType === 'RIDE_PAYMENT' ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {tx.transactionType === 'RIDE_PAYMENT' ? '-' : '+'}{tx.sourceReference.includes('PAYMENT') ? '' : ''} Hash: {tx.transactionHash ? tx.transactionHash.substring(0, 8) : 'Pending'}
                    </p>
                    <span className="text-[9px] uppercase font-black opacity-30">{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique des ordres de recharge */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 opacity-40 px-2">
            <Landmark size={16} />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Recharges (MyCoolPay)</h3>
          </div>
          {rechargeOrders.length === 0 ? (
            <div className="bg-foreground/5 rounded-[20px] p-6 text-center italic text-sm text-foreground/40">
              Aucun historique de recharge.
            </div>
          ) : (
            <div className="space-y-3">
              {rechargeOrders.map((order) => (
                <div key={order.orderId} className="bg-foreground/5 rounded-[20px] p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">Ordre #{order.orderId.substring(0, 8)}</p>
                    <p className="text-[10px] font-black text-orange-btn">{order.amount.toLocaleString()} FCFA</p>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                    order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}