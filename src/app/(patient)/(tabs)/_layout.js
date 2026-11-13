import { Tabs } from 'expo-router';
import { tabScreenOptions, tabIcon } from '../../../components/tabOptions';

export default function PatientTabs() {
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="index" options={{ title: 'Acasă', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="appointments" options={{ title: 'Programări', tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen name="labs" options={{ title: 'Analize', tabBarIcon: tabIcon('document-text') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('person-circle') }} />
    </Tabs>
  );
}
