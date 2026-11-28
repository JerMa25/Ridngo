import React from 'react';
import { View, Platform, ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Options communes des barres d'onglets : icône dans une pastille orange quand l'onglet est actif. */
export function useTabOptions() {
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarStyle: {
      backgroundColor: Colors.darkCard,
      borderTopColor: Colors.cardBorder,
      borderTopWidth: 1,
      height: 64 + insets.bottom,
      paddingTop: 8,
      paddingBottom: Math.max(insets.bottom, 8),
      ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } }, default: { elevation: 12 } }),
    },
    tabBarActiveTintColor: Colors.orange,
    tabBarInactiveTintColor: Colors.textMuted,
    tabBarLabelStyle: { fontWeight: '800' as const, fontSize: 10, marginTop: 2 },
  };
}

export const tabIcon = (name: IconName, outline: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <View style={{ width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? 'rgba(255,140,0,0.15)' : 'transparent' }}>
      <Ionicons name={focused ? name : outline} size={21} color={color as string} />
    </View>
  );
