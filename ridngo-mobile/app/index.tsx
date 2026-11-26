import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../src/types/theme';

// La redirection (landing, radar chauffeur ou recherche passager) est faite par la garde du layout racine
export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={Colors.orange} size="large" />
    </View>
  );
}
