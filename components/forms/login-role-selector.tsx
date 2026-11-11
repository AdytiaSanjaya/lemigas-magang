"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import LembagasLogo from "@/components/lemigas-logo";
import LoginForm from "@/components/forms/login-form";

type Selection = null | "peserta" | "admin";

export default function LoginRoleSelector({
  callbackUrl,
  isGoogleEnabled,
  mode = "gateway",
}: {
  callbackUrl: string;
  isGoogleEnabled: boolean;
  mode?: "gateway" | "registration";
}) {
  const [selected, setSelected] = useState<Selection>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl });
  }

  // ── Registration flow: single-card, no Admin option ──
  if (mode === "registration") {
    return (
      <>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-slate-50 shadow-sm ring-1 ring-slate-200">
            <LembagasLogo className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mt-6">
            Daftar Magang LEMIGAS
          </h1>
          <p className="text-sm text-gray-500 text-center mt-2">
            Masuk dengan akun Google untuk melanjutkan pendaftaran magang.
          </p>
        </div>

        <button
          type="button"
          disabled={!isGoogleEnabled || googleLoading}
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-md py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mt-8 shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          <span>
            {googleLoading ? "Mengarahkan ke Google..." : "Masuk dengan Google"}
          </span>
        </button>

        {!isGoogleEnabled && (
          <p className="mt-4 text-center text-xs text-red-500">
            Login Google belum tersedia. Hubungi administrator.
          </p>
        )}
      </>
    );
  }

  // ── Gateway flow: kartu pilihan peran ──
  return (
    <>
      {/* Header — rata kiri */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Selamat Datang
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Pilih peran Anda untuk melanjutkan ke sistem LEMIGAS Magang.
        </p>
      </div>

      {/* Pilihan peran */}
      <div className="mt-7 flex flex-col gap-4">
        {/* Card 1 — Peserta Magang (Google) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-yellow-400/15 text-yellow-600"
            >
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">
                Peserta Magang
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Gunakan akun Google yang telah terdaftar.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!isGoogleEnabled || googleLoading || selected === "admin"}
            onClick={() => {
              if (isGoogleEnabled) {
                setSelected("peserta");
                handleGoogleLogin();
              }
            }}
            className="mt-5 flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-slate-900 shadow-md shadow-yellow-500/20 transition-all hover:-translate-y-0.5 hover:bg-yellow-300 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-yellow-400"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            <span>
              {googleLoading ? "Mengarahkan ke Google..." : "Masuk dengan Google"}
            </span>
          </button>

          {!isGoogleEnabled && (
            <p className="mt-3 text-center text-xs text-red-500">
              Login Google belum tersedia. Hubungi administrator.
            </p>
          )}
        </div>

        {/* Card 2 — Admin / Mentor (Kredensial) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-600"
            >
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">
                Admin / Mentor
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Gunakan kredensial instansi.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={selected === "peserta"}
            onClick={() => setSelected(selected === "admin" ? null : "admin")}
            aria-expanded={selected === "admin"}
            className={`mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              selected === "admin"
                ? "border-slate-900 bg-white text-slate-900"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            {selected === "admin"
              ? "Sembunyikan Form Kredensial"
              : "Masuk dengan Kredensial"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Credential Form — muncul dengan transisi halus */}
      <div
        className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${
          selected === "admin"
            ? "mt-6 max-h-[600px] opacity-100"
            : "mt-0 max-h-0 opacity-0"
        }`}
      >
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-xl sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Masuk sebagai Admin / Mentor</h3>
              <p className="text-xs text-slate-500">Gunakan akun instansi yang telah terdaftar.</p>
            </div>
          </div>
          <LoginForm />
        </div>
      </div>
    </>
  );
}
