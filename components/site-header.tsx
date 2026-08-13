"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import SignOutButton from "@/components/sign-out-button";

// Role pendaftar/peserta magang (nilai literal agar tidak mengimpor modul
// server dari komponen klien).
const ROLE_PENDAFTAR = "PENDAFTAR";

export default function SiteHeader() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const isLoading = status === "loading";
  const [mobileOpen, setMobileOpen] = useState(false);

  const name = session?.user?.name?.trim() ?? "";
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  const rolePanelLink =
    role === "ADMIN"
      ? { href: "/admin/dashboard", label: "Panel Admin" }
      : role === "MENTOR"
        ? { href: "/mentor/peserta", label: "Panel Mentor" }
        : role === ROLE_PENDAFTAR
          ? { href: "/daftar", label: "Daftar Magang" }
          : null;

  const closeMenu = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy-900/95 shadow-lg shadow-navy-950/30 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          onClick={closeMenu}
          className="group flex min-w-0 items-center gap-2.5 sm:gap-3"
        >
          <div className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15 transition group-hover:ring-sky-300/60">
            <Image
              src="/logo-lemigas.png"
              alt="Logo LEMIGAS"
              width={44}
              height={44}
              className="h-9 w-9 object-contain sm:h-11 sm:w-11"
              priority
            />
          </div>
          <span className="flex flex-col whitespace-nowrap leading-tight">
            <span className="text-sm font-extrabold uppercase tracking-[0.08em] text-white sm:text-base sm:tracking-[0.14em]">
              LEMIGAS{" "}
              <span className="bg-gradient-to-r from-sky-300 to-amber-300 bg-clip-text text-transparent">
                MAGANG
              </span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px] sm:tracking-[0.22em]">
              Balai Besar Migas
            </span>
          </span>
        </Link>

        {/* Tombol hamburger menu (hanya tampil di layar kecil). */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 text-slate-200 transition hover:bg-white/10 hover:text-white md:hidden"
        >
          {mobileOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>

        {/* Menu & tombol desktop (sembunyi di layar kecil). */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <Link
            href="/informasi"
            className="rounded-lg px-3 py-2 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
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
              {rolePanelLink && (
                <Link
                  href={rolePanelLink.href}
                  className="ml-2 hidden rounded-lg bg-gradient-to-r from-sky-400 to-cyan-300 px-5 py-2 font-semibold text-navy-900 shadow-md shadow-sky-500/20 transition hover:from-sky-300 hover:to-cyan-200 lg:block"
                >
                  {rolePanelLink.label}
                </Link>
              )}

              {/* Status user yang sedang login: inisial + nama + tombol keluar. */}
              <div className="ml-2 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 text-xs font-bold text-navy-900 sm:h-8 sm:w-8">
                  {initial}
                </span>
                <span className="hidden max-w-[6.5rem] truncate text-xs font-semibold text-slate-200 xl:block">
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

      {/* Dropdown menu mobile. */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-navy-900/95 backdrop-blur md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            <Link
              href="/informasi"
              onClick={closeMenu}
              className="rounded-lg px-3 py-2.5 font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Info Program
            </Link>
            <Link
              href="/cek-status"
              onClick={closeMenu}
              className="rounded-lg px-3 py-2.5 font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Cek Status
            </Link>

            {isLoading ? (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-3" aria-hidden="true">
                <span className="flex select-none items-center justify-center rounded-lg bg-white/10 px-5 py-2.5 font-semibold text-transparent animate-pulse">
                  Daftar Magang Sekarang
                </span>
                <span className="flex select-none items-center justify-center rounded-lg border border-white/15 px-5 py-2.5 font-medium text-transparent animate-pulse">
                  Masuk
                </span>
              </div>
            ) : session?.user ? (
              <>
                {rolePanelLink && (
                  <Link
                    href={rolePanelLink.href}
                    onClick={closeMenu}
                    className="mt-1 rounded-lg bg-gradient-to-r from-sky-400 to-cyan-300 px-3 py-2.5 text-center font-semibold text-navy-900 shadow-md shadow-sky-500/20 transition hover:from-sky-300 hover:to-cyan-200"
                  >
                    {rolePanelLink.label}
                  </Link>
                )}
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 text-xs font-bold text-navy-900">
                    {initial}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">
                    {name || session.user.email}
                  </span>
                  <SignOutButton className="border border-white/15 text-slate-300 hover:bg-white/10 hover:text-white" />
                </div>
              </>
            ) : (
              <div className="mt-1 flex flex-col gap-2 border-t border-white/10 pt-3">
                <Link
                  href="/login?callbackUrl=/daftar"
                  onClick={closeMenu}
                  className="rounded-lg bg-gradient-to-r from-sky-400 to-cyan-300 px-5 py-2.5 text-center font-semibold text-navy-900 shadow-md shadow-sky-500/20 transition hover:from-sky-300 hover:to-cyan-200"
                >
                  Daftar Magang Sekarang
                </Link>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="rounded-lg border border-white/25 px-5 py-2.5 text-center font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  Masuk
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
