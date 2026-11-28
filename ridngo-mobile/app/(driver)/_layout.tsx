import { Tabs } from 'expo-router';
import { useTabOptions, tabIcon } from '../../src/components/TabBar';
import { useI18n } from '../../src/i18n';

// expo-router 58 : `href: null` cache l'écran ET redirige vers le premier onglet ; on ne cache que le bouton
const HIDDEN = { tabBarButton: () => null };

export default function DriverLayout() {
  const { t } = useI18n();
  return (
    <Tabs backBehavior="history" screenOptions={useTabOptions()}>
      <Tabs.Screen name="dashboard" options={{ title: t('Radar'), tabBarIcon: tabIcon('scan', 'scan-outline') }} />
      <Tabs.Screen name="driver-dashboard" options={{ title: t('Tableau de bord'), tabBarIcon: tabIcon('grid', 'grid-outline') }} />
      <Tabs.Screen name="my-rides" options={{ title: t('Mes offres'), tabBarIcon: tabIcon('list', 'list-outline') }} />
      <Tabs.Screen name="notifications" options={{ title: t('Notifications'), tabBarIcon: tabIcon('notifications', 'notifications-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('Profil'), tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }} />

      {/* Écrans cachés */}
      <Tabs.Screen name="subscription" options={HIDDEN} />
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
