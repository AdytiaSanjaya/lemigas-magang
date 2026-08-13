import { requirePeserta } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getPesertaBySession } from "@/lib/peserta";
import { todayString, toUtcDate, utcDateString, monthRange, formatWaktu } from "@/lib/dates";
import CheckInWidget from "@/components/peserta/check-in-widget";
import AttendanceFilter from "@/components/peserta/attendance-filter";
import StatusBadge from "@/components/ui/status-badge";
import Pagination from "@/components/ui/pagination";
import { CalendarCheck2, CircleAlert, ClipboardPenLine, Flame, History } from "lucide-react";

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
  const peserta = await getPesertaBySession(session);
  if (!peserta) return <NotParticipant />;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "")
    ? (params.month as string)
    : todayString().slice(0, 7);
  const { gte, lt } = monthRange(month);

  const userId = session.user.id;
  const today = toUtcDate(todayString());

  const [records, total, attToday, monthSummary] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId, date: { gte, lt } },
      orderBy: { date: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.attendance.count({ where: { userId, date: { gte, lt } } }),
    prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { userId, date: { gte, lt } },
      _count: { _all: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hadirCount = monthSummary.find((s) => s.status === "HADIR")?._count._all ?? 0;
  const streak = await countStreak(userId);

  return (
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
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
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

      {/* Tabel riwayat */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-800">Riwayat Kehadiran</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {total} catatan
            </span>
          </div>
          <AttendanceFilter />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Hari</th>
                <th className="px-5 py-3">Check-in</th>
                <th className="px-5 py-3">Check-out</th>
                <th className="px-5 py-3">Durasi</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center">
                      <CalendarCheck2 className="h-8 w-8 text-slate-300" aria-hidden="true" />
                      <p className="mt-2 text-sm text-slate-400">
                        Belum ada catatan kehadiran pada bulan ini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {utcDateString(a.date)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {a.date.toLocaleDateString("id-ID", { weekday: "long" })}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-700">{formatWaktu(a.checkIn)}</td>
                    <td className="px-5 py-3 font-mono text-slate-700">{formatWaktu(a.checkOut)}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {a.checkIn && a.checkOut ? durasiLabel(a.checkIn, a.checkOut) : "-"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-5 py-3">
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath="/peserta/kehadiran"
              query={`month=${encodeURIComponent(month)}`}
            />
          </div>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-xs text-navy-700">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Presensi dilakukan satu kali per hari. Status kehadiran dapat disesuaikan oleh mentor
          bila Anda sedang berhalangan (izin/sakit).
        </p>
      </div>
    </div>
  );
}

function durasiLabel(checkIn: Date, checkOut: Date): string {
  const ms = Math.max(0, checkOut.getTime() - checkIn.getTime());
  const jam = Math.floor(ms / 3600000);
  const menit = Math.floor((ms % 3600000) / 60000);
  return `${jam}j ${menit}m`;
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
