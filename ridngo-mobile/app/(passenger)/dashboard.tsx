import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { rideService } from '../../src/services/rideService';
import { userService } from '../../src/services/userService';
import { Spacing, Radius } from '../../src/types/theme';
import { ThemeToggle } from '../../src/components/ThemeToggle';

const STATE_CONFIG: Record<string, { color: string; bgColor: string; label: string; icon: string }> = {
  COMPLETED: { color: '#22C55E', bgColor: 'rgba(34,197,94,0.1)', label: 'Terminée', icon: 'checkmark-circle' },
  CANCELLED: { color: '#EF4444', bgColor: 'rgba(239,68,68,0.1)', label: 'Annulée', icon: 'close-circle' },
  ONGOING: { color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)', label: 'En cours', icon: 'radio-button-on' },
  CREATED: { color: '#3B82F6', bgColor: 'rgba(59,130,246,0.1)', label: 'En attente', icon: 'time' },
};

export default function PassengerDashboard() {
  const { user } = useAuth();
  const { Colors } = useTheme();

  const [profileData, setProfileData] = useState<any>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [profileRes, historyRes, activeRes] = await Promise.allSettled([
        userService.getMe(),
        rideService.getEnrichedHistory().catch(() => rideService.getRideHistory()),
        rideService.getCurrentPassengerRide(),
      ]);
      if (profileRes.status === 'fulfilled') setProfileData(profileRes.value);
      if (historyRes.status === 'fulfilled') setRides(Array.isArray(historyRes.value) ? historyRes.value : []);
      if (activeRes.status === 'fulfilled' && activeRes.value) setActiveRide(activeRes.value);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const completedRides = rides.filter((r: any) => r.state === 'COMPLETED');
  const totalTrips = completedRides.length;
  const totalSpent = completedRides.reduce((sum: number, r: any) => sum + (r.price || 0), 0);

  const firstName = profileData?.firstName || user?.name?.split(' ')[0] || 'Voyageur';

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.orange} size="large" />
          <Text style={[styles.loadingText, { color: Colors.textMuted }]}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.orange} />}
      >

        {/* Header bienvenue */}
        <View style={styles.welcomeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.welcomeSub, { color: Colors.textMuted }]}>TABLEAU DE BORD</Text>
            <Text style={[styles.welcomeTitle, { color: Colors.text }]}>
              Bonjour, <Text style={{ color: Colors.orange }}>{firstName}</Text>
            </Text>
          </View>
          <ThemeToggle />
        </View>

        {/* Bannière course active */}
        {activeRide && (
          <TouchableOpacity
            style={[styles.activeBanner, { backgroundColor: Colors.orange }]}
            onPress={() => router.push('/(passenger)/ride')}
            activeOpacity={0.85}
          >
            <View style={styles.activeBannerLeft}>
              <View style={styles.activePulse} />
              <Text style={styles.activeBannerLabel}>
                Course {activeRide.state === 'ONGOING' ? 'en cours' : 'en attente'}
              </Text>
            </View>
            <View style={styles.activeBannerRight}>
              <Text style={styles.activeBannerAction}>Suivre</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
            <View style={[styles.statIcon, { backgroundColor: Colors.orange }]}>
              <Ionicons name="car" size={20} color="#fff" />
            </View>
            <Text style={[styles.statLabel, { color: Colors.textMuted }]}>TRAJETS</Text>
            <Text style={[styles.statValue, { color: Colors.text }]}>{totalTrips}</Text>
            <Text style={[styles.statSuffix, { color: Colors.textMuted }]}>courses</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="trending-up" size={20} color="#fff" />
            </View>
            <Text style={[styles.statLabel, { color: Colors.textMuted }]}>DÉPENSÉ</Text>
            <Text style={[styles.statValue, { color: Colors.text }]}>{totalSpent.toLocaleString()}</Text>
            <Text style={[styles.statSuffix, { color: Colors.textMuted }]}>FCFA</Text>
          </View>
        </View>

        {/* Bouton Commander */}
        <TouchableOpacity
          style={[styles.orderBtn, { backgroundColor: Colors.orange }]}
          onPress={() => router.push('/(passenger)/ride')}
          activeOpacity={0.85}
        >
          <Ionicons name="car" size={18} color="#0D0D0D" />
          <Text style={styles.orderBtnText}>Commander une course</Text>
          <Ionicons name="arrow-forward" size={16} color="#0D0D0D" />
        </TouchableOpacity>

        {/* Courses récentes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: Colors.text }]}>Commandes récentes</Text>
              <Text style={[styles.sectionSub, { color: Colors.textMuted }]}>VOS DERNIERS TRAJETS</Text>
            </View>
            {rides.length > 5 && (
              <TouchableOpacity onPress={() => router.push('/(passenger)/history')}>
                <Text style={[styles.seeAll, { color: Colors.orange }]}>Tout voir</Text>
              </TouchableOpacity>
            )}
          </View>

          {rides.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
              <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: Colors.text }]}>Aucune course pour le moment</Text>
              <Text style={[styles.emptyText, { color: Colors.textMuted }]}>
                Vos trajets apparaîtront ici après votre première course.
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: Colors.orangeBg }]}
                onPress={() => router.push('/(passenger)/ride')}
              >
                <Ionicons name="car-outline" size={14} color={Colors.orange} />
                <Text style={[styles.emptyBtnText, { color: Colors.orange }]}>Commander maintenant</Text>
              </TouchableOpacity>
            </View>
          ) : (
            rides.slice(0, 5).map((ride: any, idx: number) => {
              const stateConf = STATE_CONFIG[ride.state] || STATE_CONFIG['CREATED'];
              return (
                <View
                  key={ride.rideId || ride.id || idx}
                  style={[styles.rideCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}
                >
                  {/* Date + état */}
                  <View style={styles.rideCardHeader}>
                    <View style={styles.rideDateWrap}>
                      <View style={[styles.rideIconBox, { backgroundColor: Colors.orangeBg }]}>
                        <Ionicons name="car" size={16} color={Colors.orange} />
                      </View>
                      <View>
                        <Text style={[styles.rideDate, { color: Colors.textMuted }]}>
                          {ride.createdAt ? new Date(ride.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </Text>
                        <Text style={[styles.rideTime, { color: Colors.text }]}>
                          {ride.createdAt ? new Date(ride.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.stateBadge, { backgroundColor: stateConf.bgColor }]}>
                      <Ionicons name={stateConf.icon as any} size={11} color={stateConf.color} />
                      <Text style={[styles.stateText, { color: stateConf.color }]}>{stateConf.label}</Text>
                    </View>
                  </View>

                  {/* Itinéraire */}
                  <View style={styles.routeBlock}>
                    <View style={styles.routeRow}>
                      <View style={[styles.dotOrange, { backgroundColor: Colors.orange }]} />
                      <Text style={[styles.routeText, { color: Colors.textMuted }]} numberOfLines={1}>
                        {ride.startPoint || 'Point de départ'}
                      </Text>
                    </View>
                    <View style={[styles.routeVLine, { backgroundColor: Colors.cardBorder }]} />
                    <View style={styles.routeRow}>
                      <View style={[styles.dotBlue, { borderColor: Colors.text }]} />
                      <Text style={[styles.routeText, { color: Colors.text }]} numberOfLines={1}>
                        {ride.endPoint || 'Destination'}
                      </Text>
                    </View>
                  </View>

                  {/* Prix */}
                  <View style={[styles.priceRow, { borderTopColor: Colors.cardBorder }]}>
                    <Text style={[styles.priceVal, { color: Colors.orange }]}>
                      {ride.price?.toLocaleString() || '—'}
                      <Text style={[styles.priceCur, { color: Colors.textMuted }]}> FCFA</Text>
                    </Text>
                    {ride.distance > 0 && (
                      <View style={styles.distanceWrap}>
                        <Ionicons name="navigate-outline" size={12} color={Colors.textMuted} />
                        <Text style={[styles.distanceText, { color: Colors.textMuted }]}>
                          {ride.distance?.toFixed(1)} km
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontWeight: '700', fontSize: 13 },
  scroll: { padding: Spacing.md, gap: 16, paddingBottom: 100 },

  welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  welcomeSub: { fontWeight: '900', fontSize: 10, letterSpacing: 3, marginBottom: 4 },
  welcomeTitle: { fontWeight: '900', fontSize: 28, letterSpacing: -0.5 },

  activeBanner: {
    borderRadius: Radius.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  activeBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  activeBannerLabel: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.3 },
  activeBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeBannerAction: { color: '#fff', fontWeight: '900', fontSize: 12 },

  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, gap: 6,
  },
  statIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statLabel: { fontWeight: '900', fontSize: 9, letterSpacing: 2 },
  statValue: { fontWeight: '900', fontSize: 28, letterSpacing: -1 },
  statSuffix: { fontWeight: '700', fontSize: 11 },

  orderBtn: {
    borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#FF8C00', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, elevation: 8,
  },
  orderBtnText: { color: '#0D0D0D', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },

  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sectionTitle: { fontWeight: '900', fontSize: 20, letterSpacing: -0.3 },
  sectionSub: { fontWeight: '900', fontSize: 9, letterSpacing: 2, marginTop: 2 },
  seeAll: { fontWeight: '900', fontSize: 12, letterSpacing: 0.5, marginTop: 4 },

  emptyCard: {
    borderRadius: Radius.xl, padding: 40, borderWidth: 1,
    alignItems: 'center', gap: 12,
  },
  emptyTitle: { fontWeight: '900', fontSize: 16 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full, marginTop: 4,
  },
  emptyBtnText: { fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },

  rideCard: { borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, gap: 12 },
  rideCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rideDateWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rideIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rideDate: { fontSize: 10, fontWeight: '700' },
  rideTime: { fontSize: 13, fontWeight: '900', marginTop: 1 },
  stateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
  },
  stateText: { fontWeight: '900', fontSize: 9, letterSpacing: 0.5 },
  routeBlock: { gap: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dotOrange: { width: 10, height: 10, borderRadius: 5 },
  dotBlue: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, backgroundColor: 'transparent' },
  routeVLine: { width: 1, height: 10, marginLeft: 4 },
  routeText: { flex: 1, fontWeight: '700', fontSize: 13 },
  priceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, paddingTop: 10,
  },
  priceVal: { fontWeight: '900', fontSize: 20, fontStyle: 'italic' },
  priceCur: { fontSize: 12, fontWeight: '700', fontStyle: 'normal' },
  distanceWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distanceText: { fontWeight: '700', fontSize: 11 },
});
