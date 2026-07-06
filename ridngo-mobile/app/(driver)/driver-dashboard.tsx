import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { rideService } from '../../src/services/rideService';
import { userService } from '../../src/services/userService';
import { Spacing, Radius } from '../../src/types/theme';

export default function DriverDashboardScreen() {
  const { user } = useAuth();
  const { Colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);

  const loadData = async () => {
    try {
      const [walletRes, historyRes, reviewsRes, profileRes] = await Promise.allSettled([
        rideService.getMyWallet(),
        rideService.getEnrichedHistory().catch(() => rideService.getRideHistory()),
        rideService.getMyReviews(),
        userService.getDriverProfile(),
      ]);
      if (walletRes.status === 'fulfilled') setWallet(walletRes.value);
      if (historyRes.status === 'fulfilled') setHistory(Array.isArray(historyRes.value) ? historyRes.value : []);
      if (reviewsRes.status === 'fulfilled') setReviews(Array.isArray(reviewsRes.value) ? reviewsRes.value : []);
      if (profileRes.status === 'fulfilled') setProfileData(profileRes.value);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const firstName = profileData?.firstName || user?.name?.split(' ')[0] || 'Chauffeur';
  
  // Stats rapides
  const completed = history.filter((r: any) => r.state === 'COMPLETED');
  const revenueStr = wallet?.balance?.toLocaleString() || '0';
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  // Calcul revenus 7 derniers jours (simplifié)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  
  const weeklyData = last7Days.map(date => {
    const dayStr = date.toISOString().split('T')[0];
    const dayRides = completed.filter((r: any) => r.createdAt && r.createdAt.startsWith(dayStr));
    const dayRev = dayRides.reduce((sum, r) => sum + (r.price || 0), 0);
    return { 
      day: date.toLocaleDateString('fr-FR', { weekday: 'short' }).charAt(0).toUpperCase(),
      revenue: dayRev 
    };
  });
  const maxWeeklyRev = Math.max(...weeklyData.map(d => d.revenue), 1000); // eviter div by 0

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.orange} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors.cardBorder }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerSub, { color: Colors.textMuted }]}>TABLEAU DE BORD</Text>
          <Text style={[styles.headerTitle, { color: Colors.text }]}>Bonjour, <Text style={{ color: Colors.orange }}>{firstName}</Text></Text>
        </View>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: Colors.input }]} onPress={() => router.push('/(driver)/notifications')}>
          <Ionicons name="notifications-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.orange} />}
      >

        {/* Portefeuille */}
        <View style={[styles.walletCard, { backgroundColor: Colors.orange }]}>
          <View style={styles.walletHeader}>
            <View>
              <Text style={styles.walletLabel}>SOLDE DISPONIBLE</Text>
              <Text style={styles.walletValue}>{revenueStr} <Text style={styles.walletCurrency}>FCFA</Text></Text>
            </View>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet" size={24} color={Colors.orange} />
            </View>
          </View>
          <TouchableOpacity style={styles.walletBtn} onPress={() => router.push('/(driver)/history')}>
            <Text style={styles.walletBtnText}>Voir l'historique complet</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats 3 blocs */}
        <View style={styles.statsGrid}>
          <TouchableOpacity style={[styles.statBox, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]} onPress={() => router.push('/(driver)/performance')}>
             <View style={[styles.statIconBox, { backgroundColor: '#EAB308' }]}><Ionicons name="star" size={16} color="#fff" /></View>
             <Text style={[styles.statVal, { color: Colors.text }]}>{averageRating}</Text>
             <Text style={[styles.statLbl, { color: Colors.textMuted }]}>NOTE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statBox, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]} onPress={() => router.push('/(driver)/history')}>
             <View style={[styles.statIconBox, { backgroundColor: '#3B82F6' }]}><Ionicons name="car" size={16} color="#fff" /></View>
             <Text style={[styles.statVal, { color: Colors.text }]}>{completed.length}</Text>
             <Text style={[styles.statLbl, { color: Colors.textMuted }]}>COURSES</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statBox, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]} onPress={() => router.push('/(driver)/heatmap')}>
             <View style={[styles.statIconBox, { backgroundColor: '#EF4444' }]}><Ionicons name="flame" size={16} color="#fff" /></View>
             <Text style={[styles.statVal, { color: Colors.text }]}>Zone</Text>
             <Text style={[styles.statLbl, { color: Colors.textMuted }]}>INFLUENCE</Text>
          </TouchableOpacity>
        </View>

        {/* Graphique Revenus */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>REVENUS DES 7 DERNIERS JOURS</Text>
          <View style={[styles.chartCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
            <View style={styles.chartBars}>
              {weeklyData.map((d, i) => (
                <View key={i} style={styles.chartBarCol}>
                  <View style={[styles.chartBarBg, { backgroundColor: Colors.input }]}>
                    <View style={[styles.chartBarFill, { backgroundColor: Colors.orange, height: `${(d.revenue / maxWeeklyRev) * 100}%` }]} />
                  </View>
                  <Text style={[styles.chartDay, { color: Colors.textMuted }]}>{d.day}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Véhicule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>MON VÉHICULE</Text>
            <TouchableOpacity onPress={() => router.push('/(driver)/profile')}>
              <Text style={[styles.linkText, { color: Colors.orange }]}>Modifier</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.vehicleCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
            <View style={[styles.vehicleIcon, { backgroundColor: Colors.orangeBg }]}>
              <Ionicons name="car-sport" size={24} color={Colors.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.vehicleModel, { color: Colors.text }]}>
                {profileData?.vehicle?.brand || 'Marque'} {profileData?.vehicle?.model || 'Modèle'}
              </Text>
              <Text style={[styles.vehiclePlate, { color: Colors.textMuted }]}>
                {profileData?.vehicle?.registrationNumber || 'Non renseignée'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
               <Text style={[styles.statusBadgeText, { color: '#22C55E' }]}>Validé</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: 14, borderBottomWidth: 1,
  },
  headerSub: { fontWeight: '900', fontSize: 10, letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontWeight: '900', fontSize: 24, letterSpacing: -0.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: 100 },

  walletCard: { borderRadius: Radius.xl, padding: Spacing.lg },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  walletLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '900', fontSize: 10, letterSpacing: 2 },
  walletValue: { color: '#fff', fontWeight: '900', fontSize: 32, fontStyle: 'italic', marginTop: 4 },
  walletCurrency: { fontSize: 14, fontWeight: '700', fontStyle: 'normal' },
  walletIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  walletBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, paddingVertical: 8 },
  walletBtnText: { color: '#fff', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },

  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, borderRadius: Radius.lg, padding: 12, borderWidth: 1, alignItems: 'center', gap: 6 },
  statIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontWeight: '900', fontSize: 18 },
  statLbl: { fontWeight: '900', fontSize: 9, letterSpacing: 1 },

  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontWeight: '900', fontSize: 10, letterSpacing: 2, paddingLeft: 4 },
  linkText: { fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },

  chartCard: { borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, height: 160, justifyContent: 'flex-end' },
  chartBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, paddingHorizontal: 10 },
  chartBarCol: { alignItems: 'center', gap: 8, flex: 1 },
  chartBarBg: { width: 12, height: 90, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarFill: { width: '100%', borderRadius: 6 },
  chartDay: { fontWeight: '900', fontSize: 10 },

  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: Spacing.md, borderRadius: Radius.xl, borderWidth: 1 },
  vehicleIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  vehicleModel: { fontWeight: '900', fontSize: 15 },
  vehiclePlate: { fontWeight: '700', fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusBadgeText: { fontWeight: '900', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
});
