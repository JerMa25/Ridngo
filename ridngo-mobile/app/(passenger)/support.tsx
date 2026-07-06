import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { Spacing, Radius } from '../../src/types/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_ITEMS = [
  {
    q: "Comment commander une course ?",
    a: "Depuis l'onglet 'Commander', saisissez votre lieu de départ et votre destination, estimez le prix puis publiez votre offre. Les chauffeurs disponibles vous contacteront.",
  },
  {
    q: "Comment annuler une course ?",
    a: "Pendant l'attente d'un chauffeur, appuyez sur 'Annuler la recherche' dans l'écran de course en cours.",
  },
  {
    q: "Comment noter mon chauffeur ?",
    a: "À la fin de chaque course, une fenêtre d'évaluation apparaît automatiquement. Vous pouvez donner des étoiles et laisser un commentaire.",
  },
  {
    q: "Mon compte est bloqué, que faire ?",
    a: "Contactez notre support via email ou WhatsApp. Un agent vous répondra dans les 24 heures.",
  },
  {
    q: "Comment modifier mon mot de passe ?",
    a: "Rendez-vous dans Profil → Changer le mot de passe. Renseignez votre mot de passe actuel puis le nouveau.",
  },
  {
    q: "Comment modifier mes informations personnelles ?",
    a: "Dans la page Profil, appuyez sur 'Modifier mes informations' pour mettre à jour votre prénom, nom, téléphone et photo.",
  },
];

export default function PassengerSupportScreen() {
  const { Colors } = useTheme();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const toggle = (idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIdx(prev => (prev === idx ? null : idx));
  };

  const contactEmail = () => Linking.openURL('mailto:support@ridngo.com?subject=Aide RidnGo');
  const contactWhatsApp = () => Linking.openURL('https://wa.me/237600000000?text=Bonjour%20support%20RidnGo');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors.cardBorder }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: Colors.input }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: Colors.text }]}>Aide & Support</Text>
          <Text style={[styles.headerSub, { color: Colors.textMuted }]}>CENTRE D'ASSISTANCE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
          <View style={[styles.heroIcon, { backgroundColor: Colors.orangeBg }]}>
            <Ionicons name="help-buoy" size={32} color={Colors.orange} />
          </View>
          <Text style={[styles.heroTitle, { color: Colors.text }]}>Comment pouvons-nous vous aider ?</Text>
          <Text style={[styles.heroSub, { color: Colors.textMuted }]}>
            Consultez notre FAQ ou contactez directement notre équipe support.
          </Text>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>QUESTIONS FRÉQUENTES</Text>
          <View style={[styles.faqGroup, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
            {FAQ_ITEMS.map((item, idx) => (
              <View key={idx}>
                <TouchableOpacity
                  style={[
                    styles.faqItem,
                    { borderBottomColor: Colors.cardBorder },
                    idx === FAQ_ITEMS.length - 1 && expandedIdx !== idx && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => toggle(idx)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.faqQuestion, { color: Colors.text }]}>{item.q}</Text>
                  <Ionicons
                    name={expandedIdx === idx ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
                {expandedIdx === idx && (
                  <View style={[styles.faqAnswer, { backgroundColor: Colors.input, borderBottomColor: Colors.cardBorder }]}>
                    <Text style={[styles.faqAnswerText, { color: Colors.textSecondary }]}>{item.a}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>NOUS CONTACTER</Text>
          <View style={styles.contactGroup}>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}
              onPress={contactWhatsApp}
              activeOpacity={0.85}
            >
              <View style={[styles.contactIcon, { backgroundColor: 'rgba(37,211,102,0.12)' }]}>
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.contactLabel, { color: Colors.text }]}>WhatsApp Support</Text>
                <Text style={[styles.contactSub, { color: Colors.textMuted }]}>Réponse sous 2 heures</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}
              onPress={contactEmail}
              activeOpacity={0.85}
            >
              <View style={[styles.contactIcon, { backgroundColor: Colors.orangeBg }]}>
                <Ionicons name="mail-outline" size={22} color={Colors.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.contactLabel, { color: Colors.text }]}>Email</Text>
                <Text style={[styles.contactSub, { color: Colors.textMuted }]}>support@ridngo.com</Text>
              </View>
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
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontWeight: '900', fontSize: 20, letterSpacing: -0.3 },
  headerSub: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 60 },
  heroCard: {
    borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center',
    gap: 12, borderWidth: 1,
  },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontWeight: '900', fontSize: 18, textAlign: 'center', letterSpacing: -0.2 },
  heroSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  section: { gap: 10 },
  sectionLabel: { fontWeight: '900', fontSize: 10, letterSpacing: 3, paddingLeft: 4 },
  faqGroup: { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  faqItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: 1, gap: 12,
  },
  faqQuestion: { flex: 1, fontWeight: '700', fontSize: 14 },
  faqAnswer: { padding: Spacing.md, borderBottomWidth: 1 },
  faqAnswerText: { fontSize: 13, lineHeight: 20 },
  contactGroup: { gap: 10 },
  contactBtn: {
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  contactIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontWeight: '900', fontSize: 14 },
  contactSub: { fontSize: 12, marginTop: 2 },
  version: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
});
