// Ecranul de profil (pornit de la Profil.js), legat la datele reale ale utilizatorului.
// Același ecran pentru pacient și medic; meniul diferă după rol.
import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { getPatientSummary, ageFrom } from '../lib/careLinks';
import { subscribeMedications } from '../lib/medications';
import { SCHEDULE_TEXT, SCHEDULE } from '../lib/appointments';
import { initials } from './ui';
import RemindersCard from './RemindersCard';
import { colors, spacing, radius, font } from '../constants/theme';

const formatBirth = (d) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function MenuItem({ icon, title, open, onPress, children, danger }) {
  return (
    <View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityState={children ? { expanded: !!open } : undefined}
      >
        <View style={styles.menuItemLeft}>
          <View style={[styles.iconWrapper, danger && { backgroundColor: colors.errorSoft }]}>
            {icon === 'log-out' ? (
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
            ) : (
              <Feather name={icon} size={20} color={colors.primary} />
            )}
          </View>
          <Text style={[styles.menuText, danger && { color: colors.error }]}>{title}</Text>
        </View>
        {children && <Feather name={open ? 'chevron-down' : 'chevron-right'} size={20} color="#94A3B8" />}
      </Pressable>
      {open && children && <View style={styles.panel}>{children}</View>}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const isDoctor = user.role === 'doctor';
  const [details, setDetails] = useState(null);
  const [meds, setMeds] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (isDoctor) return;
    getPatientSummary(user.uid).then(setDetails).catch(() => setDetails(null));
    return subscribeMedications(user.uid, setMeds);
  }, [isDoctor, user.uid]);

  const toggle = (key) => setOpen((cur) => (cur === key ? null : key));
  const age = ageFrom(details?.birthDate);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profilul meu</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar cu inițiale (fără poze aleatoare de pe internet) + nume */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user.name)}</Text>
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileSub}>
            {isDoctor ? [user.specialty, user.hospital].filter(Boolean).join(' · ') : user.email}
          </Text>
        </View>

        <View style={styles.menu}>
          {isDoctor ? (
            <>
              <MenuItem icon="briefcase" title="Date profesionale" open={open === 'pro'} onPress={() => toggle('pro')}>
                <InfoRow label="Nume" value={user.name} />
                <InfoRow label="Specializare" value={user.specialty} />
                <InfoRow label="Spital" value={user.hospital} />
                <InfoRow label="Email" value={user.email} />
                <Text style={styles.note}>Datele profesionale sunt verificate și actualizate de administrator.</Text>
              </MenuItem>
              <MenuItem icon="clock" title="Program de consultații" open={open === 'program'} onPress={() => toggle('program')}>
                <InfoRow label="Zile și ore" value={SCHEDULE_TEXT} />
                <InfoRow label="Durată consultație" value={`${SCHEDULE.slotMinutes} minute`} />
              </MenuItem>
            </>
          ) : (
            <>
              <MenuItem icon="user" title="Date personale" open={open === 'personal'} onPress={() => toggle('personal')}>
                <InfoRow label="Nume" value={user.name} />
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Data nașterii" value={formatBirth(details?.birthDate)} />
                <InfoRow label="Vârstă" value={age != null ? `${age} ani` : null} />
                <InfoRow label="Sex" value={details?.sex === 'F' ? 'Feminin' : details?.sex === 'M' ? 'Masculin' : null} />
                <Text style={styles.note}>CNP-ul nu este salvat în clar – doar o amprentă criptografică a lui.</Text>
              </MenuItem>
              <MenuItem icon="bell" title="Notificări" open={open === 'notif'} onPress={() => toggle('notif')}>
                {meds.length > 0 ? (
                  <RemindersCard meds={meds} />
                ) : (
                  <Text style={styles.note}>Reminderele devin disponibile după ce medicul îți adaugă un tratament.</Text>
                )}
              </MenuItem>
            </>
          )}

          <MenuItem icon="lock" title="Confidențialitate" open={open === 'privacy'} onPress={() => toggle('privacy')}>
            {isDoctor ? (
              <Text style={styles.panelText}>
                Vezi dosarul unui pacient doar după ce acesta acceptă cererea ta de acces și numai cât timp accesul
                rămâne activ. Fiecare medicament și buletin adăugat este semnat cu numele tău.
              </Text>
            ) : (
              <Text style={styles.panelText}>
                Datele tale medicale sunt vizibile doar ție și medicilor cărora le-ai acceptat cererea de acces. Poți
                retrage accesul oricând din „Medicii mei”. Medicii la care faci o programare văd doar numele tău și
                motivul programării.
              </Text>
            )}
          </MenuItem>

          <MenuItem icon="help-circle" title="Ajutor" open={open === 'help'} onPress={() => toggle('help')}>
            <Text style={styles.panelText}>
              {isDoctor
                ? '• Adaugă un pacient din tabul „Pacienți”, după CNP.\n• Programările apar în „Azi” și „Programări”.\n• Din fișa pacientului adaugi tratament și analize.'
                : '• Acceptă cererea medicului din „Acasă”.\n• Bifează „Luat” la fiecare doză din „Ce iau azi”.\n• Fă o programare din tabul „Programări”.'}
            </Text>
          </MenuItem>

          <MenuItem icon="log-out" title="Deconectare" danger onPress={signOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.primary },
  scroll: { paddingBottom: spacing.xl, maxWidth: 560, width: '100%', alignSelf: 'center' },
  profileSection: { alignItems: 'center', marginTop: 8, marginBottom: 24, paddingHorizontal: 24 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarText: { fontSize: 34, fontWeight: '800', color: colors.primary },
  profileName: { marginTop: 16, fontSize: 22, fontWeight: 'bold', color: colors.text },
  profileSub: { marginTop: 4, fontSize: font.small + 1, color: colors.textMuted, textAlign: 'center' },
  menu: { paddingHorizontal: 24 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 4 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: { fontSize: font.body, fontWeight: '600', color: colors.text },
  panel: { marginLeft: 60, marginBottom: 12, gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: '#F8FAFC' },
  panelText: { fontSize: font.small + 1, color: colors.text, lineHeight: 21 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  infoLabel: { fontSize: font.small + 1, color: colors.textMuted },
  infoValue: { flex: 1, textAlign: 'right', fontSize: font.small + 1, fontWeight: '600', color: colors.text },
  note: { fontSize: font.small - 1, color: colors.textMuted, lineHeight: 18 },
});
