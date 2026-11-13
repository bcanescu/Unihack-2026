import { Stack } from 'expo-router';

export default function DoctorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-patient" />
      <Stack.Screen name="patient/[id]/index" />
      <Stack.Screen name="patient/[id]/lab/[labId]" />
      <Stack.Screen name="add-medication" />
      <Stack.Screen name="add-lab" />
    </Stack>
  );
}
