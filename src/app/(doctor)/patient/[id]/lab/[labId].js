import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { getLab } from '../../../../../lib/labs';
import TopBar from '../../../../../components/TopBar';
import { LabDetail } from '../../../../../components/LabViews';
import { EmptyState } from '../../../../../components/ui';
import { colors, spacing } from '../../../../../constants/theme';

export default function DoctorLabDetail() {
  const { id, labId } = useLocalSearchParams();
  const [lab, setLab] = useState(undefined);

  useEffect(() => {
    getLab(id, labId).then(setLab).catch(() => setLab(null));
  }, [id, labId]);

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="Analize" />
      <ScrollView contentContainerStyle={styles.container}>
        {lab === undefined && <ActivityIndicator color={colors.primary} />}
        {lab === null && <EmptyState icon="lock-closed-outline" title="Buletinul nu este disponibil" text="Nu există sau nu mai ai acces la acest pacient." />}
        {lab && <LabDetail lab={lab} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, maxWidth: 560, width: '100%', alignSelf: 'center' },
});
