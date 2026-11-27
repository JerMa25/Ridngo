import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

// expo-router 58 : `href: null` cache l'écran ET redirige vers le premier onglet ; on ne cache que le bouton
const HIDDEN = { tabBarButton: () => null };

export default function DriverLayout() {
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
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Radar',
          tabBarIcon: ({ color, size }) => <Ionicons name="scan" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="driver-dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="my-rides"
        options={{
          title: 'Mes offres',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color as string} />,
        }}
      />

      {/* Écrans cachés */}
      <Tabs.Screen name="notifications" options={HIDDEN} />
      <Tabs.Screen name="support" options={HIDDEN} />
      <Tabs.Screen name="heatmap" options={HIDDEN} />
      <Tabs.Screen name="history" options={HIDDEN} />
      <Tabs.Screen name="performance" options={HIDDEN} />
      <Tabs.Screen name="vehicle" options={HIDDEN} />
      <Tabs.Screen name="onboarding" options={HIDDEN} />
      <Tabs.Screen name="offers/[id]" options={HIDDEN} />
      <Tabs.Screen name="ride/[id]" options={HIDDEN} />
    </Tabs>
  );
}
