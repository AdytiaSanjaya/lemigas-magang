import { requireAdmin } from "@/lib/rbac";
import AdminNav from "@/components/admin/admin-nav";
import SidebarBrand from "@/components/sidebar-brand";
import PanelShell from "@/components/panel-shell";
import { signOut } from "@/lib/auth";
import { LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  const initials = (session.user.name ?? "A")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebar = (
    <>
      <SidebarBrand role="ADMIN" />
      <AdminNav />
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
    <PanelShell sidebar={sidebar} roleLabel="Panel Admin">
      {children}
    </PanelShell>
  );
}