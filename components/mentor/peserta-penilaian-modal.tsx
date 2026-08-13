"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, CheckCircle2, CircleAlert } from "lucide-react";
import type { PesertaRow } from "./peserta-types";

const FIELDS = [
  { key: "kedisiplinan", label: "Kedisiplinan", hint: "Ketepatan waktu, kepatuhan aturan" },
  { key: "keaktifan", label: "Keaktifan", hint: "Inisiatif & partisipasi kegiatan" },
  { key: "kinerja", label: "Kinerja", hint: "Kualitas & hasil kerja" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

function initials(nama: string): string {
  return nama
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PesertaPenilaianModal({
  peserta,
  onClose,
}: {
  peserta: PesertaRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    kedisiplinan: "",
    keaktifan: "",
    kinerja: "",
  });
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = FIELDS.every((f) => {
    const n = Number(values[f.key]);
    return Number.isInteger(n) && n >= 1 && n <= 100;
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError("Isi seluruh nilai dengan angka 1-100.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mentor/evaluasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pesertaId: peserta.id,
          kedisiplinan: Number(values.kedisiplinan),
          keaktifan: Number(values.keaktifan),
          kinerja: Number(values.kinerja),
          catatan: catatan.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan.");
        setLoading(false);
        return;
      }
      setLoading(false);
      router.refresh();
      onClose();
    } catch {
      setError("Gagal terhubung ke server.");
      setLoading(false);
    }
  }

  const avg = valid
    ? Math.round(
        (FIELDS.reduce((acc, f) => acc + (Number(values[f.key]) || 0), 0) / FIELDS.length)
      )
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Berikan penilaian"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-navy-700 via-navy-800 to-navy-950 px-6 py-5 text-white">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-navy-400/20 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-base font-bold ring-1 ring-white/20">
              {initials(peserta.nama)}
            </span>
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Star className="h-4 w-4 text-amber-300" aria-hidden="true" />
                Berikan Penilaian
              </h3>
              <p className="truncate text-sm text-navy-100">{peserta.nama}</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="p-6">
          <p className="text-sm text-slate-500">
            Berikan nilai 1-100 untuk setiap aspek kinerja peserta.
          </p>

          <div className="mt-4 space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label
                  htmlFor={`evaluasi-${f.key}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    <span className="font-semibold text-slate-700">{f.label}</span>
                    <span className="ml-2 text-xs text-slate-400">{f.hint}</span>
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      values[f.key] ? "text-navy-700" : "text-slate-300"
                    }`}
                  >
                    {values[f.key] ? `${values[f.key]}/100` : "-"}
                  </span>
                </label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    id={`evaluasi-${f.key}`}
                    type="range"
                    min={1}
                    max={100}
                    value={values[f.key] || 50}
                    onChange={(e) =>
                      setValues((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-navy-600"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={values[f.key]}
                    onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder="1-100"
                    aria-label={`${f.label} (1-100)`}
                    className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-center text-sm font-semibold tabular-nums text-slate-800 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
                  />
                </div>
              </div>
            ))}
          </div>

          {avg !== null && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-navy-50 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-600 text-white">
                <Star className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="text-sm">
                <span className="text-slate-500">Rata-rata nilai: </span>
                <span className="font-bold text-navy-800">{avg}/100</span>
              </div>
            </div>
          )}

          <label className="mt-5 block text-sm font-medium text-slate-700">
            Catatan Evaluasi <span className="font-normal text-slate-400">(opsional)</span>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              placeholder="Kesan, saran, dan arahan untuk peserta..."
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            />
          </label>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !valid}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              Simpan Penilaian
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
