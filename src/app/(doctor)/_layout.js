import { Stack } from 'expo-router';

export default function DoctorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-patient" />
      <Stack.Screen name="patient/[id]/index" />
      <Stack.Screen name="patient/[id]/lab/[labId]" />
      <Stack.Screen name="patient/[id]/adherence" />
      <Stack.Screen name="add-medication" />
      <Stack.Screen name="add-lab" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="public-profile" />
    </Stack>
  );
}
