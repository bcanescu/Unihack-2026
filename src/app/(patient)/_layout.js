import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';

export default function PatientLayout() {
  // Atingerea unui reminder deschide ecranul lui (programări / Acasă).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const url = res.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url);
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="book" />
      <Stack.Screen name="lab/[labId]" />
      <Stack.Screen name="add-lab-photo" />
      <Stack.Screen name="doctor/[uid]" />
      <Stack.Screen name="review/[apptId]" />
    </Stack>
  );
}
