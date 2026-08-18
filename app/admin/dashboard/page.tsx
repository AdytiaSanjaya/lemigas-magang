import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import ReportSection from "@/components/admin/report-section";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  GraduationCap,
  CalendarDays,
} from "lucide-react";

export const dynamic = "force-dynamic";

// Tema visual kartu statistik: gradient halus + ikon pill "menyala" per status
// (skema warna institusi: Deep Navy, Slate Blue, Emerald & aksen status).
const CARD_STYLES = {
  total: {
    icon: Users,
    iconBg: "bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100",
    glow: "shadow-[0_10px_24px_-10px_rgba(14,165,233,0.5)]",
    grad: "bg-gradient-to-br from-white via-sky-50/60 to-sky-100/50",
    chip: "bg-sky-50 text-sky-600",
    dot: "bg-sky-500",
  },
  menunggu: {
    icon: Clock,
    iconBg: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100",
    glow: "shadow-[0_10px_24px_-10px_rgba(245,158,11,0.5)]",
    grad: "bg-gradient-to-br from-white via-amber-50/60 to-amber-100/50",
    chip: "bg-amber-50 text-amber-600",
    dot: "bg-amber-500",
  },
  diterima: {
    icon: CheckCircle2,
    iconBg: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100",
    glow: "shadow-[0_10px_24px_-10px_rgba(16,185,129,0.5)]",
    grad: "bg-gradient-to-br from-white via-emerald-50/60 to-emerald-100/50",
    chip: "bg-emerald-50 text-emerald-600",
    dot: "bg-emerald-500",
  },
  ditolak: {
    icon: XCircle,
    iconBg: "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-100",
    glow: "shadow-[0_10px_24px_-10px_rgba(244,63,94,0.5)]",
    grad: "bg-gradient-to-br from-white via-rose-50/60 to-rose-100/50",
    chip: "bg-rose-50 text-rose-600",
    dot: "bg-rose-500",
  },
  peserta: {
    icon: GraduationCap,
    iconBg: "bg-navy-50 text-navy-600 ring-1 ring-inset ring-navy-100",
    glow: "shadow-[0_10px_24px_-10px_rgba(30,76,143,0.5)]",
    grad: "bg-gradient-to-br from-white via-navy-50/60 to-navy-100/50",
    chip: "bg-navy-50 text-navy-600",
    dot: "bg-navy-500",
  },
} as const;

export default async function AdminDashboardPage() {
  // Autentikasi session admin (getServerSession via auth()): jika session
  // invalid/role bukan ADMIN langsung redirect ke /login.
  await requireAdmin();

  // Data fetching paralel (Promise.all) dengan fallback aman: jika salah satu
  // query Prisma bermasalah, halaman tetap render dengan data kosong.
  let data: {
    totalPendaftar: number;
    totalMenunggu: number;
    totalDiterima: number;
    totalDitolak: number;
    totalPeserta: number;
    units: Array<{ id: string; nama: string }>;
  } = {
    totalPendaftar: 0,
    totalMenunggu: 0,
    totalDiterima: 0,
    totalDitolak: 0,
    totalPeserta: 0,
    units: [],
  };

  try {
    const [totalPendaftar, totalMenunggu, totalDiterima, totalDitolak, totalPeserta, units] =
      await Promise.all([
        prisma.pendaftar.count(),
        prisma.pendaftar.count({ where: { status: "MENUNGGU" } }),
        prisma.pendaftar.count({ where: { status: "DITERIMA" } }),
        prisma.pendaftar.count({ where: { status: "DITOLAK" } }),
        prisma.peserta.count(),
        prisma.unit.findMany({ orderBy: { nama: "asc" } }),
      ]);
    data = {
      totalPendaftar,
      totalMenunggu,
      totalDiterima,
      totalDitolak,
      totalPeserta,
      units,
    };
  } catch {
    // Abaikan error: halaman dashboard tetap tampil dengan nilai fallback di atas.
  }

  const cards = [
    { key: "total", label: "Total Pendaftar", value: data.totalPendaftar },
    { key: "menunggu", label: "Menunggu Verifikasi", value: data.totalMenunggu },
    { key: "diterima", label: "Diterima", value: data.totalDiterima },
    { key: "ditolak", label: "Ditolak", value: data.totalDitolak },
    { key: "peserta", label: "Peserta Aktif", value: data.totalPeserta },
  ] as const;

  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Banner header gradien (Corporate Deep Navy) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 p-6 shadow-md sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-400/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-200 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Rekapitulasi Pendaftaran
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Dashboard Operasional
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-300">
              Pantau antrean verifikasi, peserta diterima, dan peserta aktif magang/PKL
              secara ringkas dalam satu layar.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-200 backdrop-blur">
            <CalendarDays className="h-4 w-4 text-sky-300" aria-hidden="true" />
            <span className="text-sm font-medium">{todayLabel}</span>
          </div>
        </div>
      </div>

      {/* Kartu ringkasan statistik */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const style = CARD_STYLES[card.key];
          const Icon = style.icon;
          return (
            <div
              key={card.key}
              className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md ${style.grad}`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/40 blur-2xl"
              />
              <div className="relative flex items-start justify-between">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${style.iconBg} ${style.glow}`}
                >
                  <Icon size={22} strokeWidth={2.2} />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.chip}`}
                >
                  {card.label.split(" ")[0]}
                </span>
              </div>
              <div className="relative mt-5 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {card.value}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                {card.label}
              </div>
            </div>
          );
        })}
      </div>

      <ReportSection units={data.units.map((u) => ({ id: u.id, nama: u.nama }))} />
    </div>
  );
}