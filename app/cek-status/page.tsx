"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchCheck, Hash, Mail, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { cekStatusSchema } from "@/lib/validation/cek-status";
import { formatTanggal } from "@/lib/format";
import StatusBadge from "@/components/ui/status-badge";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

type StatusData = {
  noPendaftaran: string;
  nama: string;
  status: string;
  catatan?: string | null;
  createdAt: string;
  unitMinat: { nama: string };
  peserta?: { tanggalMulai: string; tanggalSelesai: string } | null;
};

export default function CekStatusPage() {
  const [noPendaftaran, setNoPendaftaran] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ noPendaftaran?: string; email?: string }>({});
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatusData | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setData(null);

    const parsed = cekStatusSchema.safeParse({ noPendaftaran, email });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors({
        noPendaftaran: fe.noPendaftaran?.[0],
        email: fe.email?.[0],
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cek-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noPendaftaran, email }),
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setFormError(body.error ?? "Terjadi kesalahan.");
        return;
      }
      setData(body.pendaftar as StatusData);
    } catch {
      setLoading(false);
      setFormError("Gagal terhubung, coba lagi nanti.");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <SiteHeader />

      <section className="mx-auto flex max-w-xl flex-col px-6 py-16 sm:py-20">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700">
            <SearchCheck className="h-4 w-4" aria-hidden="true" />
            Lacak Lamaran Anda
          </span>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Cek Status Lamaran
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
            Masukkan nomor pendaftaran dan email yang Anda gunakan saat
            mendaftar.
          </p>
        </div>

        {/* Formulir */}
        <div className="mt-8 rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} noValidate>
            {formError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Nomor Pendaftaran
                <span className="relative mt-1.5 block">
                  <Hash
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden="true"
                  />
                  <input
                    value={noPendaftaran}
                    onChange={(e) => { setNoPendaftaran(e.target.value); setErrors((p) => ({ ...p, noPendaftaran: undefined })); }}
                    placeholder="LEMIGAS-2026-0001"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pr-3.5 pl-10 text-sm text-zinc-900 placeholder:text-zinc-400 transition outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </span>
              </label>
              {errors.noPendaftaran && <p className="mt-1.5 text-xs text-red-600">{errors.noPendaftaran}</p>}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700">
                Email
                <span className="relative mt-1.5 block">
                  <Mail
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden="true"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                    placeholder="nama@email.com"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pr-3.5 pl-10 text-sm text-zinc-900 placeholder:text-zinc-400 transition outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </span>
              </label>
              {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-blue-700 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Memeriksa...
                </>
              ) : (
                <>
                  Cek Status
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Hasil */}
        {data && (
          data.status === "DITERIMA" || data.status === "PESERTA_AKTIF" ? (
            <div className="mt-6 animate-fade-in-up overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 shadow-xl shadow-navy-900/20 ring-1 ring-navy-700/60 motion-reduce:animate-none">
              <div
                className="h-1.5 bg-gradient-to-r from-amber-300 via-sky-300 to-amber-300"
                aria-hidden="true"
              />

              <div className="relative px-6 py-8 text-center sm:px-9 sm:py-10">
                <div
                  className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full bg-amber-300/15 blur-3xl"
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl"
                  aria-hidden="true"
                />

                <div className="relative">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 shadow-lg shadow-amber-500/30 ring-4 ring-amber-300/20">
                    <CheckCircle2 className="h-8 w-8 text-navy-900" aria-hidden="true" />
                  </div>

                  <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-300">
                    Pengumuman Resmi
                  </p>
                  <h2 className="mx-auto mt-3 max-w-md text-xl font-bold leading-snug text-white sm:text-2xl">
                    Selamat! Anda telah diterima sebagai Peserta Magang LEMIGAS.
                  </h2>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-300">
                    <span className="font-mono tracking-wider text-sky-200">
                      {data.noPendaftaran}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-slate-500" aria-hidden="true" />
                    <span>{data.unitMinat.nama}</span>
                  </div>
                  {data.peserta && (
                    <p className="mt-2 text-xs text-slate-400">
                      Periode: {formatTanggal(data.peserta.tanggalMulai)} &ndash;{" "}
                      {formatTanggal(data.peserta.tanggalSelesai)}
                    </p>
                  )}

                  <div className="mx-auto mt-7 h-px max-w-xs bg-white/10" aria-hidden="true" />

                  <div className="mx-auto mt-7 max-w-md rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left">
                    <div className="flex items-start gap-3">
                      <ArrowRight
                        className="mt-0.5 h-4 w-4 shrink-0 text-sky-300"
                        aria-hidden="true"
                      />
                      <p className="text-sm leading-6 text-slate-200">
                        Silakan login menggunakan akun Google terdaftar untuk
                        mengakses Portal Presensi Kehadiran dan Pengajuan Izin.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/peserta/dashboard"
                    className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 px-6 py-3.5 text-sm font-bold text-navy-900 shadow-lg shadow-sky-500/25 transition hover:-translate-y-0.5 hover:from-sky-300 hover:to-cyan-200 active:translate-y-0 sm:w-auto"
                  >
                    Login ke Portal Peserta
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-xs text-zinc-400">{data.noPendaftaran}</div>
                <div className="mt-1 text-lg font-semibold text-zinc-900">{data.nama}</div>
              </div>
              <StatusBadge status={data.status} />
            </div>

            <dl className="mt-5 divide-y divide-zinc-100 text-sm">
              <div className="flex justify-between py-2.5">
                <dt className="text-zinc-500">Unit yang diminati</dt>
                <dd className="font-medium text-zinc-800">{data.unitMinat.nama}</dd>
              </div>
              {data.peserta && (
                <>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-zinc-500">Tanggal mulai</dt>
                    <dd className="font-medium text-zinc-800">
                      {new Date(data.peserta.tanggalMulai).toLocaleDateString("id-ID")}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-zinc-500">Tanggal selesai</dt>
                    <dd className="font-medium text-zinc-800">
                      {new Date(data.peserta.tanggalSelesai).toLocaleDateString("id-ID")}
                    </dd>
                  </div>
                </>
              )}
              {data.catatan && (
                <div className="py-2.5">
                  <dt className="text-zinc-500">Catatan</dt>
                  <dd className="mt-1 whitespace-pre-line text-zinc-800">{data.catatan}</dd>
                </div>
              )}
            </dl>
          </div>
          )
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
