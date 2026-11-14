// Profilul public al unui medic – îl văd pacienții înainte de programare (și medicul, ca previzualizare).
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { subscribeDoctorPublic, subscribeDoctorReviews, ratingSummary, formatReviewDate } from '../lib/doctorProfile';
import { Stars } from './Stars';
import HospitalRatingCard from './HospitalRatingCard';
import { initials, Card, EmptyState } from './ui';
import { colors, spacing, radius, font } from '../constants/theme';

function Section({ icon, title, children }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Bullets({ items }) {
  return (
    <View style={{ gap: 6 }}>
      {items.map((t, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={styles.dot} />
          <Text style={styles.bulletText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export default function DoctorPublicProfile({ uid, footer }) {
  const [doctor, setDoctor] = useState(undefined);
  const [reviews, setReviews] = useState([]);

  useEffect(() => subscribeDoctorPublic(uid, setDoctor), [uid]);
  useEffect(() => subscribeDoctorReviews(uid, setReviews), [uid]);

  if (doctor === undefined) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
  if (doctor === null) return <EmptyState icon="person-outline" title="Profilul nu este disponibil" />;

  const { avg, count, dist } = ratingSummary(reviews);
  const hasAbout = doctor.bio || doctor.education?.length || doctor.achievements?.length || doctor.experienceYears != null;

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Antet */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(doctor.name)}</Text>
        </View>
        <Text style={styles.name}>{doctor.name}</Text>
        <Text style={styles.specialty}>{doctor.specialty}</Text>
        {!!doctor.hospitalRole && <Text style={styles.role}>{doctor.hospitalRole}</Text>}
        <View style={styles.hospitalRow}>
          <Ionicons name="business-outline" size={15} color={colors.textMuted} />
          <Text style={styles.hospital}>{doctor.hospital}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{count ? avg.toFixed(1) : '—'}</Text>
            {count ? <Stars value={avg} size={13} /> : <Text style={styles.statLabel}>fără note</Text>}
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{count}</Text>
            <Text style={styles.statLabel}>{count === 1 ? 'recenzie' : 'recenzii'}</Text>
          </View>
          {doctor.experienceYears != null && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{doctor.experienceYears}</Text>
                <Text style={styles.statLabel}>ani experiență</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {footer}

      {!!doctor.bio && (
        <Section icon="person-circle-outline" title="Despre">
          <Text style={styles.bio}>{doctor.bio}</Text>
        </Section>
      )}
      {!!doctor.education?.length && (
        <Section icon="school-outline" title="Studii și formare">
          <Bullets items={doctor.education} />
        </Section>
      )}
      {!!doctor.achievements?.length && (
        <Section icon="trophy-outline" title="Realizări">
          <Bullets items={doctor.achievements} />
        </Section>
      )}
      {!hasAbout && <Text style={styles.empty}>Medicul nu și-a completat încă profilul.</Text>}

      {!!doctor.hospital && (
        <Section icon="business-outline" title="Spitalul">
          <HospitalRatingCard hospital={doctor.hospital} />
        </Section>
      )}

      {/* Recenzii */}
      <Section icon="chatbubbles-outline" title={`Recenzii pacienți${count ? ` (${count})` : ''}`}>
        {count === 0 ? (
          <Text style={styles.empty}>Nicio recenzie încă. Recenziile vin doar de la pacienți care au avut o consultație.</Text>
        ) : (
          <>
            <Card style={styles.distCard}>
              <View style={{ alignItems: 'center', minWidth: 80 }}>
                <Text style={styles.bigAvg}>{avg.toFixed(1)}</Text>
                <Stars value={avg} size={14} />
                <Text style={styles.statLabel}>{count} recenzii</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                {[5, 4, 3, 2, 1].map((st) => (
                  <View key={st} style={styles.distRow}>
                    <Text style={styles.distLabel}>{st}</Text>
                    <Ionicons name="star" size={11} color="#F59E0B" />
                    <View style={styles.distTrack}>
                      <View style={[styles.distFill, { width: `${(dist[st - 1] / count) * 100}%` }]} />
                    </View>
                    <Text style={styles.distCount}>{dist[st - 1]}</Text>
                  </View>
                ))}
              </View>
            </Card>
            {reviews.slice(0, 20).map((r) => (
              <Card key={r.id} style={{ gap: 6 }}>
                <View style={styles.reviewHead}>
                  <Stars value={r.rating} size={14} />
                  <Text style={styles.reviewDate}>{formatReviewDate(r.createdAt)}</Text>
                </View>
                <Text style={styles.reviewText}>„{r.comment}”</Text>
                <View style={styles.reviewAuthor}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.reviewAuthorText}>
                    {r.authorName} · consultație verificată{r.reason ? ` · ${r.reason}` : ''}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 4 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentSoft,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.primary },
  name: { fontSize: font.title - 2, fontWeight: '800', color: colors.text, textAlign: 'center' },
  specialty: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  role: { fontSize: font.small, color: colors.text, textAlign: 'center', marginTop: 2 },
  hospitalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  hospital: { fontSize: font.small - 1, color: colors.textMuted, textAlign: 'center' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignSelf: 'stretch',
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center', gap: 2, minWidth: 70 },
  statValue: { fontSize: font.body + 3, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: font.small - 2, color: colors.textMuted },
  statDivider: { width: 1, height: 32, backgroundColor: '#E2E8F0' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: font.body + 1, fontWeight: '800', color: colors.text },
  bio: { fontSize: font.body - 1, color: colors.text, lineHeight: 23 },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 8 },
  bulletText: { flex: 1, fontSize: font.body - 1, color: colors.text, lineHeight: 22 },
  empty: { fontSize: font.small, color: colors.textMuted, lineHeight: 19 },
  distCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bigAvg: { fontSize: 34, fontWeight: '900', color: colors.text },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distLabel: { width: 10, fontSize: 11, color: colors.textMuted, textAlign: 'right' },
  distTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.surface, overflow: 'hidden' },
  distFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 4 },
  distCount: { width: 20, fontSize: 11, color: colors.textMuted, textAlign: 'right' },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewDate: { fontSize: font.small - 2, color: colors.textMuted },
  reviewText: { fontSize: font.body - 1, color: colors.text, lineHeight: 22 },
  reviewAuthor: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewAuthorText: { fontSize: font.small - 2, color: colors.textMuted },
});
