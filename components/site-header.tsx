"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import SignOutButton from "@/components/sign-out-button";

// Role pendaftar/peserta magang (nilai literal agar tidak mengimpor modul
// server dari komponen klien).
const ROLE_PENDAFTAR = "PENDAFTAR";

export default function SiteHeader() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const isLoading = status === "loading";

  const name = session?.user?.name?.trim() ?? "";
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy-900/95 shadow-lg shadow-navy-950/30 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15 transition group-hover:ring-sky-300/60">
            <Image
              src="/logo-lemigas.png"
              alt="Logo LEMIGAS"
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
              priority
            />
          </div>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-extrabold uppercase tracking-[0.14em] text-white">
              LEMIGAS{" "}
              <span className="bg-gradient-to-r from-sky-300 to-amber-300 bg-clip-text text-transparent">
                MAGANG
              </span>
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Balai Besar Migas
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/informasi"
            className="hidden rounded-lg px-3 py-2 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white sm:block"
          >
            Info Program
          </Link>
          <Link
            href="/cek-status"
            className="rounded-lg px-3 py-2 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Cek Status
          </Link>

          {isLoading ? (
            /* Placeholder berukuran sama persis dengan tombol "Daftar Magang
               Sekarang" dan "Masuk" (teks transparan) agar layout tidak
               melompat saat status session terkonfirmasi. */
            <div className="flex items-center" aria-hidden="true">
              <span className="flex select-none items-center justify-center rounded-lg bg-white/10 px-5 py-2 font-semibold text-transparent animate-pulse">
                Daftar Magang Sekarang
              </span>
              <span className="ml-1 flex select-none items-center justify-center rounded-lg border border-white/15 px-4 py-2 font-medium text-transparent animate-pulse">
                Masuk
              </span>
            </div>
          ) : session?.user ? (
            <>
              {role === "ADMIN" && (
                <Link
                  href="/admin/dashboard"
                  className="ml-2 hidden rounded-lg bg-gradient-to-r from-sky-400 to-cyan-300 px-5 py-2 font-semibold text-navy-900 shadow-md shadow-sky-500/20 transition hover:from-sky-300 hover:to-cyan-200 lg:block"
                >
                  Panel Admin
                </Link>
              )}
              {role === "MENTOR" && (
                <Link
                  href="/mentor/peserta"
                  className="ml-2 hidden rounded-lg bg-gradient-to-r from-sky-400 to-cyan-300 px-5 py-2 font-semibold text-navy-900 shadow-md shadow-sky-500/20 transition hover:from-sky-300 hover:to-cyan-200 lg:block"
                >
                  Panel Mentor
                </Link>
              )}
              {role === ROLE_PENDAFTAR && (
                <Link
                  href="/daftar"
                  className="ml-2 hidden rounded-lg bg-gradient-to-r from-sky-400 to-cyan-300 px-5 py-2 font-semibold text-navy-900 shadow-md shadow-sky-500/20 transition hover:from-sky-300 hover:to-cyan-200 lg:block"
                >
                  Daftar Magang
                </Link>
              )}

              {/* Status user yang sedang login: inisial + nama + tombol keluar. */}
              <div className="ml-2 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 text-xs font-bold text-navy-900 sm:h-8 sm:w-8">
                  {initial}
                </span>
                <span className="hidden max-w-[6.5rem] truncate text-xs font-semibold text-slate-200 md:block">
                  {name || session.user.email}
                </span>
              </div>
              <SignOutButton className="ml-1 border border-white/15 text-slate-300 hover:bg-white/10 hover:text-white" />
            </>
          ) : (
            <>
              {/* Tombol masuk tetap tampil jelas di kanan atas. */}
              <Link
                href="/login?callbackUrl=/daftar"
                className="rounded-lg bg-gradient-to-r from-sky-400 to-cyan-300 px-5 py-2 font-semibold text-navy-900 shadow-md shadow-sky-500/20 transition hover:from-sky-300 hover:to-cyan-200"
              >
                Daftar Magang Sekarang
              </Link>
              <Link
                href="/login"
                className="ml-1 inline-flex items-center rounded-lg border border-white/25 px-4 py-2 font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                Masuk
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}