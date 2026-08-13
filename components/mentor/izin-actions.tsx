"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, ClipboardCheck } from "lucide-react";

interface IzinRecord {
  id: string;
  type: "IZIN" | "SAKIT";
  startDate: string;
  endDate: string;
  reason: string;
  nama: string;
}

export default function IzinActions({ izin }: { izin: IzinRecord }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal(decision: "APPROVED" | "REJECTED") {
    setDecision(decision);
    setError(null);
    setOpen(true);
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mentor/izin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          izinId: izin.id,
          status: decision,
          catatan: catatan.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan.");
        setLoading(false);
        return;
      }
      setOpen(false);
      setLoading(false);
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
      setLoading(false);
    }
  }

  const isSakit = izin.type === "SAKIT";

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => openModal("APPROVED")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.97]"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Setujui
        </button>
        <button
          type="button"
          onClick={() => openModal("REJECTED")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-all hover:bg-rose-100 active:scale-[0.97]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Tolak
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Proses pengajuan izin"
          onClick={() => {
            if (!loading) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  decision === "APPROVED"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {decision === "APPROVED" ? (
                  <Check className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <X className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {decision === "APPROVED" ? "Setujui" : "Tolak"} pengajuan{" "}
                  {isSakit ? "sakit" : "izin"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {izin.nama} &middot; {new Date(izin.startDate).toLocaleDateString("id-ID")} s.d.{" "}
                  {new Date(izin.endDate).toLocaleDateString("id-ID")}
                </p>
              </div>
            </div>

            <p className="mt-4 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Alasan: </span>
              {izin.reason}
            </p>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Catatan untuk peserta{" "}
              <span className="font-normal text-slate-400">(opsional)</span>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={3}
                placeholder={
                  decision === "APPROVED"
                    ? "contoh: Surat keterangan lengkap, disetujui."
                    : "contoh: Dokumen pendukung belum lengkap."
                }
                className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              />
            </label>

            {error && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 ${
                  decision === "APPROVED"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                )}
                {decision === "APPROVED" ? "Setujui" : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
