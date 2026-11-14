import { Tabs } from 'expo-router';
import { tabScreenOptions, tabIcon } from '../../../components/tabOptions';

export default function AdminTabs() {
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="index" options={{ title: 'Cereri', tabBarIcon: tabIcon('mail-unread') }} />
      <Tabs.Screen name="doctors" options={{ title: 'Medici', tabBarIcon: tabIcon('medkit') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('person-circle') }} />
    </Tabs>
  );
}
