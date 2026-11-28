import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useI18n } from '../../src/i18n';
import { subscriptionService, Plan, Subscription } from '../../src/services/subscriptionService';
import { Spacing, Radius } from '../../src/types/theme';

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
const errMsg = (e: any, fallback: string) => e?.response?.data?.detail || e?.response?.data?.message || fallback;

export default function DriverSubscriptionScreen() {
  const { Colors } = useTheme();
  const { t, lang } = useI18n();
  const [plans, setPlans] = useState<{ enabled: boolean; commissionRate: number; plans: Plan[] } | null>(null);
  const [mine, setMine] = useState<{ active: boolean; endsAt: string | null; history: Subscription[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<{ plan: Plan; challengeToken: string; reference: string } | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const date = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const load = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([subscriptionService.plans(), subscriptionService.mine()]);
      setPlans(p); setMine(m);
    } catch (e) { Alert.alert(t('Erreur'), errMsg(e, t('Impossible de charger les abonnements.'))); }
    finally { setLoading(false); }
  }, [t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const start = async (plan: Plan) => {
    setBusy(plan.id);
    try {
      const res = await subscriptionService.start(plan.id);
      setPending({ plan, challengeToken: res.challengeToken, reference: res.reference });
      setCode(''); setCodeError('');
    } catch (e) { Alert.alert(t('Erreur'), errMsg(e, t('Action impossible pour le moment.'))); }
    finally { setBusy(null); }
  };

  const confirm = async () => {
    if (!pending) return;
    if (!/^\d{4,8}$/.test(code.trim())) { setCodeError(t('Saisissez le code reçu (4 à 8 chiffres).')); return; }
    setBusy('confirm'); setCodeError('');
    try {
      const sub = await subscriptionService.confirm({ plan: pending.plan.id, reference: pending.reference, challengeToken: pending.challengeToken, code: code.trim() });
      setPending(null);
      Alert.alert(t('Abonnement activé'), t("Aucune commission jusqu'au {date}.", { date: date(sub.endsAt) }));
      load();
    } catch (e) { setCodeError(errMsg(e, t('Paiement refusé, réessayez.'))); }
    finally { setBusy(null); }
  };

  const rate = Math.round((plans?.commissionRate ?? 0) * 1000) / 10;
  const monthly = plans?.plans.find(p => p.id === 'MONTHLY')?.price ?? 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: Colors.cardBorder }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: Colors.input }]} onPress={() => router.back()} accessibilityLabel={t('Retour')}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: Colors.text }]}>{t('Abonnement')}</Text>
          <Text style={[styles.headerSub, { color: Colors.textMuted }]}>{t('ZÉRO COMMISSION PAR COURSE')}</Text>
        </View>
      </View>

      {loading ? <ActivityIndicator color={Colors.orange} style={{ marginTop: 60 }} /> : (
        <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={Colors.orange} />}>
          <View style={[styles.card, { backgroundColor: Colors.card, borderColor: mine?.active ? Colors.green : Colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.iconBox, { backgroundColor: mine?.active ? Colors.greenBg : Colors.orangeBg }]}>
                <Ionicons name={mine?.active ? 'shield-checkmark' : 'star'} size={22} color={mine?.active ? Colors.green : Colors.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: Colors.text }]}>{mine?.active ? t('Abonnement actif') : t('Sans abonnement')}</Text>
                <Text style={{ color: Colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {mine?.active ? t("Aucune commission jusqu'au {date}.", { date: date(mine.endsAt) })
                    : t('Une commission de {rate} % est prélevée sur chaque course acceptée.', { rate })}
                </Text>
              </View>
            </View>
          </View>

          {plans && !plans.enabled ? (
            <Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>{t('Les abonnements sont désactivés pour le moment.')}</Text>
          ) : plans?.plans.map(plan => {
            const yearly = plan.id === 'YEARLY';
            const saving = yearly && monthly ? Math.round((1 - plan.price / (monthly * 12)) * 100) : 0;
            return (
              <View key={plan.id} style={[styles.card, { backgroundColor: Colors.card, borderColor: yearly ? Colors.orange : Colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.cardTitle, { color: Colors.text }]}>{t(yearly ? 'Pack annuel' : 'Pack mensuel')}</Text>
                  {saving > 0 && <Text style={[styles.badge, { color: Colors.orange, backgroundColor: Colors.orangeBg }]}>{t('{n} % d’économie', { n: saving })}</Text>}
                </View>
                <Text style={[styles.price, { color: Colors.text }]}>{fcfa(plan.price)}<Text style={{ fontSize: 13, color: Colors.textMuted }}> / {t(yearly ? 'an' : 'mois')}</Text></Text>
                {['0 % de commission sur toutes vos courses', 'Plus de code à saisir pour accepter une course', 'Renouvelable : la période s’ajoute à la suite'].map(f => (
                  <View key={f} style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                    <Text style={{ color: Colors.textSecondary, fontSize: 13, flex: 1 }}>{t(f)}</Text>
                  </View>
                ))}
                <TouchableOpacity onPress={() => start(plan)} disabled={!!busy}
                  style={[styles.btn, { backgroundColor: yearly ? Colors.orange : Colors.input }, !!busy && { opacity: 0.5 }]}>
                  {busy === plan.id ? <ActivityIndicator color={yearly ? '#FFFFFF' : Colors.text} />
                    : <Text style={[styles.btnText, { color: yearly ? '#FFFFFF' : Colors.text }]}>{t(mine?.active ? 'Prolonger avec ce pack' : 'Choisir ce pack')}</Text>}
                </TouchableOpacity>
              </View>
            );
          })}

          {!!mine?.history.length && (
            <View style={[styles.card, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: Colors.text, marginBottom: 8 }]}>{t('Historique')}</Text>
              {mine.history.map(s => (
                <View key={s.id} style={[styles.row, { borderTopColor: Colors.cardBorder }]}>
                  <Text style={{ color: Colors.text, fontWeight: '700', flex: 1 }}>{t(s.plan === 'YEARLY' ? 'Pack annuel' : 'Pack mensuel')}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{date(s.startsAt)} → {date(s.endsAt)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: Colors.darkCard }]}>
            <Text style={[styles.cardTitle, { color: Colors.text, textAlign: 'center' }]}>{t('Confirmer le paiement')}</Text>
            <Text style={{ color: Colors.textSecondary, textAlign: 'center', marginVertical: 10 }}>
              {pending && t('{amount} seront débités de votre portefeuille. Saisissez le code de confirmation reçu.', { amount: fcfa(pending.plan.price) })}
            </Text>
            <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" autoFocus maxLength={8}
              accessibilityLabel={t('Code de confirmation')} placeholder="••••••" placeholderTextColor={Colors.textMuted}
              style={[styles.codeInput, { color: Colors.text, backgroundColor: Colors.input, borderColor: codeError ? Colors.red : Colors.inputBorder }]} />
            {!!codeError && <Text style={{ color: Colors.red, fontSize: 12, textAlign: 'center', marginTop: 6 }}>{codeError}</Text>}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: Colors.input, marginTop: 0 }]} onPress={() => setPending(null)}>
                <Text style={[styles.btnText, { color: Colors.text }]}>{t('Annuler')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: Colors.orange, marginTop: 0 }]} onPress={confirm} disabled={busy === 'confirm'}>
                {busy === 'confirm' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{t('Payer')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontWeight: '900', fontSize: 20, letterSpacing: -0.3 },
  headerSub: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 1 },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontWeight: '900', fontSize: 16 },
  badge: { fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  price: { fontWeight: '900', fontSize: 28, marginTop: 8, marginBottom: 6 },
  btn: { marginTop: 14, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: '900', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, gap: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: Radius.lg, padding: 20 },
  codeInput: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 14, fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 8 },
});
