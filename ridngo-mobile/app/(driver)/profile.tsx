import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, TextInput, Switch, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { driverService, userService } from '../../src/services/userService';
import { Spacing, Radius } from '../../src/types/theme';

export default function DriverProfileScreen() {
  const { user, logout } = useAuth();
  const { Colors, isDark, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [showPassForm, setShowPassForm] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  
  const [passData, setPassData] = useState({ current: '', next: '', confirm: '' });
  const [editData, setEditData] = useState({ firstName: '', lastName: '', phone: '' });
  const [newPhoto, setNewPhoto] = useState<any>(null);
  
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const data = await driverService.getDriverProfile();
      setProfile(data);
      const uData = data.user || data;
      setEditData({
        firstName: uData.firstName || '',
        lastName: uData.lastName || '',
        phone: uData.telephone || '',
      });
      
      const notifs = await userService.getNotifications(0, 20);
      const content = Array.isArray(notifs) ? notifs : (notifs.content || []);
      setNotifCount(content.filter((n: any) => !n.isRead).length);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler' },
      { text: 'Déconnexion', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } }
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
      Alert.alert('Erreur', e.response?.data?.message || 'Impossible de changer le mot de passe.');
    } finally { setChangingPass(false); }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.75,
    });
    if (!result.canceled) setNewPhoto(result.assets[0]);
  };

  const handleSaveInfo = async () => {
    setSavingInfo(true);
    try {
      await userService.updateProfileWithPhoto(editData, newPhoto);
      await loadProfile();
      setNewPhoto(null);
      setShowInfoForm(false);
      Alert.alert('✅', 'Informations mises à jour avec succès');
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de mettre à jour le profil.');
    } finally { setSavingInfo(false); }
  };

  const vehicle = profile?.vehicle;
  const driver = profile?.driver;
  const uData = profile?.user || profile;

  const displayName = uData
    ? `${uData.firstName || ''} ${uData.lastName || ''}`.trim() || uData.username
    : user?.name || '—';
  const displayEmail = uData?.email || user?.email || '—';
  const displayPhone = uData?.telephone || user?.phone || '—';
  const avatarInitial = displayName?.[0]?.toUpperCase() || '?';
  const photoUrl = newPhoto?.uri || uData?.profilePhotoUrl || null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              </View>
            )}
            <View style={[styles.cameraOverlay, { backgroundColor: Colors.orange }]}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.name, { color: Colors.text }]}>{displayName}</Text>
          <Text style={[styles.email, { color: Colors.textSecondary }]}>{displayEmail}</Text>
          {displayPhone !== '—' && (
            <Text style={[styles.phone, { color: Colors.textMuted }]}>{displayPhone}</Text>
          )}
          <View style={[styles.driverBadge, { backgroundColor: Colors.orangeBg }]}>
            <Ionicons name="car-sport" size={12} color={Colors.orange} />
            <Text style={[styles.driverBadgeText, { color: Colors.orange }]}>CHAUFFEUR CERTIFIÉ</Text>
          </View>
          {driver?.isOnline !== undefined && (
            <View style={[styles.onlineBadge, driver.isOnline ? styles.onlineBadgeGreen : { backgroundColor: Colors.input }]}>
              <View style={[styles.onlineDot, driver.isOnline && styles.onlineDotGreen, !driver.isOnline && { backgroundColor: Colors.textMuted }]} />
              <Text style={[styles.onlineText, driver.isOnline ? { color: '#10B981' } : { color: Colors.textMuted }]}>
                {driver.isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
              </Text>
            </View>
          )}
        </View>

        {/* Mes informations */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>MES INFORMATIONS</Text>
          <View style={[styles.menuGroup, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: showInfoForm ? Colors.cardBorder : 'transparent' }]}
              onPress={() => setShowInfoForm(!showInfoForm)}
            >
              <View style={[styles.menuIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name="create" size={18} color={Colors.orange} />
              </View>
              <Text style={[styles.menuLabel, { color: Colors.text }]}>Modifier mes informations</Text>
              <Ionicons name={showInfoForm ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            {showInfoForm && (
              <View style={[styles.infoForm, { borderTopColor: Colors.cardBorder }]}>
                <TouchableOpacity style={[styles.photoPicker, { backgroundColor: Colors.input }]} onPress={pickPhoto}>
                  {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
                  ) : (
                    <Ionicons name="camera-outline" size={20} color={Colors.textMuted} />
                  )}
                  <Text style={[styles.photoPickerText, { color: Colors.orange }]}>
                    {newPhoto ? 'Photo sélectionnée ✓' : 'Changer la photo de profil'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </TouchableOpacity>

                {[
                  { label: 'Prénom', val: editData.firstName, key: 'firstName', placeholder: 'Votre prénom' },
                  { label: 'Nom', val: editData.lastName, key: 'lastName', placeholder: 'Votre nom' },
                  { label: 'Téléphone', val: editData.phone, key: 'phone', placeholder: '+237 6XX XXX XXX', keyboard: 'phone-pad' as const },
                ].map((f) => (
                  <View key={f.key}>
                    <Text style={[styles.inputLabel, { color: Colors.textMuted }]}>{f.label.toUpperCase()}</Text>
                    <TextInput
                      style={[styles.infoInput, { backgroundColor: Colors.input, color: Colors.text, borderColor: Colors.inputBorder }]}
                      placeholder={f.placeholder}
                      placeholderTextColor={Colors.textMuted}
                      value={f.val}
                      onChangeText={(v) => setEditData(prev => ({ ...prev, [f.key]: v }))}
                      keyboardType={f.keyboard || 'default'}
                      autoCorrect={false}
                    />
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.saveBtn, savingInfo && { opacity: 0.6 }]}
                  onPress={handleSaveInfo}
                  disabled={savingInfo}
                >
                  {savingInfo ? <ActivityIndicator color="#0D0D0D" size="small" /> : (
                    <Text style={styles.saveBtnText}>Sauvegarder</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Vehicle info */}
        {vehicle && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>MON VÉHICULE & DOCUMENTS</Text>
            <View style={[styles.vehicleCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
              <View style={[styles.vehicleIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name="car" size={24} color={Colors.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.vehicleName, { color: Colors.text }]}>
                  {vehicle.makeName || vehicle.vehicleMakeName} {vehicle.modelName || vehicle.vehicleModelName}
                </Text>
                <Text style={[styles.vehiclePlate, { color: Colors.textMuted }]}>
                  {vehicle.registrationNumber || 'Plaque non définie'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(driver)/vehicle')}>
                <Text style={{ color: Colors.orange, fontWeight: '700' }}>Voir</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.vehicleDetails}>
              {[
                { icon: 'people', label: 'Sièges', val: vehicle.totalSeatNumber },
                { icon: 'card', label: 'Permis', val: profile?.drivingLicenseNumber || 'Validé' },
              ].map((item, i) => item.val && (
                <View key={i} style={[styles.detailChip, { backgroundColor: Colors.input }]}>
                  <Ionicons name={item.icon as any} size={14} color={Colors.orange} />
                  <Text style={[styles.detailText, { color: Colors.textSecondary }]}>{item.label}: {item.val}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Apparence */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>APPARENCE</Text>
          <View style={[styles.menuGroup, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
            <View style={[styles.menuItem, { borderBottomColor: 'transparent' }]}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={Colors.orange} />
              </View>
              <Text style={[styles.menuLabel, { color: Colors.text }]}>
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

        {/* Menu Compte */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>COMPTE & SUPPORT</Text>
          <View style={[styles.menuGroup, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
            
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: Colors.cardBorder }]}
              onPress={() => setShowPassForm(!showPassForm)}
            >
              <View style={[styles.menuIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name="key" size={18} color={Colors.orange} />
              </View>
              <Text style={[styles.menuLabel, { color: Colors.text }]}>Changer le mot de passe</Text>
              <Ionicons name={showPassForm ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            {showPassForm && (
              <View style={[styles.passForm, { borderTopColor: Colors.cardBorder }]}>
                {([
                  { key: 'current', label: 'Mot de passe actuel' },
                  { key: 'next', label: 'Nouveau mot de passe' },
                  { key: 'confirm', label: 'Confirmer' },
                ] as const).map(f => (
                  <TextInput
                    key={f.key}
                    style={[styles.passInput, { backgroundColor: Colors.input, color: Colors.text, borderColor: Colors.inputBorder }]}
                    placeholder={f.label}
                    placeholderTextColor={Colors.textMuted}
                    value={passData[f.key]}
                    onChangeText={v => setPassData(p => ({ ...p, [f.key]: v }))}
                    secureTextEntry
                    autoCorrect={false}
                  />
                ))}
                <TouchableOpacity
                  style={[styles.passBtn, changingPass && { opacity: 0.6 }]}
                  onPress={handleChangePassword}
                  disabled={changingPass}
                >
                  {changingPass ? <ActivityIndicator color="#0D0D0D" size="small" /> : (
                    <Text style={styles.passBtnText}>Mettre à jour</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: Colors.cardBorder }]}
              onPress={() => router.push('/(driver)/notifications')}
            >
              <View style={[styles.menuIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name="notifications" size={18} color={Colors.orange} />
              </View>
              <Text style={[styles.menuLabel, { color: Colors.text }]}>Notifications</Text>
              {notifCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{notifCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: Colors.cardBorder }]}
              onPress={() => router.push('/(driver)/support')}
            >
              <View style={[styles.menuIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name="help-circle" size={18} color={Colors.orange} />
              </View>
              <Text style={[styles.menuLabel, { color: Colors.text }]}>Aide & Support</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: 'transparent' }]} onPress={handleLogout}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.redBg }]}>
                <Ionicons name="log-out" size={18} color={Colors.red} />
              </View>
              <Text style={[styles.menuLabel, { color: Colors.red }]}>Déconnexion</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.version, { color: Colors.textMuted }]}>RidnGo v1.0.0 — Yowyob Inc. Ltd.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 100 },
  heroCard: {
    borderRadius: Radius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: 8, borderWidth: 1,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#FF8C00',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF8C00', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, elevation: 8,
  },
  avatarText: { color: 'white', fontWeight: '900', fontSize: 32 },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0D0D0D',
  },
  name: { fontWeight: '900', fontSize: 22, letterSpacing: -0.3 },
  email: { fontSize: 13, fontWeight: '500' },
  phone: { fontSize: 13, fontWeight: '500' },
  driverBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  driverBadgeText: { fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  onlineBadgeGreen: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineDotGreen: { backgroundColor: '#10B981' },
  onlineText: { fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  section: { gap: 8 },
  sectionLabel: { fontWeight: '900', fontSize: 10, letterSpacing: 3, paddingLeft: 4 },
  
  // Info Form
  infoForm: { padding: Spacing.md, gap: Spacing.sm, borderTopWidth: 1 },
  photoPicker: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md, borderRadius: Radius.md },
  photoPreview: { width: 40, height: 40, borderRadius: 20 },
  photoPickerText: { flex: 1, fontWeight: '700', fontSize: 13 },
  inputLabel: { fontWeight: '900', fontSize: 9, letterSpacing: 2, marginBottom: 6 },
  infoInput: { borderRadius: Radius.md, padding: 14, fontWeight: '700', fontSize: 14, borderWidth: 1 },
  saveBtn: { backgroundColor: '#FF8C00', borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#0D0D0D', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  
  vehicleCard: { borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  vehicleIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontWeight: '900', fontSize: 15 },
  vehiclePlate: { fontWeight: '700', fontSize: 13 },
  vehicleDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full },
  detailText: { fontSize: 12, fontWeight: '600' },
  
  menuGroup: { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: Spacing.md, borderBottomWidth: 1 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontWeight: '700', fontSize: 14 },
  badge: { backgroundColor: '#FF8C00', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: 'white', fontWeight: '900', fontSize: 10 },
  
  passForm: { padding: Spacing.md, gap: Spacing.sm, borderTopWidth: 1 },
  passInput: { borderRadius: Radius.md, padding: 14, fontWeight: '700', fontSize: 14, borderWidth: 1 },
  passBtn: { backgroundColor: '#FF8C00', borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  passBtnText: { color: '#0D0D0D', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  version: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
});
