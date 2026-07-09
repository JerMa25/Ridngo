import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useNetwork } from '../../src/context/NetworkContext';
import api from '../../src/services/api';
import { withOfflineFallback, cacheClear, CacheKeys } from '../../src/services/offlineCache';
import { Spacing, Radius } from '../../src/types/theme';

export default function VehicleScreen() {
  const { Colors } = useTheme();
  const { isOnline } = useNetwork();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState(false);
  const [editForm, setEditForm] = useState({
    registrationNumber: '',
    color: '',
    totalSeatNumber: '4',
    airConditioned: false,
    wifi: false,
    screen: false,
    petsAllow: false,
  });

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      const { data, fromCache } = await withOfflineFallback(
        CacheKeys.driverVehicle,
        async () => (await api.get('/api/v1/vehicles/me')).data,
      );
      applyVehicle(data);
      if (fromCache) setOfflineNotice(true);
    } catch (err: any) {
      // Vraie absence de véhicule (404) → cache aussi ce "vide" pour ne pas laisser
      // un ancien véhicule fantôme s'afficher après suppression côté serveur.
      if (err?.response?.status === 404) {
        await cacheClear(CacheKeys.driverVehicle);
        setVehicle(null);
      } else {
        console.log("Erreur réseau lors du chargement du véhicule", err?.response?.data || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyVehicle = (data: any) => {
    setVehicle(data);
    if (data) {
      setEditForm({
        registrationNumber: data.registrationNumber || '',
        color: data.color || '',
        totalSeatNumber: data.totalSeatNumber?.toString() || '4',
        airConditioned: data.airConditioned || false,
        wifi: data.wifi || false,
        screen: data.screen || false,
        petsAllow: data.petsAllow || false,
      });
    }
  };

  const handleSave = async () => {
    if (!vehicle?.id) return;
    try {
      setLoading(true);
      const payload = {
        registrationNumber: editForm.registrationNumber,
        color: editForm.color,
        totalSeatNumber: parseInt(editForm.totalSeatNumber) || 4,
        airConditioned: editForm.airConditioned,
        wifi: editForm.wifi,
        screen: editForm.screen,
        petsAllow: editForm.petsAllow,
      };
      console.log('[Vehicle] Patching vehicle:', payload);
      await api.patch(`/api/v1/vehicles/${vehicle.id}`, payload);
      setIsEditing(false);
      await fetchVehicle();
      Alert.alert("Succès", "Informations du véhicule mises à jour.");
    } catch (err) {
      Alert.alert("Erreur", "Impossible de mettre à jour le véhicule.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !vehicle) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: Colors.text }]}>Mon Véhicule</Text>
        {vehicle && (
          <TouchableOpacity
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={!isOnline}
          >
            <Text style={[styles.headerAction, { color: !isOnline ? Colors.textSecondary : Colors.orange }]}>
              {!isOnline ? 'Hors ligne' : (isEditing ? "Enregistrer" : "Modifier")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {offlineNotice && vehicle && (
          <View style={[styles.offlineNoticeBox, { backgroundColor: Colors.input, borderColor: Colors.cardBorder }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={Colors.textSecondary} />
            <Text style={[styles.offlineNoticeTxt, { color: Colors.textSecondary }]}>
              Hors ligne — dernières infos connues affichées
            </Text>
          </View>
        )}

        {!vehicle && !isOnline ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={64} color={Colors.textSecondary} />
            <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>
              Impossible de vérifier votre véhicule hors ligne.
            </Text>
            <TouchableOpacity
              style={[styles.registerBtn, { backgroundColor: Colors.orange }]}
              onPress={fetchVehicle}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={18} color="#0D0D0D" />
              <Text style={styles.registerBtnTxt}>Réessayer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.backLinkBtn, { borderColor: Colors.cardBorder }]}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={16} color={Colors.text} />
              <Text style={[styles.backLinkTxt, { color: Colors.text }]}>Retour</Text>
            </TouchableOpacity>
          </View>
        ) : !vehicle ? (
          <View style={styles.empty}>
            <Ionicons name="car-sport-outline" size={64} color={Colors.textSecondary} />
            <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>
              Aucun véhicule enregistré.
            </Text>
            <TouchableOpacity
              style={[styles.registerBtn, { backgroundColor: Colors.orange }]}
              onPress={() => router.push('/(driver)/onboarding?mode=addVehicle' as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color="#0D0D0D" />
              <Text style={styles.registerBtnTxt}>Enregistrer mon véhicule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.backLinkBtn, { borderColor: Colors.cardBorder }]}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={16} color={Colors.text} />
              <Text style={[styles.backLinkTxt, { color: Colors.text }]}>Retour</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: Colors.text }]}>Informations générales</Text>
              
              <View style={styles.field}>
                <Text style={[styles.label, { color: Colors.textSecondary }]}>Plaque d'immatriculation</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: Colors.text, borderColor: Colors.cardBorder }]}
                    value={editForm.registrationNumber}
                    onChangeText={(t) => setEditForm(prev => ({ ...prev, registrationNumber: t }))}
                  />
                ) : (
                  <Text style={[styles.value, { color: Colors.text }]}>{vehicle.registrationNumber}</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: Colors.textSecondary }]}>Couleur</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: Colors.text, borderColor: Colors.cardBorder }]}
                    value={editForm.color}
                    onChangeText={(t) => setEditForm(prev => ({ ...prev, color: t }))}
                  />
                ) : (
                  <Text style={[styles.value, { color: Colors.text }]}>{vehicle.color}</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: Colors.textSecondary }]}>Nombre de places</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: Colors.text, borderColor: Colors.cardBorder }]}
                    value={editForm.totalSeatNumber}
                    keyboardType="numeric"
                    onChangeText={(t) => setEditForm(prev => ({ ...prev, totalSeatNumber: t }))}
                  />
                ) : (
                  <Text style={[styles.value, { color: Colors.text }]}>{vehicle.totalSeatNumber}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: Colors.text }]}>Options de confort</Text>
              
              <TouchableOpacity
                style={styles.optionRow}
                disabled={!isEditing}
                onPress={() => setEditForm(prev => ({ ...prev, airConditioned: !prev.airConditioned }))}
              >
                <View style={styles.optionLeft}>
                  <Ionicons name="snow-outline" size={20} color={Colors.text} />
                  <Text style={[styles.optionText, { color: Colors.text }]}>Climatisation</Text>
                </View>
                <Ionicons
                  name={editForm.airConditioned ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={editForm.airConditioned ? Colors.orange : Colors.cardBorder}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                disabled={!isEditing}
                onPress={() => setEditForm(prev => ({ ...prev, wifi: !prev.wifi }))}
              >
                <View style={styles.optionLeft}>
                  <Ionicons name="wifi-outline" size={20} color={Colors.text} />
                  <Text style={[styles.optionText, { color: Colors.text }]}>Wi-Fi à bord</Text>
                </View>
                <Ionicons
                  name={editForm.wifi ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={editForm.wifi ? Colors.orange : Colors.cardBorder}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                disabled={!isEditing}
                onPress={() => setEditForm(prev => ({ ...prev, screen: !prev.screen }))}
              >
                <View style={styles.optionLeft}>
                  <Ionicons name="tv-outline" size={20} color={Colors.text} />
                  <Text style={[styles.optionText, { color: Colors.text }]}>Écran</Text>
                </View>
                <Ionicons
                  name={editForm.screen ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={editForm.screen ? Colors.orange : Colors.cardBorder}
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionRow}
                disabled={!isEditing}
                onPress={() => setEditForm(prev => ({ ...prev, petsAllow: !prev.petsAllow }))}
              >
                <View style={styles.optionLeft}>
                  <Ionicons name="paw-outline" size={20} color={Colors.text} />
                  <Text style={[styles.optionText, { color: Colors.text }]}>Animaux acceptés</Text>
                </View>
                <Ionicons
                  name={editForm.petsAllow ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={editForm.petsAllow ? Colors.orange : Colors.cardBorder}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerAction: { fontSize: 16, fontWeight: '600' },
  content: { padding: Spacing.md, gap: Spacing.md },
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  section: { gap: Spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: Spacing.sm },
  field: { gap: Spacing.xs },
  label: { fontSize: 14 },
  value: { fontSize: 16, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: 16,
  },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: Spacing.md },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  optionText: { fontSize: 16 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyText: { fontSize: 16 },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: Radius.lg, paddingHorizontal: 24, paddingVertical: 14, marginTop: Spacing.sm,
  },
  registerBtnTxt: { color: '#0D0D0D', fontWeight: '900', fontSize: 14 },
  backLinkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: Radius.lg, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1,
  },
  backLinkTxt: { fontWeight: '700', fontSize: 14 },
  offlineNoticeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: Radius.md, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, marginBottom: Spacing.md,
  },
  offlineNoticeTxt: { fontSize: 12, fontWeight: '600' },
});
