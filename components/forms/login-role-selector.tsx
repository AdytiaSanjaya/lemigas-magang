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
}: {
  callbackUrl: string;
  isGoogleEnabled: boolean;
}) {
  const [selected, setSelected] = useState<Selection>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl });
  }

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
