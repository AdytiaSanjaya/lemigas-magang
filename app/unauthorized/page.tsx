import Link from "next/link";
import { UserRoundX, ArrowRight, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <UserRoundX className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Email Belum Terdaftar
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
          Mohon maaf, email Anda belum terdaftar dalam sistem Magang LEMIGAS.
        </p>

        <p className="mt-6 text-sm font-medium text-slate-700 sm:text-base">
          Apakah Anda ingin lanjut mendaftar?
        </p>

        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/daftar"
            prefetch={true}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-navy-700 hover:shadow-md active:scale-[0.98]"
          >
            Lanjut Daftar
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>

          <Link
            href="/"
            prefetch={true}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali
          </Link>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-slate-400">
          Balai Besar Pengujian Minyak dan Gas Bumi (LEMIGAS)
        </p>
      </div>
    </main>
  );
}
