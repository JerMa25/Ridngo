import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const FEATURES: [string, string][] = [
  ['airConditioned', 'Climatisation'], ['comfortable', 'Confortable'], ['soft', 'Sièges moelleux'], ['screen', 'Écran'],
  ['wifi', 'Wi-Fi'], ['internet', 'Internet'], ['tollCharge', 'Péage inclus'], ['carParking', 'Parking'], ['alarm', 'Alarme'],
  ['pickupAndDrop', 'Prise en charge'], ['petsAllow', 'Animaux permis'],
];

/** Fiche détaillée d'un chauffeur avant de le choisir : véhicule, courses récentes, note, avis. */
export function DriverProfileSheet({ driverId, onClose, onChoose }: { driverId: string | null; onClose: () => void; onChoose: (id: string) => void }) {
  const { Colors } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    if (!driverId) return;
    setLoading(true); setPhotoFailed(false);
    Promise.all([
      api.get(`/api/v1/users/drivers/${driverId}`).then(r => r.data).catch(() => null),
      api.get(`/api/v1/reviews/driver/${driverId}`).then(r => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
      api.get(`/api/v1/trips/driver/${driverId}/public`).then(r => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
    ]).then(([p, rv, rd]) => { setProfile(p); setReviews(rv); setRides(rd); }).finally(() => setLoading(false));
  }, [driverId]);

  const user = profile?.user, vehicle = profile?.vehicle;
  const avg = reviews.length ? reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length : 0;
  const completed = rides.filter(r => r.state === 'COMPLETED').length;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'Chauffeur';
  const vehicleDetails = [vehicle?.registrationNumber, vehicle?.vehicleTypeId, vehicle?.totalSeatNumber ? `${vehicle.totalSeatNumber} places` : null, vehicle?.fuelTypeId, vehicle?.transmissionTypeId].filter(Boolean).join(' · ');
  const features = FEATURES.filter(([k]) => vehicle?.[k]);
  const section = (t: string) => <Text style={[st.section, { color: Colors.textMuted }]}>{t}</Text>;

  return (
    <Modal visible={!!driverId} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={[st.sheet, { backgroundColor: Colors.darkCard }]}>
          <TouchableOpacity style={st.close} onPress={onClose} accessibilityLabel="Fermer"><Ionicons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity>
          {loading || !profile ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              {loading ? <ActivityIndicator color={Colors.orange} /> : <Text style={{ color: Colors.textSecondary }}>Profil indisponible pour le moment.</Text>}
            </View>
          ) : (
            <ScrollView>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={[st.avatar, { backgroundColor: Colors.orange }]}>
                  {user?.photoUri && !photoFailed
                    ? <Image source={{ uri: user.photoUri }} style={st.avatarImg} onError={() => setPhotoFailed(true)} />
                    : <Text style={st.avatarTxt}>{name.charAt(0).toUpperCase()}</Text>}
                </View>
                <Text style={[st.name, { color: Colors.text }]}>{name}</Text>
                <Text style={{ color: Colors.orange, fontWeight: '900' }}>★ {reviews.length ? avg.toFixed(1) : '—'} <Text style={{ color: Colors.textSecondary, fontWeight: '700' }}>({reviews.length} avis)</Text></Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[['Courses', completed], ['Avis', reviews.length], ['Note', reviews.length ? avg.toFixed(1) : '—']].map(([k, v]) => (
                  <View key={k as string} style={[st.stat, { borderColor: Colors.darkBorder }]}>
                    <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '900' }}>{v}</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 9, fontWeight: '900' }}>{(k as string).toUpperCase()}</Text>
                  </View>
                ))}
              </View>

              {section('VÉHICULE')}
              <Text style={{ color: Colors.text, fontWeight: '900', fontSize: 15 }}>{[vehicle?.brand, vehicle?.vehicleModelId].filter(Boolean).join(' ') || '—'}</Text>
              {!!vehicleDetails && <Text style={{ color: Colors.textSecondary, marginTop: 2 }}>{vehicleDetails}</Text>}
              {features.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {features.map(([k, l]) => <Text key={k} style={[st.tag, { color: Colors.orange, backgroundColor: Colors.orangeBg }]}>{l}</Text>)}
                </View>
              )}

              {rides.length > 0 && <>
                {section('COURSES RÉCENTES')}
                {rides.slice(0, 5).map(r => (
                  <View key={r.id} style={[st.row, { borderColor: Colors.darkBorder }]}>
                    <Text style={{ color: Colors.text, fontWeight: '700' }}>{r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '—'}</Text>
                    <Text style={{ color: Colors.textSecondary }}>{r.distance ? `${Number(r.distance).toFixed(1)} km` : ''}</Text>
                    <Text style={{ fontWeight: '900', color: r.state === 'COMPLETED' ? Colors.green : r.state === 'CANCELLED' ? Colors.red : Colors.orange }}>
                      {r.state === 'COMPLETED' ? 'Terminée' : r.state === 'CANCELLED' ? 'Annulée' : 'En cours'}
                    </Text>
                  </View>
                ))}
              </>}

              {section('AVIS DES PASSAGERS')}
              {reviews.length === 0
                ? <Text style={{ color: Colors.textSecondary, fontStyle: 'italic' }}>Aucun avis pour le moment.</Text>
                : reviews.map(r => (
                  <View key={r.reviewId} style={[st.review, { borderColor: Colors.darkBorder }]}>
                    <Text style={{ color: Colors.text, fontWeight: '900' }}>{r.passengerName || 'Passager'} <Text style={{ color: Colors.orange }}>{'★'.repeat(r.rating || 0)}</Text></Text>
                    {!!r.comment && <Text style={{ color: Colors.textSecondary, marginTop: 2 }}>{r.comment}</Text>}
                  </View>
                ))}

              <TouchableOpacity style={[st.choose, { backgroundColor: Colors.orange }]} onPress={() => onChoose(driverId!)} accessibilityRole="button">
                <Text style={{ color: '#fff', fontWeight: '900', letterSpacing: 1 }}>CHOISIR CE CHAUFFEUR</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 36, maxHeight: '92%' },
  close: { position: 'absolute', right: 16, top: 12, zIndex: 2 },
  avatar: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8 },
  avatarImg: { width: '100%', height: '100%' },
  avatarTxt: { color: '#fff', fontSize: 28, fontWeight: '900' },
  name: { fontSize: 20, fontWeight: '900' },
  stat: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  section: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 16, marginBottom: 6 },
  tag: { fontSize: 11, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 6 },
  review: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 6 },
  choose: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
});
