import { Tabs } from 'expo-router';
import { tabScreenOptions, tabIcon } from '../../../components/tabOptions';

export default function PatientTabs() {
  return (
    <Tabs
      screenOptions={{
        ...tabScreenOptions,
        // 5 taburi: etichete puțin mai mici ca să încapă „Programări” pe ecrane înguste
        tabBarLabelStyle: { ...tabScreenOptions.tabBarLabelStyle, fontSize: 11.5 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Acasă', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="appointments" options={{ title: 'Programări', tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen name="labs" options={{ title: 'Analize', tabBarIcon: tabIcon('document-text') }} />
      <Tabs.Screen name="assistant" options={{ title: 'Asistent', tabBarIcon: tabIcon('chatbubbles') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('person-circle') }} />
    </Tabs>
  );
}
