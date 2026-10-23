"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileCheck2, Loader2 } from "lucide-react";

type Props = {
  pesertaId: string;
  nama: string;
  // Status masa magang peserta: hanya "Selesai" yang boleh mengunggah.
  selesai: boolean;
  // Sudah ada sertifikat terunggah (label tombol jadi "Ganti Sertifikat").
  sudahAda: boolean;
};

// Tombol "Unggah Sertifikat" untuk admin. Dirender hanya ketika masa magang
// peserta sudah Selesai; proses upload dikirim ke /api/admin/sertifikat
// (guard role ADMIN dilakukan di server).
export default function SertifikatUpload({ pesertaId, nama, selesai, sudahAda }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Tombol tidak muncul sama sekali bila masa magang belum selesai.
  if (!selesai) return null;

  function reset() {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    if (loading) return;
    setOpen(false);
    reset();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Pilih berkas PDF sertifikat terlebih dahulu.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("pesertaId", pesertaId);
      fd.set("file", file);
      const res = await fetch("/api/admin/sertifikat", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal mengunggah sertifikat.");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError("Terjadi gangguan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
          sudahAda
            ? "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            : "bg-navy-600 text-white hover:bg-navy-700"
        }`}
        title={`Sertifikat magang ${nama}`}
      >
        {sudahAda ? <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" /> : <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />}
        {sudahAda ? "Ganti Sertifikat" : "Unggah Sertifikat"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800">
              {sudahAda ? "Ganti" : "Unggah"} Sertifikat: {nama}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Masa magang sudah selesai. Berkas wajib berupa PDF (ukuran maksimal
              1.5MB).
            </p>

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Berkas Sertifikat (PDF)
                </label>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setError(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  disabled={loading}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {loading ? "Mengunggah..." : "Unggah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
