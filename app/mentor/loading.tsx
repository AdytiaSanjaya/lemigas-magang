export default function MentorLoading() {
  return (
    <div className="animate-pulse space-y-5" role="status" aria-label="Memuat halaman mentor">
      <div className="h-6 w-48 rounded-lg bg-slate-200" />
      <div className="h-72 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 h-4 w-44 rounded bg-slate-200" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
