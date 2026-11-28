import { Tabs } from 'expo-router';
import { useTabOptions, tabIcon } from '../../src/components/TabBar';
import { useI18n } from '../../src/i18n';

// expo-router 58 : `href: null` cache l'écran ET redirige vers le premier onglet ; on ne cache que le bouton
const HIDDEN = { tabBarButton: () => null };

export default function PassengerLayout() {
  const { t } = useI18n();
  return (
    <Tabs backBehavior="history" screenOptions={useTabOptions()}>
      <Tabs.Screen name="ride" options={{ title: t('Commander'), tabBarIcon: tabIcon('car', 'car-outline') }} />
      <Tabs.Screen name="dashboard" options={{ title: t('Tableau de bord'), tabBarIcon: tabIcon('grid', 'grid-outline') }} />
      <Tabs.Screen name="history" options={{ title: t('Historique'), tabBarIcon: tabIcon('time', 'time-outline') }} />
      <Tabs.Screen name="notifications" options={{ title: t('Notifications'), tabBarIcon: tabIcon('notifications', 'notifications-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('Profil'), tabBarIcon: tabIcon('person', 'person-outline') }} />

      {/* Écrans cachés (naviguables via router.push) */}
      <Tabs.Screen name="support" options={HIDDEN} />
      <Tabs.Screen name="my-offer" options={HIDDEN} />
    </Tabs>
  );
}
