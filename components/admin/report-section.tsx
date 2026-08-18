"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Filter, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

type Unit = { id: string; nama: string };

type Stats = {
  perBulan: Array<{
    bulan: string;
    menunggu: number;
    diterima: number;
    ditolak: number;
    pesertaAktif: number;
  }>;
  perUnit: Array<{ unit: string; jumlah: number }>;
  perStatus: Array<{ status: string; jumlah: number }>;
};

// Meta label & warna legenda (mengubah kode status mentah jadi label yang rapi).
const STATUS_META: Record<string, { label: string; color: string; soft: string }> = {
  MENUNGGU: { label: "Menunggu Verifikasi", color: "#F59E0B", soft: "bg-amber-50 text-amber-600" },
  DITERIMA: { label: "Diterima", color: "#10B981", soft: "bg-emerald-50 text-emerald-600" },
  DITOLAK: { label: "Ditolak", color: "#F43F5E", soft: "bg-rose-50 text-rose-600" },
  PESERTA_AKTIF: { label: "Peserta Aktif", color: "#0EA5E9", soft: "bg-sky-50 text-sky-600" },
};

const FALLBACK_META = { label: "Lainnya", color: "#94a3b8", soft: "bg-slate-50 text-slate-600" };

const chartCardClass =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm";

function ChartSkeleton() {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={chartCardClass}>
          <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-5 flex h-[260px] items-center justify-center rounded-xl bg-slate-100/70 animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" aria-hidden="true" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportSection({ units }: { units: Unit[] }) {
  const [unitId, setUnitId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (unitId) qs.set("unitId", unitId);
      const res = await fetch(`/api/report/stats?${qs}`);
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    load();
  }, [load]);

  // Legenda status + persentase dihitung sekali via useMemo agar kalkulasi
  // grafik instan ketika data/divisi berubah (tidak dihitung ulang tiap render).
  const legend = useMemo(() => {
    if (!stats) return [];
    const total = stats.perStatus.reduce((sum, s) => sum + s.jumlah, 0) || 1;
    return stats.perStatus.map((s) => {
      const meta = STATUS_META[s.status] ?? FALLBACK_META;
      return {
        ...s,
        label: meta.label,
        color: meta.color,
        soft: meta.soft,
        pct: Math.round((s.jumlah / total) * 100),
      };
    });
  }, [stats]);

  function exportQuery() {
    const qs = new URLSearchParams();
    if (unitId) qs.set("unitId", unitId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return qs.toString();
  }

  return (
    <div className="mt-8">
      {/* Filter laporan & aksi ekspor */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter size={16} className="text-slate-400" />
          Filter Laporan
        </div>
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
        >
          <option value="">Semua Unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nama}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
        />
        <span className="text-sm text-slate-400">s.d.</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
        />

        <div className="ml-auto flex gap-2">
          <a
            href={`/api/report/excel?${exportQuery()}`}
            className="group inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
          >
            <FileSpreadsheet size={16} className="transition-transform group-hover:scale-110" />
            Export Excel
          </a>
          <a
            href={`/api/report/pdf?${exportQuery()}`}
            className="group inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md"
          >
            <FileText size={16} className="transition-transform group-hover:scale-110" />
            Export PDF
          </a>
        </div>
      </div>

      {loading && !stats ? (
        <ChartSkeleton />
      ) : stats ? (
        <div className="relative">
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className={chartCardClass}>
              <h3 className="mb-4 text-sm font-semibold text-slate-700">
                Pendaftar per Bulan (6 bln)
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={stats.perBulan}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="bulan" fontSize={11} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="menunggu" name="Menunggu" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="diterima" name="Diterima" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="ditolak" name="Ditolak" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="pesertaAktif" name="Peserta Aktif" stroke="#0ea5e9" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={chartCardClass}>
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Pendaftar per Unit</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.perUnit}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="unit" fontSize={11} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="jumlah" name="Jumlah" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={chartCardClass}>
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Status Pendaftaran</h3>
              <div className="flex h-[260px] items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.perStatus}
                      dataKey="jumlah"
                      nameKey="status"
                      label={false}
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={2}
                      strokeWidth={2}
                    >
                      {stats.perStatus.map((s) => (
                        <Cell
                          key={s.status}
                          fill={STATUS_META[s.status]?.color ?? FALLBACK_META.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={chartCardClass}>
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Keterangan Status</h3>
              <div className="flex h-[260px] flex-col justify-center gap-3">
                {legend.map((l) => (
                  <div
                    key={l.status}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2.5 text-sm text-slate-600">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                        style={{ background: l.color }}
                      />
                      <span className="truncate font-medium">{l.label}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold text-slate-800 tabular-nums">{l.jumlah}</span>
                      <span className="w-11 text-right text-xs font-medium text-slate-400 tabular-nums">
                        {l.pct}%
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Overlay transparan saat filter divisi sedang memuat ulang */}
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/55 backdrop-blur-[2px]">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-md">
                <Loader2 className="h-4 w-4 animate-spin text-navy-600" aria-hidden="true" />
                Memperbarui data...
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}