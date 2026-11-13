import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

// Stil comun pentru bara de taburi: etichete vizibile, iconițe mari, contrast bun.
export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: '#64748B',
  tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
  tabBarStyle: { minHeight: 64, paddingTop: 6, borderTopColor: '#E2E8F0' },
};

export const tabIcon =
  (name) =>
  ({ color, focused }) => <Ionicons name={focused ? name : `${name}-outline`} size={26} color={color} />;
