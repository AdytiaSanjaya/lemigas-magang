"use client";

import { useEffect, useRef, useState } from "react";
import { X, Mail, Loader2, KeyRound, Copy, Check, Search } from "lucide-react";
import { lupaKodeSchema } from "@/lib/validation/cek-status";
import StatusBadge from "@/components/ui/status-badge";

type LupaKodeResult = {
  noPendaftaran: string;
  nama: string;
  status: string;
  createdAt: string;
  unitMinat: { nama: string } | null;
};

export default function LupaKodeModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [results, setResults] = useState<LupaKodeResult[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Fokus ke input saat modal terbuka + tutup dengan tombol Escape.
  useEffect(() => {
    const input = dialogRef.current?.querySelector<HTMLInputElement>("input");
    input?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Kunci scroll body selama modal terbuka.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setResults(null);
    setCopied(null);

    const parsed = lupaKodeSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors({ email: parsed.error.flatten().fieldErrors.email?.[0] });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const res = await fetch("/api/cek-status/lupa-kode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFormError(body.error ?? "Terjadi kesalahan.");
        return;
      }
      setResults(body.pendaftar as LupaKodeResult[]);
    } catch {
      setFormError("Gagal terhubung ke server. Coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard tidak tersedia — biarkan pengguna menyalin manual
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lupa-kode-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md animate-fade-in-up rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200/80"
      >
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 id="lupa-kode-title" className="text-base font-bold text-zinc-900">
              Cari Kode Pendaftaran
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Masukkan email yang Anda gunakan saat mendaftar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} noValidate>
            {formError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {formError}
              </div>
            )}

            <label className="block text-sm font-medium text-zinc-700">
              Email Pendaftaran
              <span className="relative mt-1.5 block">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden="true"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="nama@email.com"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pr-3.5 pl-10 text-sm text-zinc-900 placeholder:text-zinc-400 transition outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </span>
            </label>
            {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-blue-700 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Mencari...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Cari Kode
                </>
              )}
            </button>
          </form>

          {/* Hasil pencarian */}
          {results && (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {results.length} pendaftaran ditemukan
              </p>
              {results.map((r) => (
                <div
                  key={r.noPendaftaran}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                      <span className="truncate font-mono text-sm font-semibold text-zinc-900">
                        {r.noPendaftaran}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className="truncate">{r.nama}</span>
                      <span className="h-1 w-1 rounded-full bg-zinc-300" aria-hidden="true" />
                      <span className="truncate">{r.unitMinat?.nama ?? "-"}</span>
                    </div>
                    <div className="mt-1.5">
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCode(r.noPendaftaran)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                      copied === r.noPendaftaran
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-zinc-200 bg-white text-zinc-500 hover:border-blue-300 hover:text-blue-600"
                    }`}
                    aria-label={`Salin kode ${r.noPendaftaran}`}
                    title="Salin kode"
                  >
                    {copied === r.noPendaftaran ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}