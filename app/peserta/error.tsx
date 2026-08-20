"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function PesertaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] w-full max-w-full items-center justify-center p-2 box-border">
      <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <Image
          src="/logo-lemigas.png"
          alt="Logo LEMIGAS"
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
        />
        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Terjadi kendala
        </span>
        <h1 className="mt-3 text-lg font-bold tracking-tight text-slate-900">
          Gagal Memuat Data
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Data tidak dapat dimuat saat ini. Kemungkinan koneksi ke server sedang
          bermasalah. Silakan coba lagi atau kembali beberapa saat.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-navy-800 active:scale-[0.98]"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Coba Lagi
        </button>
        <p className="mt-5 text-xs text-slate-400">
          LEMIGAS &middot; Pusat Penelitian dan Pengembangan Teknologi Minyak dan Gas Bumi
        </p>
      </div>
    </div>
  );
}