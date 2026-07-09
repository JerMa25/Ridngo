import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../context/NetworkContext';
import { useTheme } from '../context/ThemeContext';

/**
 * Bandeau discret affiché en haut de l'écran quand l'appareil n'a plus de connexion,
 * et brièvement quand la connexion revient (pour rassurer l'utilisateur que ça re-synchronise).
 * À placer une fois dans chaque layout racine (driver / passenger / auth).
 */
export function OfflineBanner() {
  const { isOnline, justReconnected } = useNetwork();
  const { Colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const visible = !isOnline || justReconnected;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: isOnline ? '#22C55E' : '#F59E0B',
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
        },
      ]}
      pointerEvents="none"
    >
      <Ionicons name={isOnline ? 'checkmark-circle' : 'cloud-offline'} size={14} color="#FFF" />
      <Text style={styles.text}>
        {isOnline ? 'Connexion rétablie' : 'Hors ligne — données enregistrées localement'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingTop: 8,
  },
  text: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});
