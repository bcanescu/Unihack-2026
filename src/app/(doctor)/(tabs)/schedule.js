import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '../../../context/AuthContext';
import {
  subscribeDoctorAppointments,
  cancelAppointment,
  nextDays,
  isWorkDay,
  formatDayShort,
  formatDayLong,
} from '../../../lib/appointments';
import { dateKey } from '../../../lib/medications';
import AppointmentCard from '../../../components/AppointmentCard';
import { EmptyState } from '../../../components/ui';
import { colors, spacing, radius, font } from '../../../constants/theme';

const RANGE_DAYS = 30;

export default function DoctorSchedule() {
  const { user } = useAuth();
  const [appts, setAppts] = useState([]);
  const [view, setView] = useState('days'); // 'days' | 'all'
  const days = useMemo(() => nextDays(RANGE_DAYS), []);
  const [day, setDay] = useState(dateKey());

  useEffect(() => subscribeDoctorAppointments(user.uid, setAppts), [user.uid]);

  const today = dateKey();
  const lastDay = days[days.length - 1];
  const upcoming = useMemo(
    () => appts.filter((a) => a.status === 'booked' && a.date >= today && a.date <= lastDay),
    [appts, today, lastDay]
  );
  const countByDay = useMemo(
    () => upcoming.reduce((acc, a) => ({ ...acc, [a.date]: (acc[a.date] || 0) + 1 }), {}),
    [upcoming]
  );
  const grouped = useMemo(
    () =>
      upcoming.reduce((acc, a) => {
        (acc[a.date] = acc[a.date] || []).push(a);
        return acc;
      }, {}),
    [upcoming]
  );
  const dayList = grouped[day] ?? [];
  const weekCount = upcoming.filter((a) => a.date <= days[6]).length;

  const openPatient = (a) => router.push({ pathname: `/patient/${a.patientUid}`, params: { name: a.patientName } });
  const cancel = (a) => cancelAppointment(a, 'doctor');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ gap: 4 }}>
          <Text style={styles.title}>Programări</Text>
          <Text style={styles.subtitle}>
            {weekCount} în următoarele 7 zile · {upcoming.length} în următoarele {RANGE_DAYS} de zile
          </Text>
        </View>

        <View style={styles.segment}>
          {[
            ['days', 'Pe zile'],
            ['all', 'Toate viitoare'],
          ].map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setView(key)}
              style={[styles.segmentBtn, view === key && styles.segmentOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: view === key }}
            >
              <Text style={[styles.segmentText, view === key && { color: '#fff' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {view === 'days' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {days.map((k) => {
                const f = formatDayShort(k);
                const n = countByDay[k] || 0;
                const selected = k === day;
                const work = isWorkDay(k);
                return (
                  <Pressable
                    key={k}
                    onPress={() => setDay(k)}
                    style={[styles.dayChip, selected && styles.dayChipOn, !work && !n && { opacity: 0.4 }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${formatDayLong(k)}, ${n} programări`}
                  >
                    <Text style={[styles.dayWeek, selected && { color: '#fff' }]}>{k === today ? 'Azi' : f.weekday}</Text>
                    <Text style={[styles.dayNum, selected && { color: '#fff' }]}>{f.day}</Text>
                    <View style={[styles.countPill, n === 0 && styles.countZero, selected && styles.countOnSelected]}>
                      <Text style={[styles.countText, n === 0 && { color: '#94A3B8' }, selected && { color: colors.primary }]}>{n}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.dayLabel}>{formatDayLong(day)}</Text>
            {dayList.length === 0 ? (
              <EmptyState
                icon="calendar-clear-outline"
                title={isWorkDay(day) ? 'Nicio programare' : 'Zi liberă'}
                text={isWorkDay(day) ? 'Sloturile din această zi sunt încă libere.' : 'Nu ai program în această zi.'}
              />
            ) : (
              dayList.map((a) => (
                <AppointmentCard key={a.id} appt={a} perspective="doctor" showDate={false} onPress={() => openPatient(a)} onCancel={cancel} />
              ))
            )}
          </>
        ) : upcoming.length === 0 ? (
          <EmptyState icon="calendar-outline" title="Nicio programare viitoare" />
        ) : (
          Object.entries(grouped).map(([k, list]) => (
            <View key={k} style={{ gap: spacing.sm }}>
              <View style={styles.groupHead}>
                <Text style={styles.dayLabel}>{k === today ? `Azi · ${formatDayLong(k)}` : formatDayLong(k)}</Text>
                <Text style={styles.groupCount}>{list.length}</Text>
              </View>
              {list.map((a) => (
                <AppointmentCard key={a.id} appt={a} perspective="doctor" showDate={false} onPress={() => openPatient(a)} onCancel={cancel} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md + 2, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontSize: font.title - 2, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.small + 1, color: colors.textMuted },
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill, padding: 4 },
  segmentBtn: { flex: 1, minHeight: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.primary },
  segmentText: { fontSize: font.small + 1, fontWeight: '700', color: colors.text },
  dayChip: { width: 58, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', gap: 2 },
  dayChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayWeek: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'capitalize' },
  dayNum: { fontSize: 20, fontWeight: '800', color: colors.text },
  countPill: { minWidth: 22, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center' },
  countZero: { backgroundColor: 'transparent' },
  countOnSelected: { backgroundColor: '#fff' },
  countText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  dayLabel: { fontSize: font.body, fontWeight: '800', color: colors.text },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  groupCount: { fontSize: font.small, fontWeight: '700', color: colors.primary },
});
