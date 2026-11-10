import { Lock } from "lucide-react";

// Kartu penutup (offboarding) untuk peserta berstatus "Selesai": menggantikan
// form presensi/izin secara penuh karena akses fitur tersebut sudah ditutup.
// Komponen presentasional (server) tanpa query — hanya membaca props/teks.
export default function MagangSelesaiCard() {
  return (
    <section className="w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div className="relative overflow-hidden bg-blue-950 px-6 py-12 text-center text-white sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-yellow-400/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-2xl">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl ring-1 ring-white/15">
            <span aria-hidden="true">🎉</span>
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            Perjalanan Magang Selesai!
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Terima kasih atas dedikasi dan kontribusi Anda di LEMIGAS. Akses untuk
            fitur ini telah ditutup secara permanen.
          </p>
          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-white/15">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Akses Ditutup
          </span>
        </div>
      </div>
      <div className="px-6 py-4 text-center text-xs leading-relaxed text-slate-500 sm:px-10">
        Ringkasan penilaian, presensi, dan unduhan sertifikat tetap tersedia di{" "}
        <a
          href="/peserta/dashboard"
          className="font-semibold text-navy-600 hover:text-navy-700 hover:underline"
        >
          Dasbor
        </a>
        .
      </div>
    </section>
  );
}
