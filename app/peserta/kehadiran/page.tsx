import { requirePeserta } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getPesertaBySession, getUserIdBySession } from "@/lib/peserta";
import { todayStringWib, toUtcDate, utcDateString, monthRange } from "@/lib/dates";
import CheckInWidget from "@/components/peserta/check-in-widget";
import AttendanceHistory from "@/components/peserta/attendance-history";
import { PresensiOptimisticProvider } from "@/components/peserta/presensi-optimistic";
import { CalendarCheck2, CircleAlert, ClipboardPenLine, Flame } from "lucide-react";

export const dynamic = "force-dynamic";

const PER_PAGE = 10;

function NotParticipant() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <ClipboardPenLine className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-lg font-bold text-slate-900">Belum Peserta Aktif</h1>
      <p className="mt-2 text-sm text-slate-500">
        Modul presensi hanya tersedia bagi peserta yang telah diaktifkan oleh admin.
      </p>
    </div>
  );
}

export default async function KehadiranPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; month?: string }>;
}) {
  const session = await requirePeserta();

  // Query profil peserta dibungkus try-catch: bila koneksi Supabase timeout /
  // error, halaman tetap render (fallback "Belum Peserta Aktif") alih-alih 500.
  let peserta: Awaited<ReturnType<typeof getPesertaBySession>> = null;
  try {
    peserta = await getPesertaBySession(session);
  } catch {
    peserta = null;
  }
  if (!peserta) return <NotParticipant />;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "")
    ? (params.month as string)
    : todayStringWib().slice(0, 7);
  const { gte, lt } = monthRange(month);

  // Resolve User.id ASLI dari email session (NextAuth) agar query kehadiran
  // match persis dengan data yang disimpan saat check-in (untuk akun Google,
  // session.user.id adalah Google sub, bukan primary key Prisma). Dibungkus
  // try-catch: jika gagal, fallback ke userId kosong (riwayat tampil kosong).
  let userId = "";
  try {
    userId = (await getUserIdBySession(session)) ?? "";
  } catch {
    userId = "";
  }
  const today = toUtcDate(todayStringWib());

  // Query kehadiran dibungkus catch agar halaman tetap render (dengan data
  // kosong) bila terjadi error koneksi/query Prisma — tidak crash 500.
  const [records, total, attToday, monthSummary, streak] = await Promise.all([
    prisma.attendance
      .findMany({
        where: { userId, date: { gte, lt } },
        orderBy: { date: "desc" },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
        select: { id: true, date: true, checkIn: true, checkOut: true, status: true },
      })
      .catch(() => []),
    prisma.attendance.count({ where: { userId, date: { gte, lt } } }).catch(() => 0),
    prisma.attendance
      .findUnique({
        where: { userId_date: { userId, date: today } },
        select: { checkIn: true, checkOut: true },
      })
      .catch(() => null),
    prisma.attendance
      .groupBy({
        by: ["status"],
        where: { userId, date: { gte, lt } },
        _count: { _all: true },
      })
      .catch(() => []),
    countStreak(userId).catch(() => 0),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hadirCount = monthSummary.find((s) => s.status === "HADIR")?._count._all ?? 0;

  return (
    <PresensiOptimisticProvider>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Presensi Kehadiran</h1>
          <p className="mt-1 text-sm text-slate-500">
            Catat kehadiran harian Anda dan lihat riwayatnya per bulan.
          </p>
        </div>

        {/* Widget check-in + ringkasan bulan */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CheckInWidget
              today={utcDateString(today)}
              initialState={{
                checkedIn: !!attToday?.checkIn,
                checkedOut: !!attToday?.checkOut,
                checkInTime: attToday?.checkIn?.toISOString() ?? null,
                checkOutTime: attToday?.checkOut?.toISOString() ?? null,
              }}
            />
          </div>

          <div className="grid content-start gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
                Rangkaian Hadir
              </div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-navy-700">
                {streak} <span className="text-sm font-medium text-slate-400">hari berturut-turut</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CalendarCheck2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Ringkasan {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </div>
              <div className="mt-3 grid w-full max-w-full grid-cols-3 gap-2 text-center box-border sm:gap-4">
                <div className="rounded-xl bg-emerald-50 py-3">
                  <div className="text-xl font-bold text-emerald-700">{hadirCount}</div>
                  <div className="text-[11px] font-medium text-emerald-600">Hadir</div>
                </div>
                <div className="rounded-xl bg-amber-50 py-3">
                  <div className="text-xl font-bold text-amber-700">
                    {monthSummary.find((s) => s.status === "IZIN")?._count._all ?? 0}
                  </div>
                  <div className="text-[11px] font-medium text-amber-600">Izin</div>
                </div>
                <div className="rounded-xl bg-rose-50 py-3">
                  <div className="text-xl font-bold text-rose-700">
                    {monthSummary.find((s) => s.status === "SAKIT")?._count._all ?? 0}
                  </div>
                  <div className="text-[11px] font-medium text-rose-600">Sakit</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabel riwayat (client component agar baris optimistic bisa disisipkan) */}
        <AttendanceHistory
          records={records}
          total={total}
          page={page}
          totalPages={totalPages}
          month={month}
        />

        <div className="flex items-start gap-2 rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-xs text-navy-700">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Presensi dilakukan satu kali per hari. Status kehadiran dapat disesuaikan oleh mentor
            bila Anda sedang berhalangan (izin/sakit).
          </p>
        </div>
      </div>
    </PresensiOptimisticProvider>
  );
}

// Menghitung jumlah hari hadir berturut-turut berakhir hari ini/kemarin.
async function countStreak(userId: string): Promise<number> {
  const dates = (
    await prisma.attendance.findMany({
      where: { userId, status: "HADIR" },
      select: { date: true },
      orderBy: { date: "desc" },
    })
  ).map((r) => utcDateString(r.date));

  const seen = new Set(dates);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // izinkan streak dimulai dari hari ini atau kemarin
  if (!seen.has(utcDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!seen.has(utcDateString(cursor))) return 0;
  }
  let count = 0;
  while (seen.has(utcDateString(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
