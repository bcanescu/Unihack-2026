// „Despre medic” – rezumat afișat în fluxul de programare, imediat după ce pacientul alege un medic.
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { subscribeDoctorPublic, subscribeDoctorReviews, ratingSummary, formatReviewDate } from '../lib/doctorProfile';
import { Stars } from './Stars';
import { colors, spacing, radius, font } from '../constants/theme';

export default function DoctorPreview({ uid }) {
  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => subscribeDoctorPublic(uid, setDoctor), [uid]);
  useEffect(() => subscribeDoctorReviews(uid, setReviews), [uid]);
  useEffect(() => setExpanded(false), [uid]);

  if (!doctor) return null;
  const { avg, count } = ratingSummary(reviews);
  const facts = [
    doctor.experienceYears != null && `${doctor.experienceYears} ani experiență`,
    doctor.education?.length && `${doctor.education.length} ${doctor.education.length === 1 ? 'formare' : 'formări'}`,
    doctor.achievements?.length && `${doctor.achievements.length} ${doctor.achievements.length === 1 ? 'realizare' : 'realizări'}`,
  ].filter(Boolean);

  return (
    <View style={styles.box} accessibilityLabel={`Despre ${doctor.name}`}>
      <View style={styles.head}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={styles.title}>Despre medic</Text>
        {count > 0 && (
          <View style={styles.rating}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {avg.toFixed(1)} <Text style={styles.ratingCount}>({count})</Text>
            </Text>
          </View>
        )}
      </View>

      {!!doctor.hospitalRole && <Text style={styles.role}>{doctor.hospitalRole}</Text>}
      {facts.length > 0 && <Text style={styles.facts}>{facts.join(' · ')}</Text>}

      {!!doctor.bio && (
        <Pressable onPress={() => setExpanded((e) => !e)} accessibilityRole="button" accessibilityLabel={expanded ? 'Restrânge descrierea' : 'Citește toată descrierea'}>
          <Text style={styles.bio} numberOfLines={expanded ? undefined : 3}>
            {doctor.bio}
          </Text>
          {doctor.bio.length > 140 && <Text style={styles.more}>{expanded ? 'Mai puțin' : 'Citește mai mult'}</Text>}
        </Pressable>
      )}
      {!doctor.bio && !doctor.hospitalRole && facts.length === 0 && (
        <Text style={styles.empty}>Medicul nu și-a completat încă profilul.</Text>
      )}

      {count > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.subTitle}>Ce spun pacienții</Text>
          {reviews.slice(0, 2).map((r) => (
            <View key={r.id} style={styles.review}>
              <View style={styles.reviewHead}>
                <Stars value={r.rating} size={12} />
                <Text style={styles.reviewMeta}>
                  {r.authorName} · {formatReviewDate(r.createdAt)}
                </Text>
              </View>
              <Text style={styles.reviewText} numberOfLines={3}>
                „{r.comment}”
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Nicio recenzie încă.</Text>
      )}

      <Pressable
        onPress={() => router.push({ pathname: `/doctor/${uid}`, params: { fromBooking: '1' } })}
        style={({ pressed }) => [styles.fullBtn, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
      >
        <Text style={styles.fullBtnText}>Vezi profilul complet{count > 2 ? ` și toate cele ${count} recenzii` : ''}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#B5EDE6',
    backgroundColor: '#F7FDFC',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: font.body + 1, fontWeight: '800', color: colors.text },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: font.small + 1, fontWeight: '800', color: colors.text },
  ratingCount: { fontWeight: '500', color: colors.textMuted },
  role: { fontSize: font.small + 1, fontWeight: '700', color: colors.primary },
  facts: { fontSize: font.small - 1, color: colors.textMuted },
  bio: { fontSize: font.body - 1, color: colors.text, lineHeight: 22 },
  more: { color: colors.primary, fontWeight: '700', fontSize: font.small, marginTop: 2 },
  empty: { fontSize: font.small, color: colors.textMuted },
  subTitle: { fontSize: font.small + 1, fontWeight: '800', color: colors.text, marginTop: 2 },
  review: { gap: 4, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: '#fff' },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewMeta: { fontSize: font.small - 2, color: colors.textMuted },
  reviewText: { fontSize: font.small + 1, color: colors.text, lineHeight: 20 },
  fullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#fff',
  },
  fullBtnText: { color: colors.primary, fontWeight: '800', fontSize: font.small + 1 },
});
