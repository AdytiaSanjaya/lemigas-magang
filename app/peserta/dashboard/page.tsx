import { requirePeserta } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getPesertaBySession } from "@/lib/peserta";
import { todayString, toUtcDate, utcDateString, businessDaysRemaining, formatWaktu } from "@/lib/dates";
import { formatTanggal } from "@/lib/format";
import RealtimeClock from "@/components/peserta/realtime-clock";
import StatusBadge from "@/components/ui/status-badge";
import {
  CalendarCheck2,
  Activity,
  CalendarRange,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  ClipboardPenLine,
  Building2,
} from "lucide-react";

export const dynamic = "force-dynamic";

const DAY_MS = 86400000;

export default async function PesertaDashboardPage() {
  const session = await requirePeserta();
  const peserta = await getPesertaBySession(session);

  // Belum tercatat sebagai peserta aktif.
  if (!peserta) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ClipboardPenLine className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Belum Terdaftar sebagai Peserta Aktif</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Akun Anda belum terhubung ke data peserta aktif. Portal presensi dan
          pengajuan izin hanya dapat diakses setelah pendaftaran Anda diterima
          oleh admin dan data peserta diaktifkan.
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Jika Anda yakin sudah diterima, hubungi admin atau mentor pembimbing Anda.
        </div>
      </div>
    );
  }

  const now = new Date();
  const today = toUtcDate(todayString());
  const todayKey = utcDateString(today);

  const [
    totalKehadiran,
    kehadiranBulanIni,
    attToday,
    approvedIzinToday,
    izinPending,
    recentAttendance,
    recentIzin,
  ] = await Promise.all([
    prisma.attendance.count({ where: { userId: session.user.id } }),
    prisma.attendance.count({
      where: {
        userId: session.user.id,
        date: { gte: toUtcDate(todayKey.slice(0, 7) + "-01") },
      },
    }),
    prisma.attendance.findUnique({
      where: { userId_date: { userId: session.user.id, date: today } },
    }),
    prisma.leaveRequest.findFirst({
      where: {
        userId: session.user.id,
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leaveRequest.count({
      where: { userId: session.user.id, status: "PENDING" },
    }),
    prisma.attendance.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: 6,
    }),
    prisma.leaveRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  // Status hari ini
  let statusHariIni: { label: string; text: string; cls: string; icon: typeof Activity } = {
    label: "Belum check-in",
    text: "Jangan lupa lakukan presensi masuk hari ini.",
    cls: "bg-slate-100 text-slate-600",
    icon: Clock,
  };
  if (attToday?.checkIn && attToday?.checkOut) {
    statusHariIni = {
      label: "Presensi selesai",
      text: `Check-in ${formatWaktu(attToday.checkIn)} · Check-out ${formatWaktu(attToday.checkOut)}`,
      cls: "bg-emerald-100 text-emerald-700",
      icon: CheckCircle2,
    };
  } else if (attToday?.checkIn) {
    statusHariIni = {
      label: "Sedang bekerja",
      text: `Check-in pukul ${formatWaktu(attToday.checkIn)}.`,
      cls: "bg-navy-100 text-navy-700",
      icon: Activity,
    };
  } else if (approvedIzinToday) {
    statusHariIni = {
      label: "Izin disetujui",
      text: `${approvedIzinToday.type === "SAKIT" ? "Sakit" : "Izin"} pada hari ini.`,
      cls: "bg-amber-100 text-amber-700",
      icon: ClipboardPenLine,
    };
  }

  // Sisa masa magang
  const selesai = new Date(peserta.tanggalSelesai);
  selesai.setHours(0, 0, 0, 0);
  const mulai = new Date(peserta.tanggalMulai);
  mulai.setHours(0, 0, 0, 0);
  const totalDays = Math.max(1, Math.round((selesai.getTime() - mulai.getTime()) / DAY_MS) + 1);
  const hariTersisa = Math.max(0, Math.round((selesai.getTime() - now.getTime()) / DAY_MS) + 1);
  const kerjaTersisa = businessDaysRemaining(selesai, now);
  const progress = Math.min(100, Math.round(((totalDays - hariTersisa) / totalDays) * 100));

  const cards: Array<{
    key: string;
    label: string;
    value: string | number;
    icon: typeof Activity;
    iconBg: string;
    chip: string;
    sub: string;
    small?: boolean;
  }> = [
    {
      key: "total",
      label: "Total Kehadiran",
      value: totalKehadiran,
      icon: CalendarCheck2,
      iconBg: "bg-emerald-50 text-emerald-600",
      chip: "bg-emerald-50 text-emerald-600",
      sub: `${kehadiranBulanIni} presensi bulan ini`,
    },
    {
      key: "status",
      label: "Status Hari Ini",
      value: statusHariIni.label,
      icon: statusHariIni.icon,
      iconBg: "bg-navy-50 text-navy-600",
      chip: statusHariIni.cls,
      sub: statusHariIni.text,
      small: true,
    },
    {
      key: "hari",
      label: "Sisa Masa Magang",
      value: hariTersisa,
      icon: CalendarRange,
      iconBg: "bg-amber-50 text-amber-600",
      chip: "bg-amber-50 text-amber-600",
      sub: `${Math.round(hariTersisa / 7)} minggu kalender tersisa`,
    },
    {
      key: "kerja",
      label: "Hari Kerja Tersisa",
      value: kerjaTersisa,
      icon: Briefcase,
      iconBg: "bg-sky-50 text-sky-600",
      chip: "bg-sky-50 text-sky-600",
      sub: "Senin-Jumat",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-700 via-navy-800 to-navy-950 px-6 py-8 text-white shadow-lg shadow-navy-900/10 md:px-8">
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-navy-400/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-navy-300/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-navy-200">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Selamat datang kembali
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              {session.user.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-navy-100">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                {peserta.unit.nama}
              </span>
              {peserta.mentor && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">
                  Mentor: {peserta.mentor.nama}
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">
                {formatTanggal(peserta.tanggalMulai)} &rarr; {formatTanggal(peserta.tanggalSelesai)}
              </span>
            </div>
          </div>
          <div className="md:text-right">
            <div className="inline-flex flex-col items-center rounded-2xl bg-white/10 px-6 py-4 ring-1 ring-white/15 backdrop-blur-sm">
              <RealtimeClock size="lg" />
              <div className="mt-2 flex items-center gap-2 text-xs text-navy-100">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {statusHariIni.label}
                {izinPending > 0 && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 font-semibold text-amber-200">{izinPending} izin menunggu</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}
                >
                  <Icon size={20} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${card.chip}`}>
                  {card.key === "status" ? "Hari ini" : card.key === "total" ? "Total" : card.key === "hari" ? "Kalender" : "Kerja"}
                </span>
              </div>
              <div
                className={`mt-4 font-bold tracking-tight text-slate-900 ${
                  card.small ? "text-xl" : "text-3xl"
                }`}
              >
                {card.value}
              </div>
              <div className="mt-1 text-sm text-slate-500">{card.label}</div>
              <div className="mt-0.5 truncate text-xs text-slate-400">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Progres masa magang */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Progres Masa Magang</span>
          <span className="font-semibold text-navy-700">{progress}%</span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-navy-500 to-navy-700 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>Mulai: {formatTanggal(peserta.tanggalMulai)}</span>
          <span>Selesai: {formatTanggal(peserta.tanggalSelesai)}</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Riwayat kehadiran terbaru */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Presensi Terbaru</h2>
              <p className="text-xs text-slate-400">6 catatan kehadiran terakhir</p>
            </div>
            <a
              href="/peserta/kehadiran"
              className="text-xs font-medium text-navy-600 hover:text-navy-700"
            >
              Lihat semua &rarr;
            </a>
          </div>
          {recentAttendance.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              Belum ada catatan kehadiran. Lakukan check-in hari ini!
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentAttendance.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">
                      {a.date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {formatWaktu(a.checkIn)} &ndash; {formatWaktu(a.checkOut)}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pengajuan izin terbaru */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Pengajuan Izin Terbaru</h2>
              <p className="text-xs text-slate-400">4 pengajuan terakhir</p>
            </div>
            <a
              href="/peserta/izin"
              className="text-xs font-medium text-navy-600 hover:text-navy-700"
            >
              Lihat semua &rarr;
            </a>
          </div>
          {recentIzin.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              Belum ada pengajuan izin/sakit.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentIzin.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      {r.type === "SAKIT" ? "Sakit" : "Izin"}
                      <span className="text-xs font-normal text-slate-400">
                        {formatTanggal(r.startDate)} &ndash; {formatTanggal(r.endDate)}
                      </span>
                    </div>
                    <div className="mt-0.5 line-clamp-1 max-w-[240px] text-xs text-slate-400">
                      {r.reason}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
