"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";

type PanelShellProps = {
  sidebar: React.ReactNode;
  roleLabel: string;
  children: React.ReactNode;
};

export default function PanelShell({ sidebar, roleLabel, children }: PanelShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Header mobile */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu navigasi"
          aria-expanded={open}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 active:scale-95"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo-lemigas.png"
            alt="Logo LEMIGAS"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
          <div className="leading-tight">
            <div className="text-sm font-extrabold uppercase tracking-[0.08em] text-navy-800">
              LEMIGAS{" "}
              <span className="bg-gradient-to-r from-navy-600 to-amber-500 bg-clip-text text-transparent">
                MAGANG
              </span>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {roleLabel}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{sidebar}</div>
      </aside>

      {/* Drawer sidebar mobile */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo-lemigas.png"
                alt="Logo LEMIGAS"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
              <span className="text-sm font-extrabold uppercase tracking-[0.08em] text-navy-800">
                LEMIGAS MAGANG
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu navigasi"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{sidebar}</div>
        </aside>
      </div>

      {/* Konten utama */}
      <main className="w-full min-w-0 max-w-full overflow-x-hidden p-3 sm:p-6 lg:py-8 lg:pl-80 lg:pr-8">
        {children}
      </main>
    </div>
  );
}