"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarCheck2, ClipboardPenLine } from "lucide-react";

const links = [
  {
    href: "/peserta/dashboard",
    label: "Dasbor",
    icon: LayoutDashboard,
  },
  {
    href: "/peserta/kehadiran",
    label: "Presensi Kehadiran",
    icon: CalendarCheck2,
  },
  {
    href: "/peserta/izin",
    label: "Izin / Sakit",
    icon: ClipboardPenLine,
  },
];

export default function PesertaNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {links.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-navy-50 text-navy-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span
              className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-colors ${
                active ? "bg-navy-600" : "bg-transparent"
              }`}
            />
            <Icon
              size={18}
              strokeWidth={2}
              className={`shrink-0 transition-colors ${
                active ? "text-navy-600" : "text-slate-400 group-hover:text-slate-600"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
