"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Star,
  MessageCircle,
  Mail,
  Users,
  Inbox,
  X,
  Building2,
} from "lucide-react";
import PesertaDetailModal from "./peserta-detail-modal";
import PesertaPenilaianModal from "./peserta-penilaian-modal";
import type { PesertaRow, StatusHariIni } from "./peserta-types";

const STATUS_OPTIONS: Array<{ value: "ALL" | StatusHariIni; label: string }> = [
  { value: "ALL", label: "Semua Status" },
  { value: "HADIR", label: "Hadir" },
  { value: "IZIN", label: "Izin" },
  { value: "SAKIT", label: "Sakit" },
  { value: "BELUM ABSEN", label: "Belum Absen" },
];

const STATUS_BADGE: Record<StatusHariIni, { cls: string; label: string; dot: string }> = {
  HADIR: {
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "Hadir",
    dot: "bg-emerald-500",
  },
  IZIN: { cls: "bg-amber-50 text-amber-700 ring-amber-200", label: "Izin", dot: "bg-amber-500" },
  SAKIT: { cls: "bg-rose-50 text-rose-700 ring-rose-200", label: "Sakit", dot: "bg-rose-500" },
  "BELUM ABSEN": {
    cls: "bg-slate-100 text-slate-600 ring-slate-200",
    label: "Belum Absen",
    dot: "bg-slate-400",
  },
};

function initials(nama: string): string {
  return nama
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatWaktu(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PesertaTable({ peserta }: { peserta: PesertaRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | StatusHariIni>("ALL");
  const [detail, setDetail] = useState<PesertaRow | null>(null);
  const [penilaian, setPenilaian] = useState<PesertaRow | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return peserta.filter((p) => {
      const matchQ =
        !term ||
        p.nama.toLowerCase().includes(term) ||
        p.instansi.toLowerCase().includes(term) ||
        (p.jurusan ?? "").toLowerCase().includes(term);
      const matchStatus = status === "ALL" || p.statusHariIni === status;
      return matchQ && matchStatus;
    });
  }, [peserta, q, status]);

  const hadirCount = peserta.filter((p) => p.statusHariIni === "HADIR").length;
  const izinCount = peserta.filter(
    (p) => p.statusHariIni === "IZIN" || p.statusHariIni === "SAKIT"
  ).length;
  const absenCount = peserta.filter((p) => p.statusHariIni === "BELUM ABSEN").length;

  function toggleMenu(id: string) {
    setMenuOpen((cur) => (cur === id ? null : id));
  }

  function closeMenu() {
    setMenuOpen(null);
  }

  return (
    <div className="space-y-5">
      {/* Search & filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, instansi, atau jurusan..."
            aria-label="Cari peserta"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Bersihkan pencarian"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "ALL" | StatusHariIni)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            aria-label="Filter status kehadiran"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ringkasan chip */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-medium text-slate-600 ring-1 ring-slate-200">
          <Users className="h-3.5 w-3.5 text-navy-500" aria-hidden="true" />
          {peserta.length} peserta
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {hadirCount} hadir
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700 ring-1 ring-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {izinCount} izin/sakit
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          {absenCount} belum absen
        </span>
        <span className="ml-auto text-slate-400">
          Menampilkan <span className="font-semibold text-slate-600">{filtered.length}</span> dari{" "}
          {peserta.length} peserta
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Peserta</th>
                <th className="px-5 py-3.5">Status Hari Ini</th>
                <th className="px-5 py-3.5">Progress Masa Magang</th>
                <th className="px-5 py-3.5">Periode</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center">
                      <Inbox className="h-8 w-8 text-slate-300" aria-hidden="true" />
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        {peserta.length === 0
                          ? "Belum ada peserta bimbingan."
                          : "Tidak ada peserta yang cocok dengan pencarian."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const badge = STATUS_BADGE[p.statusHariIni];
                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-slate-50/60">
                      {/* Peserta */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-500 to-navy-700 text-sm font-bold text-white">
                              {initials(p.nama)}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${badge.dot}`}
                              aria-hidden="true"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-semibold text-slate-800">
                              <span className="truncate">{p.nama}</span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400">
                              <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                              <span className="truncate">
                                {p.instansi}
                                {p.jurusan ? ` \u00b7 ${p.jurusan}` : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status hari ini */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badge.cls}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                        {p.statusHariIni === "HADIR" && (
                          <div className="mt-1 font-mono text-[11px] text-slate-400">
                            {formatWaktu(p.checkIn)}&ndash;{formatWaktu(p.checkOut)}
                          </div>
                        )}
                      </td>

                      {/* Progress */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-28 shrink-0">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-navy-500 to-navy-700 transition-all duration-500"
                                style={{ width: `${p.progress}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-bold tabular-nums text-navy-700">
                            {p.progress}%
                          </span>
                        </div>
                      </td>

                      {/* Periode */}
                      <td className="px-5 py-3.5">
                        <div className="text-xs text-slate-600">
                          <span className="font-medium text-slate-700">
                            {new Date(p.tanggalMulai).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-slate-300"> &ndash; </span>
                          <span className="font-medium text-slate-700">
                            {new Date(p.tanggalSelesai).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-3.5">
                        <div className="relative flex justify-end">
                          <button
                            type="button"
                            onClick={() => toggleMenu(p.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-navy-300 hover:bg-navy-50 hover:text-navy-700 active:scale-[0.97]"
                            aria-expanded={menuOpen === p.id}
                            aria-haspopup="menu"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                            Aksi
                          </button>

                          {menuOpen === p.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={closeMenu}
                                aria-hidden="true"
                              />
                              <div
                                role="menu"
                                className="absolute right-0 top-full z-40 mt-1.5 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl"
                              >
                                <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                  {p.nama}
                                </div>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    closeMenu();
                                    setDetail(p);
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-navy-50 hover:text-navy-700"
                                >
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-50 text-navy-600">
                                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                  </span>
                                  Detail &amp; Presensi
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    closeMenu();
                                    setPenilaian(p);
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-amber-50 hover:text-amber-700"
                                >
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                    <Star className="h-3.5 w-3.5" aria-hidden="true" />
                                  </span>
                                  Berikan Penilaian
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                  Hubungi
                                </div>
                                <a
                                  href={`https://wa.me/${p.noHp.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  role="menuitem"
                                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                                >
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                  </span>
                                  WhatsApp
                                </a>
                                <a
                                  href={`mailto:${p.email}`}
                                  role="menuitem"
                                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-sky-50 hover:text-sky-700"
                                >
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                                  </span>
                                  Email
                                </a>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail && <PesertaDetailModal peserta={detail} onClose={() => setDetail(null)} />}
      {penilaian && (
        <PesertaPenilaianModal peserta={penilaian} onClose={() => setPenilaian(null)} />
      )}
    </div>
  );
}
