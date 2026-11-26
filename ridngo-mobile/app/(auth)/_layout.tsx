import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1B263B' } }}>
      <Stack.Screen name="landing" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
