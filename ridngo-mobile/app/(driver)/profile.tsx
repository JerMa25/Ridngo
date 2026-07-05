import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
  TextInput, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { driverService, userService } from '../../src/services/userService';
import { Spacing, Radius } from '../../src/types/theme';

export default function DriverProfileScreen() {
  const { user, logout } = useAuth();
  const { Colors, isDark, toggleTheme } = useTheme();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Changement de mot de passe
  const [showPassForm, setShowPassForm] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passData, setPassData] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const data = await driverService.getDriverProfile();
      setProfile(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler' },
      { text: 'Déconnexion', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  const handleChangePassword = async () => {
    if (!passData.current || !passData.next || !passData.confirm) {
      Alert.alert('Erreur', 'Remplissez tous les champs'); return;
    }
    if (passData.next !== passData.confirm) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas'); return;
    }
    if (passData.next.length < 6) {
      Alert.alert('Erreur', 'Minimum 6 caractères'); return;
    }
    setChangingPass(true);
    try {
      await userService.changePassword(passData.current, passData.next);
      Alert.alert('✅', 'Mot de passe mis à jour avec succès');
      setShowPassForm(false);
      setPassData({ current: '', next: '', confirm: '' });
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de changer le mot de passe.');
    } finally { setChangingPass(false); }
  };

  const vehicle = profile?.vehicle;
  const driver  = profile?.driver;

  const displayName  = profile?.user
    ? `${profile.user.firstName || ''} ${profile.user.lastName || ''}`.trim() || profile.user.username
    : user?.name || '—';
  const displayEmail = profile?.user?.email || user?.email || '—';
  const initial      = displayName?.[0]?.toUpperCase() || '?';

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.centered}>
          <ActivityIndicator color={Colors.orange} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 100 }]} keyboardShouldPersistTaps="handled">

        {/* ── Hero ── */}
        <View style={[s.heroCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
          <View style={[s.avatar, { backgroundColor: Colors.orange }]}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <Text style={[s.name, { color: Colors.text }]}>{displayName}</Text>
          <Text style={[s.email, { color: Colors.textMuted }]}>{displayEmail}</Text>

          <View style={s.badgesRow}>
            <View style={[s.badge, { backgroundColor: Colors.orange }]}>
              <Ionicons name="car-sport" size={11} color="#0D0D0D" />
              <Text style={[s.badgeTxt, { color: '#0D0D0D' }]}>CHAUFFEUR CERTIFIÉ</Text>
            </View>
            {driver?.isOnline !== undefined && (
              <View style={[s.badge, { backgroundColor: driver.isOnline ? Colors.greenBg : Colors.input }]}>
                <View style={[s.onlineDot, { backgroundColor: driver.isOnline ? Colors.green : Colors.textMuted }]} />
                <Text style={[s.badgeTxt, { color: driver.isOnline ? Colors.green : Colors.textMuted }]}>
                  {driver.isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
                </Text>
              </View>
            )}
          </View>

          {/* Rating */}
          {driver && (
            <View style={s.ratingRow}>
              <Ionicons name="star" size={14} color={Colors.orange} />
              <Text style={[s.ratingVal, { color: Colors.text }]}>
                {(driver.averageRating ?? 5.0).toFixed(1)}
              </Text>
              <Text style={[s.ratingCount, { color: Colors.textMuted }]}>
                ({driver.totalReviewsCount ?? 0} avis)
              </Text>
            </View>
          )}
        </View>

        {/* ── Véhicule (résumé) ── */}
        {vehicle && (
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: Colors.textMuted }]}>MON VÉHICULE</Text>
            <TouchableOpacity
              style={[s.vehicleRow, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}
              onPress={() => router.push('/(driver)/vehicle' as any)}
              activeOpacity={0.75}
            >
              <View style={[s.vehicleIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name="car-outline" size={22} color={Colors.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.vehicleName, { color: Colors.text }]}>
                  {vehicle.brand || vehicle.makeName || 'Véhicule'}{vehicle.modelName ? ` ${vehicle.modelName}` : ''}
                </Text>
                <Text style={[s.vehiclePlate, { color: Colors.textMuted }]}>
                  {vehicle.registrationNumber || 'Plaque non définie'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Apparence ── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: Colors.textMuted }]}>APPARENCE</Text>
          <View style={[s.menuGroup, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
            <View style={[s.menuItem, { borderBottomColor: Colors.cardBorder }]}>
              <View style={[s.menuIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={Colors.orange} />
              </View>
              <Text style={[s.menuLabel, { color: Colors.text }]}>
                {isDark ? 'Mode sombre' : 'Mode clair'}
              </Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                thumbColor={isDark ? Colors.orange : Colors.textMuted}
                trackColor={{ false: Colors.input, true: Colors.orangeBg }}
              />
            </View>
          </View>
        </View>

        {/* ── Compte ── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: Colors.textMuted }]}>MON COMPTE</Text>
          <View style={[s.menuGroup, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>

            {/* Notifications */}
            <TouchableOpacity
              style={[s.menuItem, { borderBottomColor: Colors.cardBorder }]}
              onPress={() => router.push('/(driver)/notifications' as any)}
            >
              <View style={[s.menuIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name="notifications-outline" size={18} color={Colors.orange} />
              </View>
              <Text style={[s.menuLabel, { color: Colors.text }]}>Notifications</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Changer mot de passe */}
            <TouchableOpacity
              style={[s.menuItem, { borderBottomColor: Colors.cardBorder }]}
              onPress={() => setShowPassForm(!showPassForm)}
            >
              <View style={[s.menuIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name="key-outline" size={18} color={Colors.orange} />
              </View>
              <Text style={[s.menuLabel, { color: Colors.text }]}>Changer le mot de passe</Text>
              <Ionicons name={showPassForm ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Formulaire mot de passe */}
            {showPassForm && (
              <View style={[s.passForm, { borderTopColor: Colors.cardBorder }]}>
                {([
                  { key: 'current' as const, label: 'Mot de passe actuel' },
                  { key: 'next'    as const, label: 'Nouveau mot de passe' },
                  { key: 'confirm' as const, label: 'Confirmer' },
                ]).map(f => (
                  <TextInput
                    key={f.key}
                    style={[s.passInput, { backgroundColor: Colors.input, color: Colors.text, borderColor: Colors.cardBorder }]}
                    placeholder={f.label}
                    placeholderTextColor={Colors.textMuted}
                    value={passData[f.key]}
                    onChangeText={v => setPassData(p => ({ ...p, [f.key]: v }))}
                    secureTextEntry
                    autoCorrect={false}
                  />
                ))}
                <TouchableOpacity
                  style={[s.passBtn, changingPass && { opacity: 0.6 }]}
                  onPress={handleChangePassword}
                  disabled={changingPass}
                >
                  {changingPass
                    ? <ActivityIndicator color="#0D0D0D" size="small" />
                    : <Text style={s.passBtnText}>Mettre à jour</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Aide */}
            <TouchableOpacity style={[s.menuItem, { borderBottomColor: Colors.cardBorder }]}>
              <View style={[s.menuIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name="help-circle-outline" size={18} color={Colors.orange} />
              </View>
              <Text style={[s.menuLabel, { color: Colors.text }]}>Aide & Support</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Déconnexion */}
            <TouchableOpacity
              style={[s.menuItem, { borderBottomColor: 'transparent' }]}
              onPress={handleLogout}
            >
              <View style={[s.menuIcon, { backgroundColor: Colors.redBg }]}>
                <Ionicons name="log-out-outline" size={18} color={Colors.red} />
              </View>
              <Text style={[s.menuLabel, { color: Colors.red }]}>Déconnexion</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.red} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[s.version, { color: Colors.textMuted }]}>RidnGo v1.0.0 — Yowyob Inc. Ltd.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.lg, gap: Spacing.lg },

  // Hero
  heroCard: {
    borderRadius: Radius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: 8, borderWidth: 1,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF8C00', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, elevation: 8,
  },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 32 },
  name:  { fontWeight: '900', fontSize: 22, letterSpacing: -0.3 },
  email: { fontSize: 13, fontWeight: '500' },
  badgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
  },
  badgeTxt: { fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingVal: { fontWeight: '900', fontSize: 14 },
  ratingCount: { fontSize: 12, fontWeight: '600' },

  // Section
  section: { gap: 8 },
  sectionLabel: { fontWeight: '900', fontSize: 10, letterSpacing: 3, paddingLeft: 4 },

  // Vehicle
  vehicleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.md,
  },
  vehicleIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontWeight: '900', fontSize: 15 },
  vehiclePlate: { fontWeight: '700', fontSize: 12, marginTop: 2 },

  // Menu
  menuGroup: { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: Spacing.md, borderBottomWidth: 1,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontWeight: '700', fontSize: 14 },

  // Password form
  passForm: { padding: Spacing.md, gap: Spacing.sm, borderTopWidth: 1 },
  passInput: {
    borderRadius: Radius.md, padding: 14, fontWeight: '700',
    fontSize: 14, borderWidth: 1,
  },
  passBtn: { backgroundColor: '#FF8C00', borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  passBtnText: { color: '#0D0D0D', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },

  version: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
});
