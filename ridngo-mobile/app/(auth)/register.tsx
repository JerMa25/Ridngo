import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { authService } from '../../src/services/auth';
import { DarkColors, Spacing, Radius } from '../../src/types/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { tr } from '../../src/i18n';

export default function RegisterScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { role } = useLocalSearchParams<{ role: string }>();
  const isDriver = role === 'driver';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photo, setPhoto] = useState<any>(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<{ captchaToken: string; prompt: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  // Défi anti-robot Kernel, à usage unique : rechargé après chaque tentative
  const loadCaptcha = useCallback(async () => {
    setCaptchaAnswer(''); setCaptchaError(false);
    try { setCaptcha(await authService.getCaptcha()); } catch { setCaptcha(null); setCaptchaError(true); }
  }, []);
  useEffect(() => { loadCaptcha(); }, [loadCaptcha]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const handleRegister = async () => {
    if (!username || !email || !password || !firstName || !lastName || !phone) {
      Alert.alert(tr("Champs requis"), tr("Veuillez remplir tous les champs obligatoires."));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert(tr("Email invalide"), tr("Saisissez une adresse email valide (ex. nom@exemple.com)."));
      return;
    }
    if (!/^\+?\d{8,15}$/.test(phone.replace(/\s/g, ''))) {
      Alert.alert(tr("Téléphone invalide"), tr("Saisissez un numéro valide (ex. 6XXXXXXXX)."));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(tr("Erreur"), tr("Les mots de passe ne correspondent pas."));
      return;
    }
    if (password.length < 8) {
      Alert.alert(tr("Erreur"), tr("Le mot de passe doit faire au moins 8 caractères."));
      return;
    }
    if (!captcha) {
      Alert.alert(tr("Vérification indisponible"), tr("La question anti-robot n'a pas pu être chargée (serveur Yowyob lent). Touchez ↻ pour réessayer."));
      return;
    }
    if (!captchaAnswer.trim()) {
      Alert.alert(tr("Vérification"), tr("Répondez à la question anti-robot."));
      return;
    }
    setLoading(true);
    try {
      const result = await authService.register({
        username, email, password, phone, firstName, lastName,
        role: isDriver ? 'RIDE_AND_GO_DRIVER' : 'RIDE_AND_GO_PASSENGER',
        photo, captchaToken: captcha.captchaToken, captchaAnswer: captchaAnswer.trim(),
      });
      if (result.verifyEmail) {
        Alert.alert(tr("Compte créé"), tr("Confirmez votre adresse via le lien reçu par email, puis connectez-vous."));
        router.replace('/(auth)/login');
      } else if (result.success) {
        if (isDriver) router.replace('/(driver)/onboarding');
        else router.replace('/(passenger)/ride');
      } else {
        Alert.alert(tr("Erreur inscription"), result.message || tr("Erreur lors de l'inscription."));
      }
    } catch (e: any) {
      Alert.alert(tr("Erreur"), e?.message || tr("Une erreur inattendue s'est produite."));
    } finally {
      setLoading(false);
      loadCaptcha();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.badge, isDriver && styles.badgeDriver]}>
              <Ionicons name={isDriver ? 'car-sport' : 'person'} size={14} color={Colors.white} />
              <Text style={[styles.badgeText, isDriver && { color: '#FFFFFF' }]}>
                {isDriver ? 'CHAUFFEUR' : 'PASSAGER'}
              </Text>
            </View>
            <Text style={styles.title}>{tr("Créer un compte")}</Text>
            <Text style={styles.subtitle}>
              {isDriver ? tr("Rejoignez le réseau de chauffeurs RidnGo") : tr("Réservez vos courses facilement")}
            </Text>
          </View>

          {/* Photo picker */}
          <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={28} color={Colors.textMuted} />
                <Text style={styles.photoText}>{tr("Photo (optionnel)")}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Fields */}
          <View style={styles.form}>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{tr("Prénom *")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={tr("Jean")}
                  placeholderTextColor={Colors.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCorrect={false}
                  blurOnSubmit={false}
                  returnKeyType="next"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{tr("Nom *")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={tr("Dupont")}
                  placeholderTextColor={Colors.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCorrect={false}
                  blurOnSubmit={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View>
              <Text style={styles.label}>{tr("Pseudo *")}</Text>
              <TextInput
                style={styles.input}
                placeholder="jean.dupont"
                placeholderTextColor={Colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="next"
              />
            </View>

            <View>
              <Text style={styles.label}>{tr("Email *")}</Text>
              <TextInput
                style={styles.input}
                placeholder="jean@email.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="next"
              />
            </View>

            <View>
              <Text style={styles.label}>{tr("Téléphone *")}</Text>
              <TextInput
                style={styles.input}
                placeholder={tr("+237 6XX XXX XXX")}
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                blurOnSubmit={false}
                returnKeyType="next"
              />
            </View>

            <View>
              <Text style={styles.label}>{tr("Mot de passe *")}</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  placeholder={tr("Min. 8 caractères")}
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCorrect={false}
                  blurOnSubmit={false}
                  returnKeyType="next"
                />
                <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text style={styles.label}>{tr("Confirmer *")}</Text>
              <TextInput
                style={styles.input}
                placeholder={tr("Répétez le mot de passe")}
                placeholderTextColor={Colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPass}
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.label}>{tr("Anti-robot : ")}{captcha ? `${captcha.prompt} ?` : captchaError ? tr("indisponible, touchez ↻") : tr("chargement…")}</Text>
                <TouchableOpacity onPress={loadCaptcha} accessibilityLabel={tr("Nouvelle question")}>
                  <Ionicons name="refresh" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder={tr("Réponse")}
                placeholderTextColor={Colors.textMuted}
                value={captchaAnswer}
                onChangeText={setCaptchaAnswer}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                accessibilityLabel={tr("Réponse anti-robot")}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.btnText}>{tr("Créer mon compte")}</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{tr("Déjà un compte ? ")}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>{tr("Se connecter")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: typeof DarkColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  back: { marginBottom: Spacing.md },
  header: { marginBottom: Spacing.lg, gap: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: Colors.input, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full,
  },
  badgeDriver: { backgroundColor: Colors.orange },
  badgeText: { color: Colors.white, fontWeight: '900', fontSize: 10, letterSpacing: 2 },
  title: { color: Colors.white, fontWeight: '900', fontSize: 28, letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: 14 },
  photoPicker: { alignSelf: 'center', marginBottom: Spacing.lg },
  photoPreview: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: Colors.orange },
  photoPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.input,
    borderWidth: 2, borderColor: Colors.inputBorder, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  photoText: { color: Colors.textMuted, fontSize: 9, fontWeight: '700' },
  form: { gap: Spacing.md, marginBottom: Spacing.lg },
  row2: { flexDirection: 'row', gap: Spacing.sm },
  label: { color: Colors.textMuted, fontWeight: '900', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.input, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.inputBorder, paddingHorizontal: Spacing.md,
  },
  input: {
    backgroundColor: Colors.input, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.inputBorder,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    color: Colors.white, fontWeight: '700', fontSize: 14,
  },
  eyeBtn: { padding: 8 },
  btnPrimary: {
    backgroundColor: Colors.orange, borderRadius: Radius.lg, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: Colors.orange, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
    marginBottom: Spacing.lg,
  },
  btnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: Colors.textSecondary, fontSize: 14 },
  footerLink: { color: Colors.orange, fontWeight: '900', fontSize: 14 },
});