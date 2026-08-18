export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-5" role="status" aria-label="Memuat halaman admin">
      <div className="space-y-2">
        <div className="h-6 w-56 rounded-lg bg-slate-200" />
        <div className="h-3.5 w-32 rounded bg-slate-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="h-3.5 w-24 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 h-4 w-40 rounded bg-slate-200" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
