import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/types/theme';

export default function Index() {
  const { user, isLoading, isGuest, setAsGuest } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    
    // Auto-guest si pas d'utilisateur et pas en train de charger
    if (!user && !isGuest) {
      setAsGuest();
      return;
    }

    if (!user || isGuest) {
      router.replace('/(passenger)/ride');
    } else if (user.role === 'DRIVER') {
      router.replace('/(driver)/dashboard');
    } else {
      router.replace('/(passenger)/ride');
    }
  }, [user, isLoading, isGuest, setAsGuest]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={Colors.orange} size="large" />
    </View>
  );
}
