/**
 * app/(driver)/vehicle.tsx
 * Page de gestion du véhicule du chauffeur.
 *
 * GET   /api/v1/vehicles/me
 * PATCH /api/v1/vehicles/{id}
 * POST  /api/v1/vehicles/{id}/images
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Switch,
  TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import api from '../../src/services/api';
import { Spacing, Radius } from '../../src/types/theme';

interface VehicleData {
  id: string;
  brand?: string;
  makeName?: string;
  modelName?: string;
  registrationNumber?: string;
  vehicleSerialNumber?: string;
  fuelTypeName?: string;
  transmissionType?: string;
  totalSeatNumber?: number;
  tankCapacity?: number;
  luggageMaxCapacity?: number;
  averageFuelConsumptionPerKm?: number;
  mileageSinceCommissioning?: number;
  vehicleAgeAtStart?: number;
  airConditioned?: boolean;
  wifi?: boolean;
  screen?: boolean;
  petsAllow?: boolean;
  tollCharge?: boolean;
  carParking?: boolean;
  alarm?: boolean;
  pickupAndDrop?: boolean;
  internet?: boolean;
  comfortable?: boolean;
  soft?: boolean;
  stateTax?: boolean;
  driverAllowance?: boolean;
}

// Chips d'options de confort
const COMFORT_OPTIONS = [
  { key: 'airConditioned', label: 'Climatisation',   icon: 'snow-outline' },
  { key: 'wifi',           label: 'WiFi Gratuit',    icon: 'wifi-outline' },
  { key: 'screen',         label: 'Écran / TV',      icon: 'tv-outline' },
  { key: 'petsAllow',      label: 'Animaux acceptés',icon: 'paw-outline' },
  { key: 'tollCharge',     label: 'Péage Inclus',    icon: 'flag-outline' },
  { key: 'carParking',     label: 'Parking',         icon: 'business-outline' },
  { key: 'alarm',          label: 'Alarme',          icon: 'shield-outline' },
  { key: 'pickupAndDrop',  label: 'Porte à Porte',   icon: 'navigate-outline' },
] as const;

export default function VehicleScreen() {
  const { Colors } = useTheme();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [editForm, setEditForm] = useState<Partial<VehicleData>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchVehicle(); }, []);

  const fetchVehicle = async () => {
    try {
      const res = await api.get('/api/v1/vehicles/me');
      setVehicle(res.data);
      setEditForm(res.data);
    } catch {
      setVehicle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!vehicle?.id) return;
    setSaving(true);
    try {
      // Payload strict selon le backend UpdateVehicleDto
      const payload = {
        makeName:                     editForm.makeName || '',
        modelName:                    editForm.modelName || '',
        brand:                        editForm.brand || '',
        registrationNumber:           editForm.registrationNumber || '',
        vehicleSerialNumber:          editForm.vehicleSerialNumber || '',
        fuelTypeName:                 editForm.fuelTypeName || '',
        transmissionType:             editForm.transmissionType || '',
        totalSeatNumber:              Number(editForm.totalSeatNumber || 0),
        tankCapacity:                 Number(editForm.tankCapacity || 0),
        luggageMaxCapacity:           Number(editForm.luggageMaxCapacity || 0),
        averageFuelConsumptionPerKm:  Number(editForm.averageFuelConsumptionPerKm || 0),
        mileageSinceCommissioning:    Number(editForm.mileageSinceCommissioning || 0),
        vehicleAgeAtStart:            Number(editForm.vehicleAgeAtStart || 0),
        airConditioned:   !!editForm.airConditioned,
        wifi:             !!editForm.wifi,
        screen:           !!editForm.screen,
        petsAllow:        !!editForm.petsAllow,
        tollCharge:       !!editForm.tollCharge,
        carParking:       !!editForm.carParking,
        alarm:            !!editForm.alarm,
        pickupAndDrop:    !!editForm.pickupAndDrop,
        internet:         !!editForm.internet,
        comfortable:      !!editForm.comfortable,
        soft:             !!editForm.soft,
        stateTax:         !!editForm.stateTax,
        driverAllowance:  !!editForm.driverAllowance,
      };

      await api.patch(`/api/v1/vehicles/${vehicle.id}`, payload);
      await fetchVehicle();
      setIsEditing(false);
      Alert.alert('✅', 'Véhicule mis à jour avec succès !');
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de mettre à jour le véhicule.');
    } finally { setSaving(false); }
  };

  const updateField = (key: keyof VehicleData, value: any) => {
    setEditForm(prev => ({ ...prev, [key]: value }));
  };

  const onRefresh = () => { setRefreshing(true); fetchVehicle(); };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.centered}>
          <ActivityIndicator color={Colors.orange} size="large" />
          <Text style={[s.loadingTxt, { color: Colors.textMuted }]}>Chargement du garage...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: Colors.cardBorder }]}>
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: Colors.input }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: Colors.text }]}>Mon Véhicule</Text>
          <Text style={[s.headerSub, { color: Colors.textMuted }]}>PARAMÈTRES & SERVICES</Text>
        </View>

        {vehicle && (
          isEditing ? (
            <View style={s.headerActions}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: Colors.green }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="checkmark" size={18} color="#fff" />
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: Colors.input }]}
                onPress={() => { setIsEditing(false); setEditForm(vehicle); }}
              >
                <Ionicons name="close" size={18} color={Colors.text} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.editBtn, { backgroundColor: Colors.orangeBg }]}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create-outline" size={16} color={Colors.orange} />
              <Text style={[s.editBtnTxt, { color: Colors.orange }]}>Modifier</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scroll, { paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.orange} />}
      >
        {!vehicle ? (
          /* ── Garage vide ── */
          <View style={s.emptyBlock}>
            <View style={[s.emptyIcon, { backgroundColor: Colors.input }]}>
              <Ionicons name="car-outline" size={48} color={Colors.textMuted} />
            </View>
            <Text style={[s.emptyTitle, { color: Colors.text }]}>Garage vide</Text>
            <Text style={[s.emptyHint, { color: Colors.textMuted }]}>
              Vous n'avez pas encore enregistré de véhicule.
            </Text>
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: Colors.orange }]}
              onPress={() => router.push('/(driver)/onboarding' as any)}
            >
              <Text style={s.primaryBtnTxt}>Enregistrer un véhicule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Hero véhicule ── */}
            <View style={[s.heroCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
              <View style={[s.heroIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name="car-sport-outline" size={36} color={Colors.orange} />
              </View>
              {isEditing ? (
                <TextInput
                  style={[s.heroInput, { color: Colors.text, borderColor: Colors.orange, backgroundColor: Colors.input }]}
                  value={editForm.brand || ''}
                  onChangeText={v => updateField('brand', v)}
                  placeholder="Marque / Modèle"
                  placeholderTextColor={Colors.textMuted}
                />
              ) : (
                <Text style={[s.heroName, { color: Colors.text }]}>
                  {vehicle.brand || vehicle.makeName || 'Mon Véhicule'}
                </Text>
              )}
              <View style={[s.plateBadge, { backgroundColor: Colors.input }]}>
                <Ionicons name="card-outline" size={14} color={Colors.textMuted} />
                <Text style={[s.plateText, { color: Colors.text }]}>
                  {vehicle.registrationNumber || 'Plaque non définie'}
                </Text>
              </View>
            </View>

            {/* ── Informations techniques ── */}
            <Text style={[s.sectionLabel, { color: Colors.textMuted }]}>INFORMATIONS TECHNIQUES</Text>
            <View style={[s.card, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
              {[
                { label: 'Marque', key: 'makeName' as const, icon: 'car-outline' },
                { label: 'Modèle', key: 'modelName' as const, icon: 'car-sport-outline' },
                { label: 'Immatriculation', key: 'registrationNumber' as const, icon: 'card-outline' },
                { label: 'N° de série (VIN)', key: 'vehicleSerialNumber' as const, icon: 'barcode-outline' },
                { label: 'Carburant', key: 'fuelTypeName' as const, icon: 'flash-outline' },
                { label: 'Transmission', key: 'transmissionType' as const, icon: 'settings-outline' },
              ].map((field, i, arr) => (
                <View
                  key={field.key}
                  style={[
                    s.fieldRow,
                    i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
                  ]}
                >
                  <View style={[s.fieldIcon, { backgroundColor: Colors.input }]}>
                    <Ionicons name={field.icon as any} size={16} color={Colors.orange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.fieldLabel, { color: Colors.textMuted }]}>{field.label}</Text>
                    {isEditing ? (
                      <TextInput
                        style={[s.fieldInput, { color: Colors.text, borderColor: Colors.orange }]}
                        value={String(editForm[field.key] || '')}
                        onChangeText={v => updateField(field.key, v)}
                        placeholder="—"
                        placeholderTextColor={Colors.textMuted}
                      />
                    ) : (
                      <Text style={[s.fieldValue, { color: Colors.text }]}>
                        {String(vehicle[field.key] || '—')}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* ── Capacités ── */}
            <Text style={[s.sectionLabel, { color: Colors.textMuted }]}>CAPACITÉS</Text>
            <View style={s.statsGrid}>
              {[
                { label: 'Places', key: 'totalSeatNumber' as const, icon: 'people-outline', unit: '' },
                { label: 'Réservoir', key: 'tankCapacity' as const, icon: 'water-outline', unit: ' L' },
                { label: 'Coffre', key: 'luggageMaxCapacity' as const, icon: 'briefcase-outline', unit: ' L' },
                { label: 'Kilométrage', key: 'mileageSinceCommissioning' as const, icon: 'speedometer-outline', unit: ' km' },
              ].map(stat => (
                <View
                  key={stat.key}
                  style={[s.statCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}
                >
                  <View style={[s.statIcon, { backgroundColor: Colors.input }]}>
                    <Ionicons name={stat.icon as any} size={18} color={Colors.orange} />
                  </View>
                  <Text style={[s.statLabel, { color: Colors.textMuted }]}>{stat.label}</Text>
                  {isEditing ? (
                    <TextInput
                      style={[s.statInput, { color: Colors.text, borderColor: Colors.orange }]}
                      value={String(editForm[stat.key] || '')}
                      onChangeText={v => updateField(stat.key, Number(v) || 0)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                    />
                  ) : (
                    <Text style={[s.statValue, { color: Colors.text }]}>
                      {vehicle[stat.key] ?? '—'}{stat.unit}
                    </Text>
                  )}
                </View>
              ))}
            </View>

            {/* ── Confort & Services ── */}
            <Text style={[s.sectionLabel, { color: Colors.textMuted }]}>CONFORT & SERVICES</Text>
            <View style={[s.card, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
              {COMFORT_OPTIONS.map((opt, i) => {
                const isActive = !!(isEditing ? editForm[opt.key] : vehicle[opt.key]);
                return (
                  <View
                    key={opt.key}
                    style={[
                      s.optionRow,
                      i < COMFORT_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
                    ]}
                  >
                    <View style={[s.optionIcon, { backgroundColor: isActive ? Colors.orangeBg : Colors.input }]}>
                      <Ionicons name={opt.icon as any} size={16} color={isActive ? Colors.orange : Colors.textMuted} />
                    </View>
                    <Text style={[s.optionLabel, { color: isActive ? Colors.text : Colors.textMuted }]}>
                      {opt.label}
                    </Text>
                    {isEditing ? (
                      <Switch
                        value={!!(editForm[opt.key])}
                        onValueChange={v => updateField(opt.key, v)}
                        thumbColor={editForm[opt.key] ? Colors.orange : Colors.textMuted}
                        trackColor={{ false: Colors.input, true: Colors.orangeBg }}
                      />
                    ) : (
                      isActive && <Ionicons name="checkmark-circle" size={18} color={Colors.orange} />
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { fontWeight: '700', fontSize: 13 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, gap: 10,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  headerSub: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  editBtnTxt: { fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },

  scroll: { padding: Spacing.md, gap: 12 },

  // Empty
  emptyBlock: { alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 60 },
  emptyIcon: { width: 90, height: 90, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '900' },
  emptyHint: { fontSize: 13, fontWeight: '500', textAlign: 'center', paddingHorizontal: 32 },
  primaryBtn: { borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  primaryBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },

  // Hero card
  heroCard: {
    borderRadius: Radius.xl, borderWidth: 1,
    padding: Spacing.lg, alignItems: 'center', gap: 10,
  },
  heroIcon: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  heroInput: {
    fontSize: 20, fontWeight: '900', textAlign: 'center',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, width: '100%',
  },
  plateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 7,
  },
  plateText: { fontWeight: '700', fontSize: 13, letterSpacing: 1 },

  // Section
  sectionLabel: {
    fontWeight: '900', fontSize: 10, letterSpacing: 3,
    marginTop: 8, paddingLeft: 2,
  },

  // Generic card
  card: { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },

  // Field row
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12, gap: 12,
  },
  fieldIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  fieldValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  fieldInput: {
    fontSize: 14, fontWeight: '700', marginTop: 2,
    borderBottomWidth: 1, paddingBottom: 2, paddingTop: 2,
  },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    width: '48%', borderRadius: Radius.lg, borderWidth: 1,
    padding: Spacing.md, gap: 6,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  statValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  statInput: {
    fontSize: 18, fontWeight: '900',
    borderBottomWidth: 1, paddingBottom: 2,
  },

  // Options
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 13, gap: 12,
  },
  optionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
});
