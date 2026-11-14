// Medic → Profil → „Cum mă văd pacienții” (previzualizare + editare).
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import DoctorPublicProfile from '../../components/DoctorPublicProfile';
import TopBar from '../../components/TopBar';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, spacing } from '../../constants/theme';

export default function MyPublicProfile() {
  const { user } = useAuth();
  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="Cum mă văd pacienții" fallback="/profile" />
      <ScrollView contentContainerStyle={styles.container}>
        <DoctorPublicProfile
          uid={user.uid}
          footer={<PrimaryButton title="Editează profilul public" onPress={() => router.push('/edit-profile')} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, maxWidth: 560, width: '100%', alignSelf: 'center' },
});
