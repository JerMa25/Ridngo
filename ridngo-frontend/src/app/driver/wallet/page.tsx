/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { rideService } from '@/lib/rideService';
import { userService } from '@/lib/userService';
import { Wallet as WalletIcon, History, Loader2, Zap, X, CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft, Landmark } from 'lucide-react';
import { Wallet, TransactionSummary, RechargeOrder } from '@/types/api';

const PENDING_ORDER_KEY = 'ridngo_pending_recharge_order_id';

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [rechargeOrders, setRechargeOrders] = useState<RechargeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [starting, setStarting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [returnBanner, setReturnBanner] = useState<'success' | 'failure' | null>(null);

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
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment');
      const pendingOrderId = localStorage.getItem(PENDING_ORDER_KEY);

      if (paymentStatus && pendingOrderId) {
        try {
          await rideService.refreshRechargeOrder(pendingOrderId);
          setReturnBanner(paymentStatus === 'success' ? 'success' : 'failure');
        } catch {
          setReturnBanner('failure');
        } finally {
          localStorage.removeItem(PENDING_ORDER_KEY);
          window.history.replaceState({}, '', window.location.pathname);
        }
      }

      await loadWalletData();
      setLoading(false);
    };

    handleReturn();
  }, [loadWalletData]);

  const startRecharge = async () => {
    const parsedAmount = parseInt(amount, 10);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Entre un montant valide.');
      return;
    }

    setStarting(true);
    setError(null);
    try {
      const me = await userService.getMe();
      const order = await rideService.rechargeWallet(parsedAmount, me.telephone);
      localStorage.setItem(PENDING_ORDER_KEY, order.orderId);
      window.location.href = order.redirectUrl;
    } catch {
      setError("Impossible de démarrer la recharge. Réessaie dans un instant.");
      setStarting(false);
    }
  };

  const startWithdraw = async () => {
    const parsedAmount = parseInt(withdrawAmount, 10);
    if (!parsedAmount || parsedAmount <= 0) {
      setWithdrawError('Entre un montant valide.');
      return;
    }
    if (wallet && parsedAmount > wallet.balance) {
      setWithdrawError('Solde insuffisant pour ce retrait.');
      return;
    }
    if (!withdrawPhone) {
      setWithdrawError('Veuillez entrer un numéro de téléphone.');
      return;
    }

    setWithdrawing(true);
    setWithdrawError(null);
    
    // Simulation du retrait Mobile Money
    setTimeout(async () => {
      try {
        setWithdrawSuccess(true);
        setWithdrawAmount('');
        // Rafraîchir les données
        await loadWalletData();
      } catch (err) {
        setWithdrawError("Échec du retrait. Réessayez plus tard.");
      } finally {
        setWithdrawing(false);
      }
    }, 2000);
  };

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

      {returnBanner && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
          returnBanner === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
        }`}>
          {returnBanner === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {returnBanner === 'success'
            ? 'Recharge confirmée — ton solde est à jour.'
            : "La recharge n'a pas abouti. Ton solde n'a pas changé."}
        </div>
      )}

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
              onClick={() => setShowRechargeModal(true)}
              className="w-full bg-orange-btn hover:bg-white hover:text-orange-btn text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all"
            >
              Recharger mon wallet
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowRechargeModal(true)}
                className="flex-1 bg-orange-btn hover:bg-white hover:text-orange-btn text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all"
              >
                Recharger
              </button>
              <button
                onClick={() => { setShowWithdrawModal(true); setWithdrawSuccess(false); }}
                className="flex-1 bg-[#E0E1DD] hover:bg-orange-btn hover:text-white text-[#1B263B] py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all"
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

      {/* Modal de recharge */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-background w-full max-w-md rounded-[30px] p-6 md:p-8 relative">
            <button
              onClick={() => { setShowRechargeModal(false); setError(null); setAmount(''); }}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center"
            >
              <X size={16} />
            </button>
            <h2 className="text-xl font-black italic tracking-tighter mb-1">Recharger le wallet</h2>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-6">
              Tu seras redirigé vers l&apos;interface de paiement sécurisée
            </p>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Montant en FCFA"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-foreground/5 rounded-2xl px-4 py-3.5 text-lg font-bold mb-2 outline-none focus:ring-2 focus:ring-orange-btn"
            />
            {error && <p className="text-red-500 text-xs font-bold mb-2">{error}</p>}
            <button
              onClick={startRecharge}
              disabled={starting}
              className="w-full bg-orange-btn hover:bg-orange-btn/90 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {starting ? <Loader2 size={16} className="animate-spin" /> : 'Continuer vers le paiement'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de retrait */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-background w-full max-w-md rounded-[30px] p-6 md:p-8 relative">
            <button
              onClick={() => { setShowWithdrawModal(false); setWithdrawError(null); setWithdrawAmount(''); }}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center"
            >
              <X size={16} />
            </button>
            <h2 className="text-xl font-black italic tracking-tighter mb-1">Retirer de l&apos;argent</h2>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-6">
              Veuillez renseigner votre compte Mobile Money
            </p>

            {withdrawSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <p className="text-sm font-bold text-foreground">Demande de retrait initiée !</p>
                <p className="text-xs text-foreground/60 mt-1">Vous recevrez une notification de paiement sous peu sur votre téléphone.</p>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="mt-6 bg-[#1B263B] text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Montant à retirer (FCFA)"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-foreground/5 rounded-2xl px-4 py-3.5 text-lg font-bold mb-4 outline-none focus:ring-2 focus:ring-orange-btn"
                />
                <input
                  type="tel"
                  placeholder="Numéro Mobile Money (ex: +237...)"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  className="w-full bg-foreground/5 rounded-2xl px-4 py-3.5 text-sm font-bold mb-2 outline-none focus:ring-2 focus:ring-orange-btn"
                />
                {withdrawError && <p className="text-red-500 text-xs font-bold mb-2">{withdrawError}</p>}
                <button
                  onClick={startWithdraw}
                  disabled={withdrawing}
                  className="w-full bg-orange-btn hover:bg-orange-btn/90 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {withdrawing ? <Loader2 size={16} className="animate-spin" /> : 'Confirmer le retrait'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}