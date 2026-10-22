"use client";

import { useEffect, useRef, useState } from "react";
import { X, Mail, Loader2, Search, CheckCircle2 } from "lucide-react";
import { lupaKodeSchema } from "@/lib/validation/cek-status";

export default function LupaKodeModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Pesan generik sukses dari backend (tanpa daftar noPendaftaran — AUD-22).
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
    setSuccessMessage(null);

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
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        success?: boolean;
      };
      if (!res.ok) {
        setFormError(body.error ?? "Terjadi kesalahan.");
        return;
      }
      // Respons sukses kini hanya berisi pesan generik (tanpa daftar data),
      // sehingga tidak ada lagi looping/pembacaan array dari server.
      setSuccessMessage(
        body.message ??
          "Permintaan diproses. Jika email terdaftar, informasi akan dikirimkan secara internal."
      );
    } catch {
      setFormError("Gagal terhubung ke server. Coba lagi nanti.");
    } finally {
      setLoading(false);
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
          {successMessage ? (
            /* Status sukses: backend hanya mengirim pesan generik — tidak ada
               lagi daftar noPendaftaran yang dirender di sisi klien (AUD-22). */
            <div className="text-center" role="status" aria-live="polite">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
              </div>

              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-semibold leading-relaxed text-emerald-700">
                {successMessage}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                Untuk mengecek status pendaftaran Anda, silakan gunakan menu{" "}
                <span className="font-medium text-zinc-700">Cek Status</span> dengan
                nomor pendaftaran yang Anda simpan.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-zinc-700 active:scale-[0.99]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Tutup
              </button>
            </div>
          ) : (
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
                    Memproses...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Kirim Permintaan
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}