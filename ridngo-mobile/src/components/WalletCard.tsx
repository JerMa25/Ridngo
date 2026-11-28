import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, StyleSheet, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { rideService } from '../services/rideService';
import { useTheme } from '../context/ThemeContext';
import { tr } from '../i18n';

const SUCCESS = ['SUCCESS', 'SUCCEEDED', 'COMPLETED', 'PAID', 'RECHARGED'];
const FAILURE = ['FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'REJECTED'];
const MIN = 100;
const err = (e: any, fallback: string) => e?.response?.data?.detail || e?.response?.data?.message || fallback;

type Mode = null | 'recharge' | 'withdraw';

/** Solde du wallet Kernel du chauffeur + recharge (MyCoolPay/Stripe) et retrait (2 étapes avec code). */
export function WalletCard({ balance, onChanged }: { balance: number; onChanged: () => void }) {
  const { Colors } = useTheme();
  const [mode, setMode] = useState<Mode>(null);
  return (
    <View style={[st.card, { backgroundColor: Colors.darkCard, borderColor: Colors.darkBorder }]}>
      <Text style={[st.label, { color: Colors.textMuted }]}>{tr("SOLDE DISPONIBLE")}</Text>
      <Text style={[st.balance, { color: Colors.text }]}>{balance.toLocaleString()} <Text style={{ color: Colors.orange, fontSize: 14 }}>FCFA</Text></Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <TouchableOpacity style={[st.btn, { backgroundColor: Colors.orange }]} onPress={() => setMode('recharge')} accessibilityRole="button">
          <Text style={st.btnTxt}>RECHARGER</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.btn, { backgroundColor: Colors.darkBorder }]} onPress={() => setMode('withdraw')} accessibilityRole="button">
          <Text style={[st.btnTxt, { color: Colors.text }]}>RETIRER</Text>
        </TouchableOpacity>
      </View>
      <WalletHistory />
      <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={() => setMode(null)}>
        <View style={st.overlay}>
          <View style={[st.sheet, { backgroundColor: Colors.darkCard }]}>
            <TouchableOpacity style={st.close} onPress={() => setMode(null)} accessibilityLabel={tr("Fermer")}><Ionicons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity>
            <ScrollView keyboardShouldPersistTaps="handled">
              {mode === 'recharge' && <Recharge onDone={() => { onChanged(); }} />}
              {mode === 'withdraw' && <Withdraw balance={balance} onDone={() => { onChanged(); }} />}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function useStoredPhone() {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  useEffect(() => {
    SecureStore.getItemAsync('user').then(raw => {
      try { const u = JSON.parse(raw || '{}'); setPhone(u.phone || ''); setFullName(u.name && !u.name.includes('@') ? u.name : ''); } catch { /* profil absent */ }
    });
  }, []);
  return { phone, setPhone, fullName, setFullName };
}

function Field({ label, error, ...props }: any) {
  const { Colors } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[st.label, { color: Colors.textMuted }]}>{label}</Text>
      <TextInput placeholderTextColor={Colors.textMuted} accessibilityLabel={label} {...props}
        style={[st.input, { color: Colors.text, borderColor: error ? Colors.red : Colors.darkBorder }]} />
      {!!error && <Text style={[st.err, { color: Colors.red }]}>{error}</Text>}
    </View>
  );
}

function Choice({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  const { Colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }} accessibilityRole="radiogroup">
      {options.map(o => (
        <TouchableOpacity key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ checked: value === o.value }}
          style={[st.choice, { borderColor: value === o.value ? Colors.orange : Colors.darkBorder, backgroundColor: value === o.value ? Colors.orangeBg : 'transparent' }]}>
          <Text style={{ color: value === o.value ? Colors.orange : Colors.textSecondary, fontWeight: '900', fontSize: 12 }}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Primary({ title, onPress, busy }: { title: string; onPress: () => void; busy?: boolean }) {
  const { Colors } = useTheme();
  return (
    <TouchableOpacity style={[st.primary, { backgroundColor: Colors.orange, opacity: busy ? 0.6 : 1 }]} onPress={onPress} disabled={busy} accessibilityRole="button">
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnTxt}>{title}</Text>}
    </TouchableOpacity>
  );
}

function Recharge({ onDone }: { onDone: () => void }) {
  const { Colors } = useTheme();
  const { phone, setPhone } = useStoredPhone();
  const [amount, setAmount] = useState('500');
  // ORANGE/MTN directs : acceptés par le Kernel mais aucune demande n'arrive (testé) → page MyCoolPay
  const [method, setMethod] = useState('MOBILE_MONEY');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<{ orderId: string; status: string; redirectUrl?: string } | null>(null);
  const [result, setResult] = useState<'paid' | 'failed' | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  const submit = async () => {
    const e: Record<string, string> = {};
    const v = Number(amount);
    if (!amount.trim() || !Number.isFinite(v)) e.amount = tr("Indiquez un montant.");
    else if (v < MIN) e.amount = tr('Minimum {n} FCFA.', { n: MIN });
    if (method !== 'CARD' && !/^\+?\d{8,15}$/.test(phone.replace(/\s/g, ''))) e.phone = tr("Numéro Mobile Money invalide.");
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const o = await rideService.rechargeWallet(v, phone.replace(/\s/g, ''), method);
      setOrder(o);
      if (o.redirectUrl) Linking.openURL(o.redirectUrl);
      const started = Date.now();
      poll.current = setInterval(async () => {
        try {
          const r = await rideService.refreshRechargeOrder(o.orderId);
          setOrder(r);
          const s = (r.status || '').toUpperCase();
          if (SUCCESS.includes(s)) { clearInterval(poll.current!); setResult('paid'); onDone(); }
          else if (FAILURE.includes(s)) { clearInterval(poll.current!); setResult('failed'); }
        } catch { /* réseau : prochain tour */ }
        if (Date.now() - started > 180000) { clearInterval(poll.current!); setResult('failed'); }
      }, 5000);
    } catch (x) { setErrors({ server: err(x, 'Recharge impossible pour le moment.') }); }
    finally { setBusy(false); }
  };

  if (result) return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <Ionicons name={result === 'paid' ? 'checkmark-circle' : 'close-circle'} size={48} color={result === 'paid' ? Colors.green : Colors.red} />
      <Text style={[st.title, { color: Colors.text }]}>{result === 'paid' ? tr('Wallet rechargé de {amount} FCFA', { amount: Number(amount).toLocaleString() }) : tr("Paiement non confirmé")}</Text>
      {result === 'failed' && <Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>{tr("Si vous avez validé, le solde se mettra à jour sous peu.")}</Text>}
    </View>
  );
  if (order) return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <Ionicons name="phone-portrait" size={40} color={Colors.orange} />
      <Text style={[st.title, { color: Colors.text }]}>{tr("Validez sur MyCoolPay, puis sur votre téléphone")}</Text>
      <Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>{tr("1. Cliquez « Submit » sur la page de paiement. 2. Tapez votre code secret pour confirmer ")}{Number(amount).toLocaleString()} FCFA.</Text>
      <ActivityIndicator color={Colors.orange} />
      <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{tr("Statut : ")}{order.status}</Text>
      {!!order.redirectUrl && <Primary title={tr("OUVRIR LA PAGE DE PAIEMENT")} onPress={() => Linking.openURL(order.redirectUrl!)} />}
    </View>
  );
  return (
    <View>
      <Text style={[st.title, { color: Colors.text }]}>{tr("Recharger mon wallet")}</Text>
      <Field label={tr("MONTANT (FCFA)")} value={amount} onChangeText={setAmount} keyboardType="number-pad" error={errors.amount} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: -4, marginBottom: 12 }}>
        {[500, 1000, 2000].map(a => (
          <TouchableOpacity key={a} onPress={() => setAmount(String(a))} style={[st.choice, { borderColor: amount === String(a) ? Colors.orange : Colors.darkBorder }]}>
            <Text style={{ color: amount === String(a) ? Colors.orange : Colors.textSecondary, fontWeight: '900' }}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Choice value={method} onChange={setMethod} options={[{ value: 'MOBILE_MONEY', label: tr("Mobile Money") }, { value: 'CARD', label: tr("Carte") }]} />
      {method !== 'CARD' && <Field label={tr("NUMÉRO MOBILE MONEY")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="6XXXXXXXX" error={errors.phone} />}
      {!!errors.server && <Text style={[st.err, { color: Colors.red, marginBottom: 8 }]}>{errors.server}</Text>}
      <Primary title={`${tr('VALIDER')} ${Number(amount) > 0 ? Number(amount).toLocaleString() + ' FCFA' : ''}`} onPress={submit} busy={busy} />
    </View>
  );
}

function Withdraw({ balance, onDone }: { balance: number; onDone: () => void }) {
  const { Colors } = useTheme();
  const { phone, setPhone, fullName, setFullName } = useStoredPhone();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('MTN_MOBILE_MONEY');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const clean = phone.replace(/\s/g, '');

  const requestCode = async () => {
    const e: Record<string, string> = {};
    const v = Number(amount);
    if (!amount.trim()) e.amount = tr("Indiquez le montant à retirer.");
    else if (!Number.isFinite(v) || v <= 0) e.amount = tr("Montant invalide.");
    else if (v < MIN) e.amount = tr('Minimum {n} FCFA.', { n: MIN });
    else if (v > balance) e.amount = tr('Solde insuffisant : {amount} FCFA disponibles.', { amount: balance.toLocaleString() });
    if (!/^\+?\d{8,15}$/.test(clean)) e.phone = tr("Numéro invalide (ex. 6XXXXXXXX).");
    if (fullName.trim().split(/\s+/).filter(Boolean).length < 2) e.name = tr("Nom et prénom exactement comme sur le compte Mobile Money.");
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try { setToken((await rideService.startWithdrawal(v, clean)).challengeToken); }
    catch (x) { setErrors({ server: err(x, 'Retrait impossible pour le moment.') }); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!/^\d{4,8}$/.test(code.trim())) { setErrors({ code: 'Saisissez le code reçu (4 à 8 chiffres).' }); return; }
    setErrors({}); setBusy(true);
    try {
      await rideService.confirmWithdrawal({ amount: Number(amount), phoneNumber: clean, method, recipientName: fullName.trim(), challengeToken: token, code: code.trim() });
      setDone(true); onDone();
    } catch (x) {
      const m = err(x, 'Le retrait a été refusé.');
      setErrors(/code|challenge|expir/i.test(m) ? { code: m } : { server: m });
    } finally { setBusy(false); }
  };

  if (done) return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <Ionicons name="checkmark-circle" size={48} color={Colors.green} />
      <Text style={[st.title, { color: Colors.text }]}>{tr("Retrait de ")}{Number(amount).toLocaleString()} {tr(" FCFA envoyé vers le ")}{clean}</Text>
    </View>
  );
  return (
    <View>
      <Text style={[st.title, { color: Colors.text }]}>{tr("Retirer de l’argent")}</Text>
      <Text style={{ color: Colors.textSecondary, marginBottom: 12 }}>{tr("Solde : ")}{balance.toLocaleString()} FCFA</Text>
      {!token ? (
        <>
          <Field label={tr("MONTANT (FCFA)")} value={amount} onChangeText={setAmount} keyboardType="number-pad" error={errors.amount} />
          <Choice value={method} onChange={setMethod} options={[{ value: 'MTN_MOBILE_MONEY', label: tr("MTN MoMo") }, { value: 'ORANGE_MONEY', label: tr("Orange Money") }]} />
          <Field label={tr("NUMÉRO MOBILE MONEY")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
          <Field label={tr("NOM DU TITULAIRE DU COMPTE")} value={fullName} onChangeText={setFullName} placeholder={tr("Nom Prénom")} error={errors.name} />
          {!!errors.server && <Text style={[st.err, { color: Colors.red, marginBottom: 8 }]}>{errors.server}</Text>}
          <Primary title={tr("RECEVOIR LE CODE")} onPress={requestCode} busy={busy} />
        </>
      ) : (
        <>
          <Text style={{ color: Colors.textSecondary, marginBottom: 12 }}>{tr("Un code de confirmation vient de vous être envoyé.")}</Text>
          <Field label={tr("CODE REÇU")} value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" autoFocus error={errors.code} />
          {!!errors.server && <Text style={[st.err, { color: Colors.red, marginBottom: 8 }]}>{errors.server}</Text>}
          <Primary title={tr("CONFIRMER LE RETRAIT")} onPress={confirm} busy={busy} />
        </>
      )}
    </View>
  );
}

/** Opérations et recharges, chargées à l'ouverture (comme les deux listes de la page wallet web). */
function WalletHistory() {
  const { Colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txs, setTxs] = useState<Awaited<ReturnType<typeof rideService.getMyWalletTransactions>>>([]);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof rideService.getMyRechargeOrders>>>([]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoading(true);
    const [t, o] = await Promise.all([
      rideService.getMyWalletTransactions().catch(() => []),
      rideService.getMyRechargeOrders().catch(() => []),
    ]);
    setTxs(t); setOrders(o); setLoading(false);
  };

  const row = { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
    backgroundColor: Colors.input, borderRadius: 14, padding: 12, marginTop: 8 };
  return (
    <View style={{ marginTop: 14 }}>
      <TouchableOpacity onPress={toggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityRole="button">
        <Ionicons name={open ? 'chevron-up' : 'time-outline'} size={14} color={Colors.textMuted} />
        <Text style={[st.label, { color: Colors.textMuted, marginBottom: 0 }]}>{open ? tr("MASQUER L’HISTORIQUE") : tr("VOIR L’HISTORIQUE")}</Text>
      </TouchableOpacity>
      {open && (loading ? <ActivityIndicator color={Colors.orange} style={{ marginTop: 10 }} /> : (
        <View>
          <Text style={[st.label, { color: Colors.textMuted, marginTop: 12 }]}>{tr("OPÉRATIONS")}</Text>
          {txs.length === 0 ? <Text style={{ color: Colors.textMuted, fontStyle: 'italic', fontSize: 12 }}>{tr("Aucune transaction enregistrée.")}</Text>
            : txs.map(tx => {
              const debit = tx.transactionType === 'RIDE_PAYMENT';
              return (
                <View key={tx.id} style={row}>
                  <View>
                    <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 12 }}>{debit ? tr("Débit course") : tr("Crédit / recharge")}</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{new Date(tx.createdAt).toLocaleDateString('fr-FR')}</Text>
                  </View>
                  <Text style={{ color: debit ? Colors.red : Colors.green, fontWeight: '900', fontSize: 10 }}>{tx.status}</Text>
                </View>
              );
            })}
          <Text style={[st.label, { color: Colors.textMuted, marginTop: 14 }]}>RECHARGES</Text>
          {orders.length === 0 ? <Text style={{ color: Colors.textMuted, fontStyle: 'italic', fontSize: 12 }}>{tr("Aucun historique de recharge.")}</Text>
            : orders.map(o => (
              <View key={o.orderId} style={row}>
                <Text style={{ color: Colors.orange, fontWeight: '900', fontSize: 12 }}>{o.amount.toLocaleString()} FCFA</Text>
                <Text style={{ color: SUCCESS.includes((o.status || '').toUpperCase()) ? Colors.green : Colors.textMuted, fontWeight: '900', fontSize: 10 }}>{o.status}</Text>
              </View>
            ))}
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  balance: { fontSize: 32, fontWeight: '900' },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 36, maxHeight: '90%' },
  close: { position: 'absolute', right: 16, top: 12, zIndex: 2 },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '700' },
  err: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  choice: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  primary: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
});
