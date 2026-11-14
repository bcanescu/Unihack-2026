/**
 * Raportul de aderență: compară dozele programate cu cele bifate de pacient.
 *
 * Starea unei doze:
 *   'ontime'  – luată la cel mult 60 de minute după ora programată
 *   'late'    – luată, dar cu întârziere de peste 60 de minute
 *   'missed'  – nebifată, iar ora a trecut de peste 60 de minute
 *   'pending' – ora încă n-a trecut (sau a trecut de mai puțin de 60 de minute)
 */
import { addDays, dateKey, scheduledDosesForDay } from './medications';
import { toDate } from './careLinks';

export const LATE_MINUTES = 60;

const scheduledAt = (key, time) => {
  const [y, m, d] = key.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi);
};

export const fmtTime = (date) =>
  date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '';

/**
 * meds: toate medicamentele (inclusiv oprite); intakes: dozele bifate în perioadă.
 * Returnează { days, total, perMed: [{ med, stats, cells: { [day]: [{time, status, takenAt, delayMin}] } }], log }
 */
export function computeAdherence(meds, intakes, periodDays, now = new Date()) {
  const today = dateKey(now);
  const days = Array.from({ length: periodDays }, (_, i) => addDays(today, -(periodDays - 1 - i)));
  const byKey = new Map(intakes.map((i) => [i.id, i]));

  const empty = () => ({ ontime: 0, late: 0, missed: 0, pending: 0 });
  const total = empty();
  const perMedMap = new Map();
  const log = [];

  days.forEach((day) =>
    scheduledDosesForDay(meds, day).forEach((dose) => {
      const intake = byKey.get(dose.key);
      const sched = scheduledAt(day, dose.time);
      let status;
      let takenAt = null;
      let delayMin = null;
      if (intake) {
        takenAt = toDate(intake.takenAt) ?? sched;
        delayMin = Math.round((takenAt.getTime() - sched.getTime()) / 60000);
        status = delayMin > LATE_MINUTES ? 'late' : 'ontime';
      } else if (now.getTime() - sched.getTime() > LATE_MINUTES * 60000) {
        status = 'missed';
      } else {
        status = 'pending';
      }

      if (!perMedMap.has(dose.med.id)) perMedMap.set(dose.med.id, { med: dose.med, stats: empty(), cells: {} });
      const entry = perMedMap.get(dose.med.id);
      entry.stats[status]++;
      total[status]++;
      (entry.cells[day] = entry.cells[day] || []).push({ time: dose.time, status, takenAt, delayMin });
      if (status !== 'pending') log.push({ day, time: dose.time, med: dose.med, status, takenAt, delayMin });
    })
  );

  log.sort((a, b) => (b.day + b.time).localeCompare(a.day + a.time));
  const perMed = [...perMedMap.values()].sort((a, b) => a.med.name.localeCompare(b.med.name, 'ro'));
  return { days, total, perMed, log };
}

/** Procentul de doze luate (la timp + întârziate) din cele deja scadente. null dacă nu există încă doze scadente. */
export function adherencePercent(stats) {
  const due = stats.ontime + stats.late + stats.missed;
  if (due === 0) return null;
  return Math.round(((stats.ontime + stats.late) / due) * 100);
}

export const percentColor = (p, colors) =>
  p == null ? colors.textMuted : p >= 85 ? colors.success : p >= 60 ? colors.warning : colors.error;
