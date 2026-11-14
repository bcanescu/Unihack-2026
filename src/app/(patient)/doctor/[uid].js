// Pacient → profilul public al unui medic (studii, experiență, recenzii) → Programează-te.
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import DoctorPublicProfile from '../../../components/DoctorPublicProfile';
import TopBar from '../../../components/TopBar';
import PrimaryButton from '../../../components/PrimaryButton';
import { colors, spacing } from '../../../constants/theme';

export default function DoctorProfileForPatient() {
  const { uid, fromBooking } = useLocalSearchParams();
  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="Profilul medicului" fallback="/appointments" />
      <ScrollView contentContainerStyle={styles.container}>
        <DoctorPublicProfile
          uid={uid}
          footer={
            <PrimaryButton
              title="📅  Programează-te"
              onPress={() =>
                fromBooking
                  ? router.back()
                  : router.push({ pathname: '/book', params: { doctorUid: uid } })
              }
            />
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, maxWidth: 560, width: '100%', alignSelf: 'center' },
});
