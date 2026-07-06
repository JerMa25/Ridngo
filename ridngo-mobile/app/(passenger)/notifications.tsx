import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Modal, ScrollView, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { userService } from '../../src/services/userService';
import { Spacing, Radius } from '../../src/types/theme';

type FilterType = 'ALL' | 'UNREAD';

export default function PassengerNotificationsScreen() {
  const { Colors } = useTheme();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => { loadInitialData(); }, [filter]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const data = await userService.getNotifications(0, 10);
      const content = Array.isArray(data) ? data : (data.content || []);
      setNotifications(content);
      setHasMore(data.currentPage < data.totalPages - 1);
      setPage(0);
    } catch { /* silent */ }
    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await userService.getNotifications(nextPage, 10);
      const content = Array.isArray(data) ? data : (data.content || []);
      setNotifications(prev => [...prev, ...content]);
      setPage(nextPage);
      setHasMore(data.currentPage < data.totalPages - 1);
    } catch { /* silent */ }
    setLoadingMore(false);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await userService.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await userService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  const toggleExpand = (id: string, isRead: boolean) => {
    setExpandedId(prev => (prev === id ? null : id));
    if (!isRead) handleMarkRead(id);
  };

  const openSettings = async () => {
    setShowSettings(true);
    try {
      const data = await userService.getNotificationSettings();
      setSettings(data);
    } catch { /* silent */ }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      await userService.updateNotificationSettings({
        push: settings.pushEnabled,
        email: settings.emailEnabled,
        sms: settings.smsEnabled,
        whatsapp: settings.whatsappEnabled,
      });
      setShowSettings(false);
    } catch { Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres.'); }
    setSavingSettings(false);
  };

  const filteredNotifs = filter === 'ALL' ? notifications : notifications.filter(n => !n.isRead);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderNotif = ({ item }: { item: any }) => {
    const isExpanded = expandedId === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.notifCard,
          {
            backgroundColor: Colors.card,
            borderColor: !item.isRead ? Colors.orange : Colors.cardBorder,
            borderLeftWidth: !item.isRead ? 3 : 1,
          },
        ]}
        onPress={() => toggleExpand(item.id, item.isRead)}
        activeOpacity={0.85}
      >
        {/* Dot pulsant non lu */}
        {!item.isRead && (
          <View style={[styles.unreadDot, { backgroundColor: Colors.orange }]} />
        )}

        <View style={styles.notifHeader}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.notifTitle,
                { color: Colors.text, fontWeight: !item.isRead ? '900' : '700', opacity: item.isRead ? 0.6 : 1 },
              ]}
              numberOfLines={isExpanded ? undefined : 1}
            >
              {item.title || 'Notification'}
            </Text>
            <Text
              style={[styles.notifMessage, { color: Colors.textSecondary }]}
              numberOfLines={isExpanded ? undefined : 1}
            >
              {item.message || item.content || ''}
            </Text>
          </View>
          <View style={styles.notifMeta}>
            <Text style={[styles.notifDate, { color: Colors.textMuted }]}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
            </Text>
          </View>
        </View>

        {isExpanded && !item.isRead && (
          <TouchableOpacity
            style={[styles.markReadBtn, { backgroundColor: Colors.greenBg }]}
            onPress={() => handleMarkRead(item.id)}
          >
            <Ionicons name="checkmark" size={14} color={Colors.green} />
            <Text style={[styles.markReadText, { color: Colors.green }]}>Marquer comme lu</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors.cardBorder }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: Colors.input }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: Colors.text }]}>Messagerie</Text>
          <Text style={[styles.headerSub, { color: Colors.textMuted }]}>CENTRE DE NOTIFICATIONS</Text>
        </View>
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: Colors.input }]}
          onPress={openSettings}
        >
          <Ionicons name="settings-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filtres + Tout marquer lu */}
      <View style={[styles.toolbar, { borderBottomColor: Colors.cardBorder }]}>
        <View style={[styles.filterGroup, { backgroundColor: Colors.input }]}>
          {(['ALL', 'UNREAD'] as FilterType[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && { backgroundColor: Colors.card }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, { color: filter === f ? Colors.orange : Colors.textMuted }]}>
                {f === 'ALL' ? 'Tous' : `Non lus${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={[styles.markAllBtn, { backgroundColor: Colors.orangeBg, borderColor: Colors.orange }]}
            onPress={handleMarkAllRead}
          >
            <Ionicons name="checkmark-done" size={14} color={Colors.orange} />
            <Text style={[styles.markAllText, { color: Colors.orange }]}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Liste */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.orange} size="large" />
          <Text style={[styles.loadingText, { color: Colors.textMuted }]}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifs}
          keyExtractor={item => item.id}
          renderItem={renderNotif}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: Colors.input }]}>
                <Ionicons name="mail-outline" size={40} color={Colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: Colors.text }]}>Boîte vide</Text>
              <Text style={[styles.emptyText, { color: Colors.textMuted }]}>Aucune notification pour le moment</Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
                {loadingMore
                  ? <ActivityIndicator color={Colors.orange} size="small" />
                  : (
                    <>
                      <Ionicons name="add-circle-outline" size={20} color={Colors.textMuted} />
                      <Text style={[styles.loadMoreText, { color: Colors.textMuted }]}>Charger les messages précédents</Text>
                    </>
                  )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* Modal Paramètres */}
      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowSettings(false)} />
          <View style={[styles.modalContent, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: Colors.text }]}>Paramètres</Text>
                <Text style={[styles.modalSub, { color: Colors.textMuted }]}>PRÉFÉRENCES DE RÉCEPTION</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {!settings ? (
              <View style={styles.centered}>
                <ActivityIndicator color={Colors.orange} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  { id: 'pushEnabled', label: 'Notifications Push', icon: 'notifications-outline' as const },
                  { id: 'emailEnabled', label: 'Alertes E-mail', icon: 'at-outline' as const },
                  { id: 'smsEnabled', label: 'Messages SMS', icon: 'phone-portrait-outline' as const },
                  { id: 'whatsappEnabled', label: 'WhatsApp', icon: 'logo-whatsapp' as const },
                ].map(pref => (
                  <View key={pref.id} style={[styles.prefRow, { backgroundColor: Colors.input }]}>
                    <View style={[styles.prefIcon, { backgroundColor: Colors.card }]}>
                      <Ionicons name={pref.icon} size={18} color={Colors.orange} />
                    </View>
                    <Text style={[styles.prefLabel, { color: Colors.text }]}>{pref.label}</Text>
                    <Switch
                      value={!!settings[pref.id]}
                      onValueChange={v => setSettings({ ...settings, [pref.id]: v })}
                      thumbColor={settings[pref.id] ? Colors.orange : Colors.textMuted}
                      trackColor={{ false: Colors.cardBorder, true: Colors.orangeBg }}
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: Colors.orange }, savingSettings && { opacity: 0.6 }]}
                  onPress={saveSettings}
                  disabled={savingSettings}
                >
                  {savingSettings
                    ? <ActivityIndicator color="#0D0D0D" size="small" />
                    : <Text style={styles.saveBtnText}>Enregistrer</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40 },
  loadingText: { fontWeight: '700', fontSize: 13 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontWeight: '900', fontSize: 20, letterSpacing: -0.3 },
  headerSub: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 1 },
  settingsBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, flexWrap: 'wrap',
  },
  filterGroup: { flexDirection: 'row', borderRadius: 20, padding: 4, gap: 2 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16 },
  filterText: { fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  markAllText: { fontWeight: '900', fontSize: 10, letterSpacing: 0.5 },

  list: { padding: Spacing.md, gap: 8, paddingBottom: 40 },
  notifCard: {
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1,
    position: 'relative', overflow: 'hidden',
  },
  unreadDot: {
    position: 'absolute', top: 14, right: 14,
    width: 8, height: 8, borderRadius: 4,
  },
  notifHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  notifTitle: { fontSize: 14, marginBottom: 3 },
  notifMessage: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  notifMeta: { alignItems: 'flex-end', gap: 4, marginTop: 2 },
  notifDate: { fontSize: 10, fontWeight: '700' },
  markReadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, alignSelf: 'flex-end',
  },
  markReadText: { fontWeight: '900', fontSize: 10, letterSpacing: 0.5 },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontWeight: '900', fontSize: 18 },
  emptyText: { fontWeight: '500', fontSize: 13, textAlign: 'center' },

  loadMoreBtn: { flexDirection: 'column', alignItems: 'center', gap: 6, paddingVertical: 24 },
  loadMoreText: { fontWeight: '900', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.lg, gap: 16, borderWidth: 1, maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  modalTitle: { fontWeight: '900', fontSize: 22, letterSpacing: -0.3 },
  modalSub: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 2 },
  prefRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.md, borderRadius: Radius.md, marginBottom: 8,
  },
  prefIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  prefLabel: { flex: 1, fontWeight: '700', fontSize: 14 },
  saveBtn: {
    borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center',
    marginTop: 8, marginBottom: 20,
  },
  saveBtnText: { color: '#0D0D0D', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
});
