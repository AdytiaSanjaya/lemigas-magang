import Image from "next/image";

export type SidebarRole = "MENTOR" | "ADMIN" | "PENDAFTAR";

const ROLE_BADGE: Record<SidebarRole, { label: string; cls: string }> = {
  MENTOR: {
    label: "Panel Mentor",
    cls: "bg-sky-400/15 text-sky-200 ring-sky-300/25",
  },
  ADMIN: {
    label: "Panel Admin",
    cls: "bg-amber-400/15 text-amber-200 ring-amber-300/25",
  },
  PENDAFTAR: {
    label: "Portal Peserta",
    cls: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/25",
  },
};

export default function SidebarBrand({ role }: { role: SidebarRole }) {
  const badge = ROLE_BADGE[role];

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-navy-700 via-navy-800 to-navy-950 px-5 py-7">
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-navy-500/30 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-3">
        {/* Logo resmi */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
          <Image
            src="/logo-lemigas.png"
            alt="Logo LEMIGAS"
            width={40}
            height={40}
            className="h-9 w-9 object-contain"
            priority
          />
        </div>
        {/* Nama institusi + badge peran */}
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[15px] font-extrabold uppercase tracking-[0.08em] text-white">
            LEMIGAS{" "}
            <span className="bg-gradient-to-r from-sky-300 to-amber-300 bg-clip-text text-transparent">
              MAGANG
            </span>
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-100/80">
            Balai Besar Migas
          </div>
          <span
            className={`mt-1 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${badge.cls}`}
          >
            {badge.label}
          </span>
        </div>
      </div>
    </div>
  );
}
