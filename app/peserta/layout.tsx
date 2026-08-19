import { requirePeserta } from "@/lib/rbac";
import { signOut } from "@/lib/auth";
import { getPesertaBySession } from "@/lib/peserta";
import PesertaNav from "@/components/peserta/peserta-nav";
import SidebarBrand from "@/components/sidebar-brand";
import PanelShell from "@/components/panel-shell";
import { LogOut, Building2, UserRound } from "lucide-react";
import { formatTanggal } from "@/lib/format";

export default async function PesertaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePeserta();
  let peserta: Awaited<ReturnType<typeof getPesertaBySession>> = null;
  try {
    peserta = await getPesertaBySession(session);
  } catch {
    peserta = null;
  }

  const initials = (session.user.name ?? "P")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebar = (
    <>
      <SidebarBrand role="PENDAFTAR" />
      <PesertaNav />

      {peserta && (
        <div className="mx-3 mt-3 rounded-2xl border border-navy-100 bg-navy-50/60 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-navy-700">
            <Building2 size={14} aria-hidden="true" />
            {peserta.unit?.nama ?? "-"}
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-slate-600">
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Mulai</span>
              <span className="font-medium">{formatTanggal(peserta.tanggalMulai)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Selesai</span>
              <span className="font-medium">{formatTanggal(peserta.tanggalSelesai)}</span>
            </div>
            {peserta.mentor && (
              <div className="flex items-center gap-1.5 pt-1 text-navy-700">
                <UserRound size={12} aria-hidden="true" />
                <span className="truncate font-medium">{peserta.mentor.nama}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-auto p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy-500 to-navy-700 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-semibold text-slate-800">
              {session.user.name}
            </div>
            <div className="truncate text-xs text-slate-400">
              {session.user.email}
            </div>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </form>
      </div>
    </>
  );

  return (
    <PanelShell sidebar={sidebar} roleLabel="Portal Peserta">
      {children}
    </PanelShell>
  );
}