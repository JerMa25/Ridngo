import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

// expo-router 58 : `href: null` cache l'écran ET redirige vers le premier onglet ; on ne cache que le bouton
const HIDDEN = { tabBarButton: () => null };

export default function PassengerLayout() {
  const { Colors } = useTheme();
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.darkCard,
          borderTopColor: Colors.cardBorder,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarActiveTintColor: Colors.orange,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontWeight: '900', fontSize: 10, letterSpacing: 0.5 },
      }}
    >
      {/* ── Onglets visibles ── */}
      <Tabs.Screen
        name="ride"
        options={{
          title: 'Commander',
          tabBarIcon: ({ color, size }) => <Ionicons name="car" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Mes courses',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color as string} />,
        }}
      />

      {/* ── Écrans cachés (naviguables via router.push) ── */}
      <Tabs.Screen name="notifications" options={HIDDEN} />
      <Tabs.Screen name="support" options={HIDDEN} />
      <Tabs.Screen name="my-offer" options={HIDDEN} />
    </Tabs>
  );
}
