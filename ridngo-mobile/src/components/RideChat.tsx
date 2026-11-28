import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { tr } from '../i18n';

type Message = { id: string; senderId: string; senderRole: string; content: string; sentAt: string };

const POLL_MS = 3000;

/** Chat passager ↔ chauffeur d'une course (mêmes appels que le ChatWidget du web, rafraîchi toutes les 3 s). */
export function RideChat({ rideId, userId, role }: { rideId: string; userId: string; role: 'PASSENGER' | 'DRIVER' }) {
  const { Colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const openRef = useRef(open);
  const seen = useRef(new Set<string>());
  openRef.current = open;

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const data: Message[] = (await api.get(`/api/v1/chat/${rideId}/messages`)).data || [];
        if (stopped) return;
        const fresh = data.filter(m => !seen.current.has(m.id));
        fresh.forEach(m => seen.current.add(m.id));
        if (fresh.length) {
          setMessages([...data].sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt)));
          if (!openRef.current) setUnread(u => u + fresh.filter(m => m.senderId !== userId).length);
        }
      } catch { /* réseau : nouvel essai au prochain tour */ }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => { stopped = true; clearInterval(id); };
  }, [rideId, userId]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true); setError('');
    try {
      await api.post(`/api/v1/chat/${rideId}/messages`, { content, senderRole: role });
      setText('');
      const data: Message[] = (await api.get(`/api/v1/chat/${rideId}/messages`)).data || [];
      data.forEach(m => seen.current.add(m.id));
      setMessages([...data].sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt)));
    } catch (e: any) {
      setError(e?.response?.data?.detail || tr("Message non envoyé, réessayez."));
    } finally { setSending(false); }
  };

  return (
    <>
      <TouchableOpacity style={[st.fab, { backgroundColor: Colors.orange }]} onPress={() => { setOpen(true); setUnread(0); }}
        accessibilityRole="button" accessibilityLabel={unread ? tr('Ouvrir le chat, {n} nouveau(x) message(s)', { n: unread }) : tr('Ouvrir le chat')}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
        {unread > 0 && <View style={st.badge}><Text style={st.badgeTxt}>{unread}</Text></View>}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[st.sheet, { backgroundColor: Colors.darkCard }]}>
            <View style={st.header}>
              <Text style={[st.title, { color: Colors.text }]}>{role === 'PASSENGER' ? tr("Votre chauffeur") : tr("Votre passager")}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} accessibilityLabel={tr("Fermer le chat")}><Ionicons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            <FlatList
              data={messages}
              keyExtractor={m => m.id}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: 'center', marginTop: 24 }}>{tr("Aucun message. Écrivez le premier !")}</Text>}
              renderItem={({ item }) => {
                const mine = item.senderId === userId;
                return (
                  <View style={[st.bubble, mine ? { alignSelf: 'flex-end', backgroundColor: Colors.orange } : { alignSelf: 'flex-start', backgroundColor: Colors.input }]}>
                    <Text style={{ color: mine ? '#FFFFFF' : Colors.text }}>{item.content}</Text>
                    <Text style={{ color: mine ? 'rgba(255,255,255,0.7)' : Colors.textMuted, fontSize: 9, marginTop: 2 }}>
                      {new Date(item.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              }}
            />
            {!!error && <Text style={{ color: Colors.red, fontSize: 12, marginBottom: 6 }}>{error}</Text>}
            <View style={st.inputRow}>
              <TextInput value={text} onChangeText={setText} placeholder={tr("Votre message…")} placeholderTextColor={Colors.textMuted}
                style={[st.input, { color: Colors.text, backgroundColor: Colors.input }]} onSubmitEditing={send} returnKeyType="send" maxLength={500} />
              <TouchableOpacity style={[st.send, { backgroundColor: Colors.orange }, (!text.trim() || sending) && { opacity: 0.5 }]}
                onPress={send} disabled={!text.trim() || sending} accessibilityLabel={tr("Envoyer")}>
                {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="send" size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  fab: { position: 'absolute', right: 16, bottom: 110, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 8, zIndex: 50 },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeTxt: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { height: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '900' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingBottom: 8 },
  input: { flex: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
