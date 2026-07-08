import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { rideService } from '../../src/services/rideService';
import { userService } from '../../src/services/userService';
import { Spacing, Radius } from '../../src/types/theme';

export default function DriverHistoryScreen() {
  const { Colors } = useTheme();
  const [rides, setRides] = useState<any[]>([]);
  const [reviewsMap, setReviewsMap] = useState<Map<string, any>>(new Map());
  const [passengersMap, setPassengersMap] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [historyRes, reviewsRes] = await Promise.allSettled([
        rideService.getEnrichedHistory(),
        rideService.getMyReviews(),
      ]);

      let historyData = historyRes.status === 'fulfilled' ? historyRes.value : [];
      let reviewsData = reviewsRes.status === 'fulfilled' ? reviewsRes.value : [];

      setRides(historyData);
      
      const rMap = new Map<string, any>();
      reviewsData.forEach((rev: any) => { if (rev.rideId) rMap.set(rev.rideId, rev); });
      setReviewsMap(rMap);

      // Fetch passenger details
      const pMap = new Map<string, any>();
      await Promise.all(
        historyData.map(async (ride: any) => {
          if (ride.passengerId && !pMap.has(ride.passengerId)) {
            try {
              const p = await userService.getUserById(ride.passengerId);
              pMap.set(ride.passengerId, p);
            } catch { /* silent */ }
          }
        })
      );
      setPassengersMap(pMap);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons 
        key={i} 
        name="star" 
        size={12} 
        color={i < rating ? '#FF8C00' : 'rgba(255,255,255,0.1)'} 
      />
    ));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: Colors.cardBorder }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: Colors.input }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: Colors.text }]}>Historique</Text>
          <Text style={[styles.headerSub, { color: Colors.textMuted }]}>SUIVI DES ACTIVITÉS</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.orange} />}
      >
        {loading ? (
          <View style={styles.centered}>
             <ActivityIndicator color={Colors.orange} size="large" />
          </View>
        ) : rides.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: Colors.textMuted }]}>Aucun trajet trouvé.</Text>
          </View>
        ) : (
          rides.map((ride: any) => {
            const review = reviewsMap.get(ride.rideId);
            const passenger = passengersMap.get(ride.passengerId);
            const passName = passenger ? `${passenger.firstName || ''} ${passenger.lastName || ''}`.trim() : 'Passager';
            const passAvatar = passenger?.profilePhotoUrl;

            return (
              <View key={ride.rideId} style={[styles.card, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
                
                {/* Header Trajet */}
                <View style={styles.cardHeader}>
                  <View style={styles.passInfo}>
                    {passAvatar ? (
                      <Image source={{ uri: passAvatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: Colors.input }]}>
                        <Ionicons name="person" size={20} color={Colors.orange} />
                      </View>
                    )}
                    <View>
                      <Text style={[styles.passLabel, { color: Colors.textMuted }]}>PASSAGER</Text>
                      <Text style={[styles.passName, { color: Colors.text }]}>{passName}</Text>
                      <Text style={[styles.rideDate, { color: Colors.textMuted }]}>
                        {new Date(ride.createdAt).toLocaleDateString('fr-FR')} • ID #{ride.rideId?.slice(0,5)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.priceCol}>
                    <Text style={[styles.priceVal, { color: Colors.text }]}>{ride.price?.toLocaleString()} F</Text>
                    <Text style={[styles.priceLbl, { color: Colors.textMuted }]}>NET CHAUFFEUR</Text>
                    <View style={[styles.stateBadge, { backgroundColor: ride.state === 'COMPLETED' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }]}>
                      {ride.state === 'COMPLETED' && <Ionicons name="checkmark-circle" size={10} color="#22C55E" />}
                      <Text style={[styles.stateText, { color: ride.state === 'COMPLETED' ? '#22C55E' : '#EF4444' }]}>{ride.state}</Text>
                    </View>
                  </View>
                </View>

                {/* Itinéraire */}
                <View style={styles.routeBox}>
                  <Ionicons name="location" size={16} color={Colors.orange} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.routeStart, { color: Colors.text }]} numberOfLines={1}>{ride.startPoint}</Text>
                    <Text style={[styles.routeEnd, { color: Colors.textMuted }]} numberOfLines={1}>Vers : {ride.endPoint?.split(',')[0]}</Text>
                  </View>
                  {!!ride.numberOfPlaces && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textMuted }}>
                        {ride.numberOfPlaces}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Avis passager */}
                {review && (
                  <View style={[styles.reviewBox, { borderTopColor: Colors.cardBorder }]}>
                    <View style={styles.reviewHeader}>
                      {review.anonymous ? (
                         <View style={[styles.anonBadge, { backgroundColor: Colors.input }]}>
                            <Text style={[styles.anonText, { color: Colors.textMuted }]}>Anonyme</Text>
                         </View>
                      ) : (
                         <Text style={[styles.revPassName, { color: Colors.textMuted }]}>{review.passengerName}</Text>
                      )}
                      
                      <View style={[styles.starsBox, { backgroundColor: Colors.input }]}>
                        <View style={styles.starsRow}>{renderStars(review.rating)}</View>
                        <View style={[styles.starDiv, { backgroundColor: Colors.cardBorder }]} />
                        <Text style={[styles.starVal, { color: Colors.text }]}>{review.rating}<Text style={{ fontSize: 9, color: Colors.textMuted }}>/5</Text></Text>
                      </View>
                    </View>

                    {review.comment ? (
                      <View style={styles.commentRow}>
                        <Ionicons name="chatbubble-ellipses" size={14} color={Colors.orange} style={{ opacity: 0.5, marginTop: 2 }} />
                        <Text style={[styles.commentText, { color: Colors.textSecondary }]}>"{review.comment}"</Text>
                      </View>
                    ) : (
                      <View style={styles.commentRow}>
                        <Ionicons name="chatbubble-ellipses" size={14} color={Colors.textMuted} style={{ opacity: 0.3 }} />
                        <Text style={[styles.noCommentText, { color: Colors.textMuted }]}>Aucun commentaire</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontWeight: '900', fontSize: 20, letterSpacing: -0.3 },
  headerSub: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 1 },
  
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 60 },
  centered: { padding: 40, alignItems: 'center' },
  emptyCard: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontWeight: '900', fontStyle: 'italic', opacity: 0.5 },

  card: { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md },
  passInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  passLabel: { fontWeight: '900', fontSize: 9, letterSpacing: 1 },
  passName: { fontWeight: '900', fontSize: 15, textTransform: 'capitalize' },
  rideDate: { fontWeight: '700', fontSize: 9, marginTop: 2, textTransform: 'uppercase' },

  priceCol: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  priceVal: { fontWeight: '900', fontSize: 20, fontStyle: 'italic', letterSpacing: -0.5 },
  priceLbl: { fontWeight: '900', fontSize: 8, letterSpacing: 1 },
  stateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  stateText: { fontWeight: '900', fontSize: 9, letterSpacing: 0.5 },

  routeBox: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  routeStart: { fontWeight: '700', fontSize: 13 },
  routeEnd: { fontWeight: '700', fontSize: 10, marginTop: 2, textTransform: 'uppercase' },

  reviewBox: { borderTopWidth: 1, padding: Spacing.md, gap: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  anonBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  anonText: { fontWeight: '900', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  revPassName: { fontWeight: '900', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  
  starsBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md },
  starsRow: { flexDirection: 'row', gap: 2 },
  starDiv: { width: 1, height: 12 },
  starVal: { fontWeight: '900', fontSize: 14 },

  commentRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  commentText: { flex: 1, fontSize: 12, fontStyle: 'italic', fontWeight: '500', lineHeight: 18 },
  noCommentText: { flex: 1, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
});
