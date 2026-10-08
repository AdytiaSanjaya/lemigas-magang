"use client";

import { useEffect, useMemo } from "react";
import AttendanceFilter from "@/components/peserta/attendance-filter";
import StatusBadge from "@/components/ui/status-badge";
import Pagination from "@/components/ui/pagination";
import { formatWaktu, toUtcDate, utcDateString } from "@/lib/dates";
import { CalendarCheck2, History } from "lucide-react";
import {
  usePresensiOptimistic,
  type PendingPresensi,
} from "@/components/peserta/presensi-optimistic";

export type AttendanceRow = {
  id: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
};

interface AttendanceHistoryProps {
  records: AttendanceRow[];
  total: number;
  page: number;
  totalPages: number;
  /** Filter bulan aktif "YYYY-MM" (dipakai untuk membatasi baris optimistic). */
  month: string;
}

/**
 * Sisipkan baris optimistic ke daftar riwayat:
 * - check-in hari ini (record baru)  -> disisipkan di atas (urutan date desc)
 * - check-out hari ini (record ada)  -> waktu check-out-nya dilengkapi
 * Baris hanya disisipkan bila pengguna sedang melihat bulan tsb di halaman 1,
 * agar riwayat bulan lain tidak ikut tercampur.
 */
function mergePending(
  rows: AttendanceRow[],
  pending: PendingPresensi | null,
  month: string,
  page: number
): { rows: AttendanceRow[]; added: boolean } {
  if (!pending || page !== 1 || !pending.date.startsWith(month)) {
    return { rows, added: false };
  }

  const idx = rows.findIndex((r) => utcDateString(r.date) === pending.date);
  if (idx >= 0) {
    const current = rows[idx];
    const merged = [...rows];
    merged[idx] = {
      ...current,
      checkIn: pending.checkIn ? new Date(pending.checkIn) : current.checkIn,
      checkOut: pending.checkOut ? new Date(pending.checkOut) : current.checkOut,
    };
    return { rows: merged, added: false };
  }

  return {
    rows: [
      {
        id: `optimistic-${pending.date}-${pending.action}`,
        date: toUtcDate(pending.date),
        checkIn: pending.checkIn ? new Date(pending.checkIn) : null,
        checkOut: pending.checkOut ? new Date(pending.checkOut) : null,
        status: "HADIR",
      },
      ...rows,
    ],
    added: true,
  };
}

function durasiLabel(checkIn: Date, checkOut: Date): string {
  const ms = Math.max(0, checkOut.getTime() - checkIn.getTime());
  const jam = Math.floor(ms / 3600000);
  const menit = Math.floor((ms % 3600000) / 60000);
  return `${jam}j ${menit}m`;
}

export default function AttendanceHistory({
  records,
  total,
  page,
  totalPages,
  month,
}: AttendanceHistoryProps) {
  const { pending, setPending } = usePresensiOptimistic();

  // Data server sudah menyusul (router.refresh() selesai) — lepas baris
  // optimistic karena record aslinya kini dipakai untuk dirender.
  useEffect(() => {
    if (!pending) return;
    const sudahTerkirim = records.some(
      (r) =>
        utcDateString(r.date) === pending.date &&
        (pending.action === "CHECK_IN" ? !!r.checkIn : !!r.checkOut)
    );
    if (sudahTerkirim) setPending(null);
  }, [records, pending, setPending]);

  const { rows, added } = useMemo(
    () => mergePending(records, pending, month, page),
    [records, pending, month, page]
  );
  const displayTotal = total + (added ? 1 : 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-800">Riwayat Kehadiran</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {displayTotal} catatan
          </span>
        </div>
        <AttendanceFilter />
      </div>

      <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[500px] text-left text-sm">
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
            {rows.length === 0 ? (
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
              rows.map((a) => (
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
  );
}
