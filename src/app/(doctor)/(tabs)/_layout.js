import { Tabs } from 'expo-router';
import { tabScreenOptions, tabIcon } from '../../../components/tabOptions';

export default function DoctorTabs() {
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="index" options={{ title: 'Azi', tabBarIcon: tabIcon('today') }} />
      <Tabs.Screen name="schedule" options={{ title: 'Programări', tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen name="patients" options={{ title: 'Pacienți', tabBarIcon: tabIcon('people') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('person-circle') }} />
    </Tabs>
  );
}
