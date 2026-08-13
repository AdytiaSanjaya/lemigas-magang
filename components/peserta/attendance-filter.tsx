"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

function monthOptions(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${y}-${m}`);
  }
  return out;
}

function label(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export default function AttendanceFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("month") ?? "";
  const [value, setValue] = useState(current);

  useEffect(() => {
    setValue(current);
  }, [current]);

  function onChange(month: string) {
    setValue(month);
    const next = new URLSearchParams(params.toString());
    next.set("month", month);
    next.delete("page");
    router.push(`/peserta/kehadiran?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
        aria-label="Filter bulan"
      >
        {monthOptions().map((m) => (
          <option key={m} value={m}>
            {label(m)}
          </option>
        ))}
      </select>
    </div>
  );
}
