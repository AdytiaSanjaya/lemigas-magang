import { Loader2 } from "lucide-react";

const CARD_COLORS = [
  "from-white via-sky-50/60 to-sky-100/50",
  "from-white via-amber-50/60 to-amber-100/50",
  "from-white via-emerald-50/60 to-emerald-100/50",
  "from-white via-rose-50/60 to-rose-100/50",
  "from-white via-navy-50/60 to-navy-100/50",
] as const;

export default function DashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat dashboard">
      {/* Banner skeleton */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 p-6 shadow-md sm:p-8">
        <div className="space-y-3">
          <div className="h-5 w-48 rounded-full bg-white/10 animate-pulse" />
          <div className="h-7 w-56 rounded-lg bg-white/10 animate-pulse" />
          <div className="h-4 w-72 rounded bg-white/10 animate-pulse" />
        </div>
      </div>

      {/* Stat cards skeleton — 5 kartu, grid persis seperti layout aktual */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {CARD_COLORS.map((grad, i) => (
          <div
            key={i}
            className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br ${grad} p-5 shadow-sm`}
          >
            <div className="flex items-start justify-between">
              <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200/70" />
              <div className="h-6 w-14 animate-pulse rounded-full bg-slate-200/70" />
            </div>
            <div className="mt-5 h-9 w-12 animate-pulse rounded bg-slate-200/70" />
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300" />
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200/70" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-5 flex h-[260px] items-center justify-center rounded-xl bg-slate-100/70 animate-pulse">
              <Loader2
                className="h-6 w-6 animate-spin text-slate-300"
                aria-hidden="true"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
