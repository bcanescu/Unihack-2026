import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { colors } from '../constants/theme';

/**
 * Login central + redirecționare pe rol.
 * Stack.Protected ascunde rutele pentru care `guard` e fals, iar Expo Router
 * trimite automat utilizatorul la primul grup disponibil:
 *  - nelogat  → (auth)/login
 *  - pacient  → (patient)
 *  - medic    → (doctor)
 *  - admin    → (admin)
 * Un pacient nu poate ajunge în ecranele de medic nici prin link direct.
 */
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={user?.role === 'patient'}>
        <Stack.Screen name="(patient)" />
      </Stack.Protected>

      <Stack.Protected guard={user?.role === 'doctor'}>
        <Stack.Screen name="(doctor)" />
      </Stack.Protected>

      <Stack.Protected guard={user?.role === 'admin'}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
