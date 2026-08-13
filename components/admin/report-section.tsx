"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Filter, FileSpreadsheet, FileText } from "lucide-react";

type Unit = { id: string; nama: string };

type Stats = {
  perBulan: Array<{ bulan: string; menunggu: number; diterima: number; ditolak: number }>;
  perUnit: Array<{ unit: string; jumlah: number }>;
  perStatus: Array<{ status: string; jumlah: number }>;
};

const PIE_COLORS: Record<string, string> = {
  MENUNGGU: "#f59e0b",
  DITERIMA: "#10b981",
  DITOLAK: "#ef4444",
};
const BAR_COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"];

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

  function exportQuery() {
    const qs = new URLSearchParams();
    if (unitId) qs.set("unitId", unitId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return qs.toString();
  }

  return (
    <div className="mt-8">
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
          {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-navy-500 focus:ring-2 focus:ring-navy-100" />
        <span className="text-sm text-slate-400">s.d.</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-navy-500 focus:ring-2 focus:ring-navy-100" />

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
        <p className="mt-6 text-sm text-slate-400">Memuat statistik...</p>
      ) : stats ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Pendaftar per Bulan (6 bln)</h3>
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
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Status Pendaftaran</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stats.perStatus}
                  dataKey="jumlah"
                  nameKey="status"
                  outerRadius={90}
                  label={(entry) => `${entry.name}`}
                >
                  {stats.perStatus.map((s) => (
                    <Cell key={s.status} fill={PIE_COLORS[s.status] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Rincian Status</h3>
            <ul className="divide-y divide-slate-100">
              {stats.perStatus.map((s) => (
                <li key={s.status} className="flex items-center justify-between py-3 text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[s.status] }} />
                    {s.status}
                  </span>
                  <span className="font-semibold text-slate-800">{s.jumlah}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}