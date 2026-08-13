// Helper tanggal untuk presensi/izin.
// `date` pada model Attendance/LeaveRequest dinormalisasi ke UTC tengah malam
// dari kalender lokal, sehingga satu tanggal kalender selalu satu nilai Date
// yang sama (menghindari pergeseran zona waktu UTC).

/** Tanggal kalender hari ini (waktu lokal server) -> "YYYY-MM-DD". */
export function todayString(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" -> Date UTC tengah malam. */
export function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Date (yang disimpan UTC tengah malam) -> "YYYY-MM-DD". */
export function utcDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM" -> Date awal bulan (UTC) & Date awal bulan berikutnya. */
export function monthRange(monthStr: string): { gte: Date; lt: Date } {
  const [y, m] = monthStr.split("-").map(Number);
  const gte = new Date(Date.UTC(y, m - 1, 1));
  const lt = new Date(Date.UTC(y, m, 1));
  return { gte, lt };
}

/** Jumlah hari kerja (Senin-Jumat) dari besok hingga tanggal akhir (inklusif). */
export function businessDaysRemaining(end: Date, now = new Date()): number {
  let count = 0;
  const cur = new Date(now);
  cur.setHours(0, 0, 0, 0);
  cur.setDate(cur.getDate() + 1); // mulai dari besok
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Format jam untuk display (lokale id-ID). */
export function formatWaktu(d: Date | null | undefined): string {
  if (!d) return "-";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/** Format tanggal lengkap untuk display (lokale id-ID). */
export function formatTanggalPanjang(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
