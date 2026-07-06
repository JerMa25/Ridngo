import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { rideService } from '../../src/services/rideService';
import { Spacing, Radius } from '../../src/types/theme';

export default function DriverPerformanceScreen() {
  const { Colors } = useTheme();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await rideService.getMyReviews();
      setReviews(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  const renderStars = (rating: number, size = 16) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons 
        key={i} 
        name="star" 
        size={size} 
        color={i < rating ? '#EAB308' : 'rgba(255,255,255,0.1)'} 
      />
    ));
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const totalReviews = reviews.length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: Colors.cardBorder }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: Colors.input }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: Colors.text }]}>Performance</Text>
          <Text style={[styles.headerSub, { color: Colors.textMuted }]}>AVIS & ÉVALUATIONS</Text>
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
        ) : (
          <>
            {/* Note Globale */}
            <View style={[styles.heroCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
              <View style={[styles.heroIcon, { backgroundColor: 'rgba(234,179,8,0.1)' }]}>
                <Ionicons name="star" size={32} color="#EAB308" />
              </View>
              <Text style={[styles.heroScore, { color: Colors.text }]}>{avgRating}</Text>
              <View style={styles.heroStars}>{renderStars(parseFloat(avgRating), 20)}</View>
              <Text style={[styles.heroTotal, { color: Colors.textMuted }]}>Sur la base de {totalReviews} avis</Text>
            </View>

            {/* Liste des avis */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>DERNIERS AVIS</Text>
              {totalReviews === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
                  <Text style={[styles.emptyText, { color: Colors.textMuted }]}>Aucun avis pour le moment.</Text>
                </View>
              ) : (
                reviews.map((review: any) => (
                  <View key={review.reviewId} style={[styles.reviewCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
                    <View style={styles.reviewHeader}>
                      {review.anonymous ? (
                        <View style={[styles.anonBadge, { backgroundColor: Colors.input }]}>
                          <Text style={[styles.anonText, { color: Colors.textMuted }]}>Anonyme</Text>
                        </View>
                      ) : (
                        <View style={styles.passRow}>
                           <View style={[styles.avatar, { backgroundColor: Colors.orangeBg }]}>
                             <Ionicons name="person" size={14} color={Colors.orange} />
                           </View>
                           <Text style={[styles.passName, { color: Colors.text }]}>{review.passengerName}</Text>
                        </View>
                      )}
                      <Text style={[styles.date, { color: Colors.textMuted }]}>
                        {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>

                    <View style={styles.scoreRow}>
                      <View style={styles.starsRow}>{renderStars(review.rating, 16)}</View>
                      <Text style={[styles.scoreVal, { color: Colors.text }]}>{review.rating}/5</Text>
                    </View>

                    {review.comment && (
                      <View style={styles.commentBox}>
                        <Ionicons name="chatbubble-ellipses" size={16} color={Colors.textMuted} style={{ marginTop: 2, opacity: 0.5 }} />
                        <Text style={[styles.commentText, { color: Colors.textSecondary }]}>"{review.comment}"</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
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
  
  scroll: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: 60 },
  centered: { padding: 40, alignItems: 'center' },

  heroCard: { borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, gap: 8 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroScore: { fontWeight: '900', fontSize: 48, letterSpacing: -2, fontStyle: 'italic' },
  heroStars: { flexDirection: 'row', gap: 4, marginVertical: 4 },
  heroTotal: { fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },

  section: { gap: 10 },
  sectionLabel: { fontWeight: '900', fontSize: 10, letterSpacing: 2, paddingLeft: 4 },
  emptyCard: { padding: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontWeight: '700', fontSize: 13, fontStyle: 'italic' },

  reviewCard: { borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, gap: 12 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  passName: { fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  anonBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  anonText: { fontWeight: '900', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  date: { fontWeight: '700', fontSize: 10 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starsRow: { flexDirection: 'row', gap: 2 },
  scoreVal: { fontWeight: '900', fontSize: 12 },

  commentBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  commentText: { flex: 1, fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
});
