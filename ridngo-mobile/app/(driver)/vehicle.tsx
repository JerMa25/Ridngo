import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import api from '../../src/services/api';
import { Spacing, Radius } from '../../src/types/theme';

export default function VehicleScreen() {
  const { Colors } = useTheme();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    licensePlate: '',
    color: '',
    places: '4',
    hasAC: false,
    hasWifi: false,
    hasBluetooth: false,
    isSmokingAllowed: false,
  });

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      const res = await api.get('/api/v1/vehicles/me');
      setVehicle(res.data);
      if (res.data) {
        setEditForm({
          licensePlate: res.data.licensePlate || '',
          color: res.data.color || '',
          places: res.data.places?.toString() || '4',
          hasAC: res.data.comfortOptions?.hasAC || false,
          hasWifi: res.data.comfortOptions?.hasWifi || false,
          hasBluetooth: res.data.comfortOptions?.hasBluetooth || false,
          isSmokingAllowed: res.data.comfortOptions?.isSmokingAllowed || false,
        });
      }
    } catch (err) {
      console.log("No vehicle found or error fetching");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!vehicle?.id) return;
    try {
      setLoading(true);
      await api.patch(`/api/v1/vehicles/${vehicle.id}`, {
        licensePlate: editForm.licensePlate,
        color: editForm.color,
        places: parseInt(editForm.places) || 4,
        comfortOptions: {
          hasAC: editForm.hasAC,
          hasWifi: editForm.hasWifi,
          hasBluetooth: editForm.hasBluetooth,
          isSmokingAllowed: editForm.isSmokingAllowed,
        }
      });
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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: Colors.text }]}>Mon Véhicule</Text>
        {vehicle && (
          <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
            <Text style={[styles.headerAction, { color: Colors.primary }]}>
              {isEditing ? "Enregistrer" : "Modifier"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!vehicle ? (
          <View style={styles.empty}>
            <Ionicons name="car-sport-outline" size={64} color={Colors.textSecondary} />
            <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>
              Aucun véhicule enregistré.
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: Colors.text }]}>Informations générales</Text>
              
              <View style={styles.field}>
                <Text style={[styles.label, { color: Colors.textSecondary }]}>Plaque d'immatriculation</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: Colors.text, borderColor: Colors.border }]}
                    value={editForm.licensePlate}
                    onChangeText={(t) => setEditForm(prev => ({ ...prev, licensePlate: t }))}
                  />
                ) : (
                  <Text style={[styles.value, { color: Colors.text }]}>{vehicle.licensePlate}</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: Colors.textSecondary }]}>Couleur</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: Colors.text, borderColor: Colors.border }]}
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
                    style={[styles.input, { color: Colors.text, borderColor: Colors.border }]}
                    value={editForm.places}
                    keyboardType="numeric"
                    onChangeText={(t) => setEditForm(prev => ({ ...prev, places: t }))}
                  />
                ) : (
                  <Text style={[styles.value, { color: Colors.text }]}>{vehicle.places}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: Colors.text }]}>Options de confort</Text>
              
              <TouchableOpacity
                style={styles.optionRow}
                disabled={!isEditing}
                onPress={() => setEditForm(prev => ({ ...prev, hasAC: !prev.hasAC }))}
              >
                <View style={styles.optionLeft}>
                  <Ionicons name="snow-outline" size={20} color={Colors.text} />
                  <Text style={[styles.optionText, { color: Colors.text }]}>Climatisation</Text>
                </View>
                <Ionicons
                  name={editForm.hasAC ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={editForm.hasAC ? Colors.primary : Colors.border}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                disabled={!isEditing}
                onPress={() => setEditForm(prev => ({ ...prev, hasWifi: !prev.hasWifi }))}
              >
                <View style={styles.optionLeft}>
                  <Ionicons name="wifi-outline" size={20} color={Colors.text} />
                  <Text style={[styles.optionText, { color: Colors.text }]}>Wi-Fi à bord</Text>
                </View>
                <Ionicons
                  name={editForm.hasWifi ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={editForm.hasWifi ? Colors.primary : Colors.border}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                disabled={!isEditing}
                onPress={() => setEditForm(prev => ({ ...prev, hasBluetooth: !prev.hasBluetooth }))}
              >
                <View style={styles.optionLeft}>
                  <Ionicons name="bluetooth-outline" size={20} color={Colors.text} />
                  <Text style={[styles.optionText, { color: Colors.text }]}>Bluetooth audio</Text>
                </View>
                <Ionicons
                  name={editForm.hasBluetooth ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={editForm.hasBluetooth ? Colors.primary : Colors.border}
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionRow}
                disabled={!isEditing}
                onPress={() => setEditForm(prev => ({ ...prev, isSmokingAllowed: !prev.isSmokingAllowed }))}
              >
                <View style={styles.optionLeft}>
                  <Ionicons name="flame-outline" size={20} color={Colors.text} />
                  <Text style={[styles.optionText, { color: Colors.text }]}>Fumeur accepté</Text>
                </View>
                <Ionicons
                  name={editForm.isSmokingAllowed ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={editForm.isSmokingAllowed ? Colors.primary : Colors.border}
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
    padding: Spacing.m,
  },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerAction: { fontSize: 16, fontWeight: '600' },
  content: { padding: Spacing.m, gap: Spacing.m },
  card: {
    borderRadius: Radius.m,
    borderWidth: 1,
    padding: Spacing.m,
  },
  section: { gap: Spacing.m },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: Spacing.s },
  field: { gap: Spacing.xs },
  label: { fontSize: 14 },
  value: { fontSize: 16, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: Radius.s,
    padding: Spacing.s,
    fontSize: 16,
  },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: Spacing.m },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.s,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s },
  optionText: { fontSize: 16 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xl * 2,
    gap: Spacing.m,
  },
  emptyText: { fontSize: 16 },
});
