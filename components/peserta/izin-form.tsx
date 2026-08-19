"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Loader2,
  CheckCircle2,
  CircleAlert,
  FileText,
  UploadCloud,
  X,
  CalendarDays,
  FileCheck2,
} from "lucide-react";

const inputClass =
  "mt-1.5 block w-full max-w-full box-border rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20";

export default function IzinForm() {
  const router = useRouter();
  const [type, setType] = useState<"IZIN" | "SAKIT" | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const today = new Date().toISOString().split("T")[0];

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!type) next.type = "Pilih jenis pengajuan (izin atau sakit).";
    if (!startDate) next.startDate = "Tanggal mulai wajib diisi.";
    if (!endDate) next.endDate = "Tanggal selesai wajib diisi.";
    if (startDate && endDate && endDate < startDate)
      next.endDate = "Tanggal selesai tidak boleh sebelum tanggal mulai.";
    if (reason.trim().length < 10)
      next.reason = "Alasan minimal 10 karakter.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    pickFile(dropped);
  }

  function pickFile(f?: File) {
    if (!f) return;
    const allowed = ["application/pdf", "image/jpeg"];
    if (!allowed.includes(f.type)) {
      setNotice({ ok: false, text: "Lampiran hanya PDF atau JPG." });
      return;
    }
    if (f.size > 2_000_000) {
      setNotice({ ok: false, text: "Ukuran lampiran maksimal 2MB." });
      return;
    }
    setNotice(null);
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!validate()) return;

    setLoading(true);
    const fd = new FormData();
    fd.append("type", type);
    fd.append("startDate", startDate);
    fd.append("endDate", endDate);
    fd.append("reason", reason);
    if (file) fd.append("attachment", file);

    try {
      const res = await fetch("/api/peserta/izin", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        const fe = data.fieldErrors;
        if (fe && typeof fe === "object") {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(fe)) {
            mapped[k] = Array.isArray(v) ? v[0] : String(v);
          }
          setErrors(mapped);
        }
        setNotice({ ok: false, text: data.error ?? "Terjadi kesalahan." });
        setLoading(false);
        return;
      }
      setNotice({ ok: true, text: data.message ?? "Pengajuan berhasil dikirim." });
      setType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setFile(null);
      router.refresh();
    } catch {
      setNotice({ ok: false, text: "Gagal terhubung ke server. Coba lagi." });
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {notice && (
        <div
          role="status"
          className={`mb-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            notice.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {notice.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {notice.text}
        </div>
      )}

      {/* Jenis pengajuan */}
      <div>
        <span className="text-sm font-medium text-slate-700">Jenis Pengajuan</span>
        <div className="mt-2 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              { value: "IZIN", label: "Izin", desc: "Keperluan pribadi / dinas" },
              { value: "SAKIT", label: "Sakit", desc: "Berhalangan karena sakit" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setType(opt.value);
                setErrors((p) => ({ ...p, type: "" }));
              }}
              aria-pressed={type === opt.value}
              className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 ${
                type === opt.value
                  ? "border-navy-600 bg-navy-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div
                className={`text-sm font-semibold ${
                  type === opt.value ? "text-navy-700" : "text-slate-700"
                }`}
              >
                {opt.label}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">{opt.desc}</div>
            </button>
          ))}
        </div>
        {errors.type && <p className="mt-1 text-xs text-rose-600">{errors.type}</p>}
      </div>

      {/* Rentang tanggal */}
      <div className="mt-6">
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <CalendarDays className="h-4 w-4 text-navy-500" aria-hidden="true" />
          Rentang Tanggal
        </span>
        <div className="mt-2 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="w-full">
            <label className="block text-xs font-medium text-slate-500">
              Tanggal Mulai
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setErrors((p) => ({ ...p, startDate: "" }));
                }}
                className={inputClass}
              />
            </label>
            {errors.startDate && (
              <p className="mt-1 text-xs text-rose-600">{errors.startDate}</p>
            )}
          </div>
          <div className="w-full">
            <label className="block text-xs font-medium text-slate-500">
              Tanggal Selesai
              <input
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setErrors((p) => ({ ...p, endDate: "" }));
                }}
                className={inputClass}
              />
            </label>
            {errors.endDate && (
              <p className="mt-1 text-xs text-rose-600">{errors.endDate}</p>
            )}
          </div>
        </div>
      </div>

      {/* Alasan */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-slate-700">
          Alasan Pengajuan
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErrors((p) => ({ ...p, reason: "" }));
            }}
            rows={4}
            placeholder="Jelaskan alasan izin/sakit Anda secara singkat dan jelas..."
            className={`${inputClass} resize-none`}
          />
        </label>
        <div className="mt-1 flex items-center justify-between">
          {errors.reason ? (
            <p className="text-xs text-rose-600">{errors.reason}</p>
          ) : (
            <span className="text-xs text-slate-400">
              Minimal 10 karakter untuk memudahkan verifikasi mentor.
            </span>
          )}
          <span className="text-xs text-slate-400">{reason.length}/2000</span>
        </div>
      </div>

      {/* Lampiran bukti (drag & drop) */}
      <div className="mt-6">
        <span className="text-sm font-medium text-slate-700">
          Lampiran Bukti{" "}
          <span className="font-normal text-slate-400">(opsional, PDF/JPG maks. 2MB)</span>
        </span>

        {file ? (
          <div className="mt-2 flex items-center gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <FileCheck2 className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                <FileText className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="truncate">{file.name}</span>
              </div>
              <div className="text-xs text-slate-400">
                {(file.size / 1024).toFixed(1)} KB &middot; siap diunggah
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label="Hapus lampiran"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`mt-2 flex min-h-[120px] w-full max-w-full box-border cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-6 text-center transition-all ${
              dragging
                ? "border-navy-500 bg-navy-50"
                : "border-slate-200 bg-slate-50/70 hover:border-navy-400/60 hover:bg-navy-50/40"
            }`}
          >
            <input
              type="file"
              accept="application/pdf,image/jpeg"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy-500 shadow-sm ring-1 ring-slate-200">
              <UploadCloud className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-2.5 text-sm font-medium text-slate-700">
              Seret berkas ke sini atau <span className="text-navy-600 underline">pilih file</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Surat dokter, keterangan, atau bukti pendukung lainnya.
            </p>
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-7 flex w-full max-w-full box-border items-center justify-center gap-2 rounded-xl bg-navy-600 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-navy-700 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Mengirim pengajuan...
          </>
        ) : (
          <>
            Kirim Pengajuan
            <Send className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
