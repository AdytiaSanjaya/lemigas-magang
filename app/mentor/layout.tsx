import { requireMentor } from "@/lib/rbac";
import { signOut } from "@/lib/auth";
import MentorNav from "@/components/mentor/mentor-nav";
import SidebarBrand from "@/components/sidebar-brand";
import { LogOut, Building2 } from "lucide-react";

export default async function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireMentor();

  const initials = (session.user.name ?? "M")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-[100dvh] bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <SidebarBrand role="MENTOR" />

        <MentorNav />

        {session.user.unitNama && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl border border-navy-100 bg-navy-50/60 p-3 text-xs font-semibold text-navy-700">
            <Building2 size={14} aria-hidden="true" />
            <span className="truncate">{session.user.unitNama}</span>
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
              <div className="truncate text-xs text-slate-400">{session.user.email}</div>
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
      </aside>
      <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
