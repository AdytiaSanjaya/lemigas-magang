"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { GraduationCap, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
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
          <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 shadow-sm ring-1 ring-slate-200">
            <LembagasLogo className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Daftar Magang LEMIGAS
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Masuk dengan akun Google untuk melanjutkan pendaftaran magang.
          </p>
          <div className="mx-auto mt-6 h-px w-14 bg-slate-200" />
        </div>

        <button
          type="button"
          disabled={!isGoogleEnabled || googleLoading}
          onClick={handleGoogleLogin}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-6 py-5 text-center transition-all duration-300 cursor-pointer hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
          </div>
          <span className="text-sm font-semibold text-slate-900">
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

  // ── Gateway flow: dual-card role selection ──
  return (
    <>
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 shadow-sm ring-1 ring-slate-200">
          <LembagasLogo className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Pilih Akses Masuk
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Pilih peran Anda untuk melanjutkan ke sistem LEMIGAS Magang.
        </p>
        <div className="mx-auto mt-6 h-px w-14 bg-slate-200" />
      </div>

      {/* Role Cards */}
      <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
        {/* Card: Peserta Magang */}
        <button
          type="button"
          disabled={selected === "admin"}
          onClick={() => {
            if (isGoogleEnabled) {
              setSelected("peserta");
              handleGoogleLogin();
            }
          }}
          className={`group relative flex flex-col items-center rounded-2xl border-2 px-5 py-8 text-center transition-all duration-300 cursor-pointer ${
            selected === "peserta"
              ? "border-blue-600 bg-blue-50 shadow-lg shadow-blue-500/10"
              : selected === "admin"
                ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-40"
                : "border-slate-200 bg-white hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/10"
          }`}
        >
          <div
            className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300 ${
              selected === "peserta"
                ? "bg-blue-100 text-blue-600"
                : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
            }`}
          >
            {googleLoading ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <GraduationCap className="h-7 w-7" />
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900">Peserta Magang</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Masuk menggunakan akun Google yang telah terdaftar.
          </p>
          {selected === "peserta" && (
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Mengarahkan ke Google...
            </span>
          )}
        </button>

        {/* Card: Admin / Mentor */}
        <button
          type="button"
          disabled={selected === "peserta"}
          onClick={() => setSelected(selected === "admin" ? null : "admin")}
          className={`group relative flex flex-col items-center rounded-2xl border-2 px-5 py-8 text-center transition-all duration-300 cursor-pointer ${
            selected === "admin"
              ? "border-blue-600 bg-blue-50 shadow-lg shadow-blue-500/10"
              : selected === "peserta"
                ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-40"
                : "border-slate-200 bg-white hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/10"
          }`}
        >
          <div
            className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300 ${
              selected === "admin"
                ? "bg-blue-100 text-blue-600"
                : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
            }`}
          >
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Admin / Mentor</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Masuk menggunakan kredensial instansi.
          </p>
          {selected !== "admin" && (
            <span className="mt-4 text-xs font-medium text-slate-400 group-hover:text-blue-600">
              Klik untuk membuka form
            </span>
          )}
          {selected === "admin" && (
            <span className="mt-4 text-xs font-medium text-blue-600">
              Form kredensial di bawah
            </span>
          )}
        </button>
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
