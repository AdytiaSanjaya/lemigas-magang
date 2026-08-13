import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import ReportSection from "@/components/admin/report-section";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  GraduationCap,
} from "lucide-react";

export const dynamic = "force-dynamic";

const CARD_STYLES = {
  total: {
    icon: Users,
    iconBg: "bg-navy-50 text-navy-600",
    chip: "bg-navy-50 text-navy-600",
  },
  menunggu: {
    icon: Clock,
    iconBg: "bg-amber-50 text-amber-600",
    chip: "bg-amber-50 text-amber-600",
  },
  diterima: {
    icon: CheckCircle2,
    iconBg: "bg-emerald-50 text-emerald-600",
    chip: "bg-emerald-50 text-emerald-600",
  },
  ditolak: {
    icon: XCircle,
    iconBg: "bg-rose-50 text-rose-600",
    chip: "bg-rose-50 text-rose-600",
  },
  peserta: {
    icon: GraduationCap,
    iconBg: "bg-sky-50 text-sky-600",
    chip: "bg-sky-50 text-sky-600",
  },
} as const;

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [
    totalPendaftar,
    totalMenunggu,
    totalDiterima,
    totalDitolak,
    totalPeserta,
    units,
  ] = await Promise.all([
    prisma.pendaftar.count(),
    prisma.pendaftar.count({ where: { status: "MENUNGGU" } }),
    prisma.pendaftar.count({ where: { status: "DITERIMA" } }),
    prisma.pendaftar.count({ where: { status: "DITOLAK" } }),
    prisma.peserta.count(),
    prisma.unit.findMany({ orderBy: { nama: "asc" } }),
  ]);

  const cards = [
    { key: "total", label: "Total Pendaftar", value: totalPendaftar },
    { key: "menunggu", label: "Menunggu Verifikasi", value: totalMenunggu },
    { key: "diterima", label: "Diterima", value: totalDiterima },
    { key: "ditolak", label: "Ditolak", value: totalDitolak },
    { key: "peserta", label: "Peserta Aktif", value: totalPeserta },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Rekapitulasi data pendaftaran magang/PKL.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const style = CARD_STYLES[card.key];
          const Icon = style.icon;
          return (
            <div
              key={card.key}
              className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.iconBg}`}
                >
                  <Icon size={20} strokeWidth={2} />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.chip}`}
                >
                  {card.label.split(" ")[0]}
                </span>
              </div>
              <div className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                {card.value}
              </div>
              <div className="mt-1 text-sm text-slate-500">{card.label}</div>
            </div>
          );
        })}
      </div>

      <ReportSection units={units.map((u) => ({ id: u.id, nama: u.nama }))} />
    </div>
  );
}