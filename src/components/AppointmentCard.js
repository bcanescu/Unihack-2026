import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDayShort } from "../lib/appointments";
import { Card } from "./ui";
import PrimaryButton from "./PrimaryButton";
import { colors, spacing, radius, font } from "../constants/theme";

/**
 * Card de programare.
 * perspective: 'patient' (afișează medicul) sau 'doctor' (afișează pacientul).
 * showDate: false pe lista „Azi” a medicului, unde data e implicită.
 */
export default function AppointmentCard({
  appt,
  perspective,
  onCancel,
  onPress,
  showDate = true,
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancelled = appt.status === "cancelled";
  const d = formatDayShort(appt.date);
  const who = perspective === "patient" ? appt.doctorName : appt.patientName;
  const sub = perspective === "patient" ? appt.doctorSpecialty : null;

  async function cancel() {
    setBusy(true);
    try {
      await onCancel(appt);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  // Doar rândul cu informații e apăsabil. Butoanele de anulare stau în afara lui,
  // altfel pe web apare <button> în <button> (HTML invalid).
  const info = (
    <View style={styles.row}>
      <View style={styles.when}>
        {showDate ? (
          <>
            <Text style={styles.weekday}>{d.weekday}</Text>
            <Text style={styles.day}>{d.day}</Text>
            <Text style={styles.month}>{d.month}</Text>
          </>
        ) : (
          <Text style={styles.timeBig}>{appt.time}</Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.who}>{who}</Text>
        <Text style={styles.meta}>
          {showDate ? `${appt.time} · ` : ""}
          {appt.reason}
          {sub ? ` · ${sub}` : ""}
        </Text>
        {perspective === "patient" && !!appt.hospital && (
          <Text style={styles.meta} numberOfLines={1}>
            {appt.hospital}
          </Text>
        )}
        {cancelled && (
          <Text style={styles.cancelledText}>
            Anulată
            {appt.cancelledBy
              ? appt.cancelledBy === "doctor"
                ? " de medic"
                : " de pacient"
              : ""}
          </Text>
        )}
      </View>
      {onPress && !cancelled && (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </View>
  );

  return (
    <Card style={cancelled && { opacity: 0.6 }}>
      {onPress && !cancelled ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Deschide: ${who}, ${appt.time}`}
          style={({ pressed }) => [pressed && { opacity: 0.75 }]}
        >
          {info}
        </Pressable>
      ) : (
        info
      )}

      {onCancel &&
        !cancelled &&
        (confirming ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmText}>
              Anulezi programarea? Ora se eliberează pentru alți pacienți.
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Nu"
                  variant="outline"
                  onPress={() => setConfirming(false)}
                  disabled={busy}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Da, anulează"
                  onPress={cancel}
                  loading={busy}
                />
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirming(true)}
            hitSlop={8}
            style={{ alignSelf: "flex-start" }}
            accessibilityRole="button"
            accessibilityLabel={`Anulează programarea din ${appt.date} ora ${appt.time}`}
          >
            <Text style={styles.cancelLink}>Anulează programarea</Text>
          </Pressable>
        ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  when: {
    width: 60,
    minHeight: 60,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  weekday: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "capitalize",
  },
  day: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
    lineHeight: 26,
  },
  month: { fontSize: 12, color: colors.primary },
  timeBig: {
    fontSize: font.body + 1,
    fontWeight: "800",
    color: colors.primary,
  },
  who: { fontSize: font.body + 1, fontWeight: "700", color: colors.text },
  meta: { fontSize: font.small, color: colors.textMuted },
  cancelledText: {
    fontSize: font.small - 1,
    fontWeight: "700",
    color: colors.error,
  },
  cancelLink: {
    color: colors.error,
    fontWeight: "700",
    fontSize: font.small + 1,
  },
  confirm: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  confirmText: { fontSize: font.small + 1, color: colors.text, lineHeight: 20 },
});
