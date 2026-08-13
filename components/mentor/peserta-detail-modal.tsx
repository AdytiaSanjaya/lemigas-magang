"use client";

import {
  X,
  Building2,
  GraduationCap,
  Mail,
  Phone,
  CalendarRange,
  CalendarCheck2,
  Star,
  ClipboardPenLine,
  User as UserIcon,
  Inbox,
} from "lucide-react";
import type { PesertaRow } from "./peserta-types";

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  HADIR: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", label: "Hadir" },
  IZIN: { cls: "bg-amber-50 text-amber-700 ring-amber-200", label: "Izin" },
  SAKIT: { cls: "bg-rose-50 text-rose-700 ring-rose-200", label: "Sakit" },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function fmtWaktu(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function initials(nama: string): string {
  return nama
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NilaiBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 85
      ? "bg-emerald-500"
      : value >= 70
        ? "bg-sky-500"
        : value >= 55
          ? "bg-amber-500"
          : "bg-rose-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold tabular-nums text-slate-800">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function PesertaDetailModal({
  peserta,
  onClose,
}: {
  peserta: PesertaRow;
  onClose: () => void;
}) {
  const hadirCount = peserta.attendance30.filter((a) => a.status === "HADIR").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail ${peserta.nama}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-navy-700 via-navy-800 to-navy-950 px-6 py-6 text-white">
          <div
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-navy-400/20 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold ring-1 ring-white/20 backdrop-blur-sm">
                {initials(peserta.nama)}
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight">{peserta.nama}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-navy-100">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {peserta.instansi}
                  {peserta.jurusan && <span>&middot; {peserta.jurusan}</span>}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 p-2 ring-1 ring-white/20 transition hover:bg-white/20"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
              <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
              {new Date(peserta.tanggalMulai).toLocaleDateString("id-ID")} &ndash;{" "}
              {new Date(peserta.tanggalSelesai).toLocaleDateString("id-ID")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              Unit {peserta.unitNama}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ring-1 ${
                STATUS_PILL[peserta.statusHariIni]?.cls ??
                "bg-slate-100 text-slate-600 ring-slate-200"
              }`}
            >
              <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
              {STATUS_PILL[peserta.statusHariIni]?.label ?? "Belum Absen"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Profil */}
            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Profil
              </h4>
              <dl className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-400">Asal Instansi</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{peserta.instansi}</dd>
                </div>
                {peserta.jurusan && (
                  <div>
                    <dt className="text-xs text-slate-400">Jurusan / Prodi</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">{peserta.jurusan}</dd>
                  </div>
                )}
                {peserta.jenisKelamin && (
                  <div>
                    <dt className="text-xs text-slate-400">Jenis Kelamin</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {peserta.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="flex items-center gap-1 text-xs text-slate-400">
                    <Mail className="h-3 w-3" aria-hidden="true" /> Email
                  </dt>
                  <dd className="mt-0.5 break-all font-medium text-slate-800">{peserta.email}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-slate-400">
                    <Phone className="h-3 w-3" aria-hidden="true" /> No. HP
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{peserta.noHp}</dd>
                </div>
              </dl>
            </section>

            {/* Rekap presensi 30 hari */}
            <section className="lg:col-span-2">
              <h4 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-2">
                  <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Rekap Presensi 30 Hari Terakhir
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {hadirCount} hadir
                </span>
              </h4>

              <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-200">
                {peserta.attendance30.length === 0 ? (
                  <div className="flex flex-col items-center px-5 py-10 text-center">
                    <Inbox className="h-7 w-7 text-slate-300" aria-hidden="true" />
                    <p className="mt-2 text-sm text-slate-400">
                      Belum ada catatan kehadiran dalam 30 hari terakhir.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5">Tanggal</th>
                        <th className="px-4 py-2.5">Masuk</th>
                        <th className="px-4 py-2.5">Keluar</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {peserta.attendance30.map((a) => {
                        const pill =
                          STATUS_PILL[a.status] ?? {
                            cls: "bg-slate-100 text-slate-600 ring-slate-200",
                            label: a.status,
                          };
                        return (
                          <tr key={a.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 font-medium text-slate-700">
                              {fmtDate(a.date)}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                              {fmtWaktu(a.checkIn)}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                              {fmtWaktu(a.checkOut)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${pill.cls}`}
                              >
                                {pill.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Catatan evaluasi */}
              <h4 className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Star className="h-3.5 w-3.5" aria-hidden="true" />
                Catatan Evaluasi Mentor
              </h4>

              {peserta.evaluasi.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
                  Belum ada penilaian dari mentor.
                </div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {peserta.evaluasi.map((e) => (
                    <li key={e.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <ClipboardPenLine className="h-3.5 w-3.5 text-navy-500" aria-hidden="true" />
                          <span className="font-semibold text-slate-700">
                            {e.dinilaiOlehNama ?? "Mentor"}
                          </span>
                          <span className="text-slate-400">
                            &middot; {new Date(e.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-navy-700">
                          Rata-rata{" "}
                          {Math.round((e.kedisiplinan + e.keaktifan + e.kinerja) / 3)}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <NilaiBar label="Kedisiplinan" value={e.kedisiplinan} />
                        <NilaiBar label="Keaktifan" value={e.keaktifan} />
                        <NilaiBar label="Kinerja" value={e.kinerja} />
                      </div>
                      {e.catatan && (
                        <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm leading-relaxed text-slate-600">
                          {e.catatan}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
