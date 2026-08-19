import { requireMentor } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { todayStringWib, toUtcDate } from "@/lib/dates";
import Link from "next/link";
import PesertaTable from "@/components/mentor/peserta-table";
import {
  Users,
  CalendarCheck2,
  ClipboardCheck,
  Building2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import type { PesertaRow, StatusHariIni } from "@/components/mentor/peserta-types";

export const dynamic = "force-dynamic";

const DAY_MS = 86400000;

export default async function MentorPesertaPage() {
  const session = await requireMentor();
  const unitId = session.user.unitId;

  if (!unitId) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Building2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Unit Belum Dipetakan</h1>
        <p className="mt-2 text-sm text-slate-500">
          Akun mentor Anda belum dipetakan ke unit tertentu. Hubungi administrator.
        </p>
      </div>
    );
  }

  const peserta = await prisma.peserta
    .findMany({
      where: { mentorId: session.user.id },
      include: {
        pendaftar: {
          select: {
            nama: true,
            asalInstansi: true,
            jurusan: true,
            jenisKelamin: true,
            email: true,
            noHp: true,
          },
        },
        unit: { select: { nama: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => []);

  const pesertaIds = peserta.map((p) => p.id);
  const emails = peserta
    .map((p) => p.pendaftar?.email.toLowerCase().trim() ?? "")
    .filter(Boolean);

  // Attendance dihubungkan lewat akun User (email sama dengan email pendaftar).
  const users = await prisma.user
    .findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true },
    })
    .catch(() => []);
  const userIds = users.map((u) => u.id);
  const today = toUtcDate(todayStringWib());

  // Query pendukung dibungkus catch agar halaman tetap render (tabel kosong)
  // bila terjadi error query atau mentor belum memiliki peserta bimbingan.
  const [attendanceToday, leaveToday, attendance30, evaluasiList, pendingIzin] =
    await Promise.all([
      prisma.attendance
        .findMany({
          where: { userId: { in: userIds }, date: today },
          select: {
            id: true,
            userId: true,
            status: true,
            checkIn: true,
            checkOut: true,
          },
        })
        .catch(() => []),
      prisma.leaveRequest
        .findMany({
          where: {
            userId: { in: userIds },
            status: "APPROVED",
            startDate: { lte: today },
            endDate: { gte: today },
          },
          select: { userId: true, type: true },
        })
        .catch(() => []),
      prisma.attendance
        .findMany({
          where: {
            userId: { in: userIds },
            date: { gte: toUtcDate(todayStringWib(new Date(Date.now() - 29 * DAY_MS))) },
          },
          select: {
            id: true,
            userId: true,
            date: true,
            status: true,
            checkIn: true,
            checkOut: true,
          },
          orderBy: { date: "desc" },
        })
        .catch(() => []),
      prisma.evaluasi
        .findMany({
          where: { pesertaId: { in: pesertaIds } },
          include: { dinilaiOleh: { select: { nama: true } } },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => []),
      prisma.leaveRequest
        .count({ where: { user: { email: { in: emails } }, status: "PENDING" } })
        .catch(() => 0),
    ]);

  const userByEmail = new Map(
    users.map((u) => [u.email.toLowerCase().trim(), u.id] as const)
  );
  const attTodayByUser = new Map(attendanceToday.map((a) => [a.userId, a] as const));
  const leaveTodayByUser = new Map(leaveToday.map((l) => [l.userId, l] as const));

  const rows: PesertaRow[] = peserta.map((p) => {
    const userId = userByEmail.get(p.pendaftar?.email.toLowerCase().trim() ?? "");
    const attToday = userId ? attTodayByUser.get(userId) : undefined;
    const leaveToday = userId ? leaveTodayByUser.get(userId) : undefined;

    let statusHariIni: StatusHariIni;
    if (attToday) {
      statusHariIni = attToday.status as StatusHariIni;
    } else if (leaveToday) {
      statusHariIni = leaveToday.type as StatusHariIni;
    } else {
      statusHariIni = "BELUM ABSEN";
    }

    // Progress masa magang (null-safe bila tanggal belum diisi).
    const mulai = new Date(p.tanggalMulai);
    mulai.setHours(0, 0, 0, 0);
    const selesai = new Date(p.tanggalSelesai);
    selesai.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, Math.round((selesai.getTime() - mulai.getTime()) / DAY_MS) + 1);
    const hariBerjalan = Math.max(0, Math.round((now.getTime() - mulai.getTime()) / DAY_MS) + 1);
    const progress = Math.min(100, Math.round((hariBerjalan / totalDays) * 100));

    return {
      id: p.id,
      nama: p.pendaftar?.nama ?? "-",
      instansi: p.pendaftar?.asalInstansi ?? "-",
      jurusan: p.pendaftar?.jurusan ?? null,
      jenisKelamin: p.pendaftar?.jenisKelamin ?? null,
      email: p.pendaftar?.email ?? "",
      noHp: p.pendaftar?.noHp ?? "",
      unitNama: p.unit?.nama ?? "-",
      tanggalMulai: p.tanggalMulai.toISOString(),
      tanggalSelesai: p.tanggalSelesai.toISOString(),
      progress,
      statusHariIni,
      checkIn: attToday?.checkIn?.toISOString() ?? null,
      checkOut: attToday?.checkOut?.toISOString() ?? null,
      attendance30: attendance30
        .filter((a) => a.userId === userId)
        .slice(0, 30)
        .map((a) => ({
          id: a.id,
          date: a.date.toISOString(),
          status: a.status,
          checkIn: a.checkIn?.toISOString() ?? null,
          checkOut: a.checkOut?.toISOString() ?? null,
        })),
      evaluasi: evaluasiList
        .filter((e) => e.pesertaId === p.id)
        .map((e) => ({
          id: e.id,
          kedisiplinan: e.kedisiplinan,
          keaktifan: e.keaktifan,
          kinerja: e.kinerja,
          catatan: e.catatan,
          createdAt: e.createdAt.toISOString(),
          dinilaiOlehNama: e.dinilaiOleh?.nama ?? null,
        })),
    };
  });

  const hadirToday = rows.filter((r) => r.statusHariIni === "HADIR").length;
  const sudahAbsen = rows.filter((r) => r.statusHariIni !== "BELUM ABSEN").length;

  const statCards = [
    {
      key: "total",
      icon: Users,
      label: "Total Peserta Bimbingan",
      value: String(rows.length),
      iconBg: "bg-navy-50 text-navy-600",
      chip: "bg-navy-50 text-navy-600",
      chipText: "Peserta",
      sub: `di unit ${session.user.unitNama ?? "-"}`,
    },
    {
      key: "kehadiran",
      icon: CalendarCheck2,
      label: "Kehadiran Hari Ini",
      value: `${hadirToday}/${rows.length || 0}`,
      iconBg: "bg-emerald-50 text-emerald-600",
      chip: "bg-emerald-50 text-emerald-600",
      chipText: "Hari ini",
      sub: `${sudahAbsen} peserta sudah absen (hadir/izin/sakit)`,
    },
    {
      key: "izin",
      icon: ClipboardCheck,
      label: "Permohonan Izin Menunggu",
      value: String(pendingIzin),
      iconBg: "bg-amber-50 text-amber-600",
      chip: "bg-amber-50 text-amber-600",
      chipText: "Perlu tindak",
      sub: "Tunggu persetujuan Anda",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-700 via-navy-800 to-navy-950 px-6 py-7 text-white shadow-lg shadow-navy-900/10 md:px-8">
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-navy-400/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-navy-300/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-navy-200">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Panel Mentor &middot; {session.user.unitNama ?? "Unit"}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Peserta Bimbingan
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-navy-100/90">
              Pantau kehadiran, progres masa magang, dan berikan penilaian untuk peserta
              yang Anda bimbing.
            </p>
          </div>

          {pendingIzin > 0 && (
            <Link
              href="/mentor/izin"
              className="group inline-flex shrink-0 items-center gap-3 rounded-2xl bg-white/10 px-5 py-3 ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/20"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                <ClipboardCheck className="h-4.5 w-4.5" aria-hidden="true" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-navy-900">
                  {pendingIzin}
                </span>
              </span>
              <span className="text-left leading-tight">
                <span className="block text-sm font-semibold">Izin menunggu persetujuan</span>
                <span className="block text-xs text-navy-100">
                  Tinjau sekarang <ChevronRight className="inline h-3 w-3" aria-hidden="true" />
                </span>
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isIzin = card.key === "izin";
          const inner = (
            <div
              className={`flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                isIzin ? "hover:border-amber-300" : "hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}
                >
                  <Icon size={20} strokeWidth={2} aria-hidden="true" />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${card.chip}`}
                >
                  {card.chipText}
                </span>
              </div>
              <div className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                {card.value}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-600">{card.label}</div>
              <div className="mt-0.5 text-xs text-slate-400">{card.sub}</div>
            </div>
          );
          return isIzin ? (
            <Link key={card.key} href="/mentor/izin" className="group block h-full">
              {inner}
            </Link>
          ) : (
            <div key={card.key}>{inner}</div>
          );
        })}
      </div>

      {/* Table */}
      <PesertaTable peserta={rows} />
    </div>
  );
}
