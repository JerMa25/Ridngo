import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { NetworkProvider } from '../src/context/NetworkContext';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { I18nProvider, useI18n } from '../src/i18n';

SplashScreen.preventAutoHideAsync();

/** Accueil de chaque profil : landing hors connexion, radar pour le chauffeur, recherche pour le passager. */
export const homeFor = (role?: string) =>
  !role ? '/(auth)/landing' : role === 'DRIVER' ? '/(driver)/dashboard' : '/(passenger)/ride';

/** Garde unique : chacun reste dans son espace, et toute déconnexion ramène à la landing. */
function useSessionGuard() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const group = segments[0];

  useEffect(() => {
    if (isLoading) return;
    const home = homeFor(user?.role);
    const allowed = !user ? group === '(auth)'
      : user.role === 'DRIVER' ? group === '(driver)'
      : group === '(passenger)';
    if (!allowed) router.replace(home as any);
  }, [user, isLoading, group]);
}

function AppContent() {
  const { isDark, Colors } = useTheme();
  const { lang } = useI18n();
  useEffect(() => { SplashScreen.hideAsync(); }, []);
  useSessionGuard();

  return (
    <>
      {/* SDK 58 : barre d'état edge-to-edge, backgroundColor/translucent n'existent plus */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      {/* key : au changement de langue, les écrans sont remontés et chaque tr() reprend la nouvelle langue */}
      <Stack
        key={lang}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(passenger)" />
        <Stack.Screen name="(driver)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* SafeAreaProvider requis par useSafeAreaInsets dans toute l'app */}
      <SafeAreaProvider>
        <NetworkProvider>
          <ThemeProvider>
            <I18nProvider>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            </I18nProvider>
          </ThemeProvider>
        </NetworkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// import { useEffect } from 'react';
// import { Stack } from 'expo-router';
// import { StatusBar } from 'expo-status-bar';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import * as SplashScreen from 'expo-splash-screen';
// import { AuthProvider } from '../src/context/AuthContext';
// import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

// SplashScreen.preventAutoHideAsync();

// function AppContent() {
//   const { isDark, Colors } = useTheme();
//   useEffect(() => { SplashScreen.hideAsync(); }, []);

//   return (
//     <>
//       <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={Colors.background} />
//       <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
//         <Stack.Screen name="index" />
//         <Stack.Screen name="(auth)" />
//         <Stack.Screen name="(passenger)" />
//         <Stack.Screen name="(driver)" />
//       </Stack>
//     </>
//   );
// }

// export default function RootLayout() {
//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <ThemeProvider>
//         <AuthProvider>
//           <AppContent />
//         </AuthProvider>
//       </ThemeProvider>
//     </GestureHandlerRootView>
//   );
// }