// Evaluarea unui spital de către pacienți: curățenie, personal, condiții + probleme raportate des.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeHospitalReviews, hospitalSummary, CRITERIA } from '../lib/hospitalReviews';
import { formatReviewDate } from '../lib/doctorProfile';
import { colors, spacing, radius, font } from '../constants/theme';

const barColor = (v) => (v >= 4 ? colors.success : v >= 3 ? '#F59E0B' : colors.error);

export default function HospitalRatingCard({ hospital, compact = false }) {
  const [reviews, setReviews] = useState([]);
  useEffect(() => subscribeHospitalReviews(hospital, setReviews), [hospital]);
  if (!hospital) return null;

  const { count, avg, overall, topIssues } = hospitalSummary(reviews);
  const comments = reviews.filter((r) => r.comment).slice(0, compact ? 1 : 2);

  return (
    <View style={styles.box} accessibilityLabel={`Evaluarea spitalului ${hospital}`}>
      <View style={styles.head}>
        <Ionicons name="business" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{compact ? 'Spitalul, după pacienți' : 'Cum e la acest spital'}</Text>
          <Text style={styles.hospital} numberOfLines={2}>
            {hospital}
          </Text>
        </View>
        {count > 0 && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.overall}>
              <Ionicons name="star" size={14} color="#F59E0B" /> {overall.toFixed(1)}
            </Text>
            <Text style={styles.count}>
              {count} {count === 1 ? 'evaluare' : 'evaluări'}
            </Text>
          </View>
        )}
      </View>

      {count === 0 ? (
        <Text style={styles.empty}>Nicio evaluare încă. Pacienții pot evalua spitalul după consultație.</Text>
      ) : (
        <>
          {CRITERIA.map((c) => (
            <View key={c.key} style={styles.row}>
              <Text style={styles.label}>{c.label}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(avg[c.key] / 5) * 100}%`, backgroundColor: barColor(avg[c.key]) }]} />
              </View>
              <Text style={styles.value}>{avg[c.key].toFixed(1)}</Text>
            </View>
          ))}

          {topIssues.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={styles.subTitle}>Probleme raportate</Text>
              <View style={styles.issues}>
                {topIssues.map(({ issue, n }) => (
                  <View key={issue} style={styles.issue}>
                    <Ionicons name="alert-circle-outline" size={13} color={colors.warning} />
                    <Text style={styles.issueText}>
                      {issue} ({n})
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {comments.map((r) => (
            <View key={r.id} style={styles.comment}>
              <Text style={styles.commentText} numberOfLines={3}>
                „{r.comment}”
              </Text>
              <Text style={styles.commentMeta}>
                {r.authorName} · {formatReviewDate(r.createdAt)}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm + 2, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: font.body, fontWeight: '800', color: colors.text },
  hospital: { fontSize: font.small - 1, color: colors.textMuted },
  overall: { fontSize: font.body + 1, fontWeight: '900', color: colors.text },
  count: { fontSize: font.small - 2, color: colors.textMuted },
  empty: { fontSize: font.small, color: colors.textMuted, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { width: 78, fontSize: font.small, color: colors.text, fontWeight: '600' },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  value: { width: 28, textAlign: 'right', fontSize: font.small, fontWeight: '800', color: colors.text },
  subTitle: { fontSize: font.small, fontWeight: '800', color: colors.text },
  issues: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  issue: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.warningSoft },
  issueText: { fontSize: font.small - 2, fontWeight: '700', color: colors.warning },
  comment: { gap: 2, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.surface },
  commentText: { fontSize: font.small + 1, color: colors.text, lineHeight: 20 },
  commentMeta: { fontSize: font.small - 2, color: colors.textMuted },
});
