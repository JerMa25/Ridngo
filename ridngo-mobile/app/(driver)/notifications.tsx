/**
 * app/(driver)/notifications.tsx
 * Page de gestion des notifications pour le chauffeur.
 *
 * GET  /api/v1/notifications?page=0&size=20
 * PATCH /api/v1/notifications/{id}/read
 * PATCH /api/v1/notifications/read-all
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { userService } from '../../src/services/userService';
import { Spacing, Radius } from '../../src/types/theme';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch { return '—'; }
}

function iconForType(type: string): { name: string; color: string; bg: string } {
  switch (type?.toUpperCase()) {
    case 'OFFER':
    case 'NEW_OFFER':    return { name: 'car-outline',           color: '#FF8C00', bg: 'rgba(255,140,0,0.1)' };
    case 'RIDE':
    case 'RIDE_UPDATE':  return { name: 'navigate-outline',      color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' };
    case 'PAYMENT':
    case 'WALLET':       return { name: 'wallet-outline',        color: '#22C55E', bg: 'rgba(34,197,94,0.1)' };
    case 'REVIEW':       return { name: 'star-outline',          color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' };
    case 'SYSTEM':
    case 'INFO':         return { name: 'information-circle-outline', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' };
    default:             return { name: 'notifications-outline', color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' };
  }
}

export default function NotificationsScreen() {
  const { Colors } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await userService.getNotifications(0, 50);
      setNotifications(Array.isArray(data) ? data : []);
    } catch { setNotifications([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleMarkRead = useCallback(async (notif: Notification) => {
    if (notif.read) return;
    try {
      await userService.markNotificationRead(notif.id);
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
      );
    } catch { /* silent */ }
  }, []);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await userService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      Alert.alert('Erreur', 'Impossible de marquer toutes les notifications comme lues.');
    } finally { setMarkingAll(false); }
  };

  const onRefresh = () => { setRefreshing(true); load(); };

  const renderItem = ({ item }: { item: Notification }) => {
    const { name, color, bg } = iconForType(item.type);
    return (
      <TouchableOpacity
        style={[
          s.card,
          {
            backgroundColor: item.read ? Colors.card : Colors.background,
            borderColor: item.read ? Colors.cardBorder : color,
            borderLeftWidth: item.read ? 1 : 3,
          },
        ]}
        onPress={() => handleMarkRead(item)}
        activeOpacity={0.75}
      >
        {/* Icône */}
        <View style={[s.iconBox, { backgroundColor: bg }]}>
          <Ionicons name={name as any} size={20} color={color} />
        </View>

        {/* Contenu */}
        <View style={s.content}>
          <View style={s.titleRow}>
            <Text style={[s.title, { color: Colors.text }]} numberOfLines={1}>
              {item.title || 'Notification'}
            </Text>
            {!item.read && <View style={[s.unreadDot, { backgroundColor: color }]} />}
          </View>
          <Text style={[s.message, { color: Colors.textMuted }]} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={[s.date, { color: Colors.textMuted }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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

        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: Colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[s.countBadge, { backgroundColor: Colors.orange }]}>
              <Text style={s.countTxt}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={[s.markAllBtn, { backgroundColor: Colors.input }]}
            onPress={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll
              ? <ActivityIndicator size="small" color={Colors.orange} />
              : <Ionicons name="checkmark-done-outline" size={18} color={Colors.orange} />
            }
          </TouchableOpacity>
        )}
      </View>

      {/* Liste */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={Colors.orange} size="large" />
          <Text style={[s.loadingTxt, { color: Colors.textMuted }]}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            s.list,
            notifications.length === 0 && { flex: 1 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.orange} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: Colors.input }]}>
                <Ionicons name="notifications-off-outline" size={40} color={Colors.textMuted} />
              </View>
              <Text style={[s.emptyTitle, { color: Colors.text }]}>Aucune notification</Text>
              <Text style={[s.emptyHint, { color: Colors.textMuted }]}>
                Vos alertes et mises à jour apparaîtront ici.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { fontWeight: '700', fontSize: 13 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, gap: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  countBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  countTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },
  markAllBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  // List
  list: { padding: Spacing.md, paddingBottom: 40 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: Radius.lg, borderWidth: 1,
    padding: Spacing.md,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  content: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontWeight: '900', fontSize: 14, flex: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5 },
  message: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  date: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptyHint: { fontSize: 13, fontWeight: '500', textAlign: 'center', paddingHorizontal: 32 },
});
