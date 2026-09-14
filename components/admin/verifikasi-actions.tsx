"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ExternalLink } from "lucide-react";

type Mentor = { id: string; nama: string; email: string; unitId?: string | null };

type PendaftarDokumen = {
  id: string;
  nama: string;
  noPendaftaran: string;
  status: string;
  email: string;
  unitMinatId?: string | null;
  cvUrl?: string | null;
  suratPengantarUrl?: string | null;
  ktpKtmUrl?: string | null;
  transkripUrl?: string | null;
};

// Definisi item dokumen yang akan ditampilkan di modal.
const DOC_ITEMS = [
  { key: "cv", label: "CV (Wajib)", type: "cv" },
  { key: "surat", label: "Surat Pengantar Sekolah/Kampus", type: "surat" },
  { key: "ktp", label: "KTP / Kartu Tanda Mahasiswa (KTM)", type: "ktp" },
  { key: "transkrip", label: "Transkrip Nilai Akademik", type: "transkrip" },
] as const;

export default function VerifikasiActiva({
  pendaftar,
  mentors,
}: {
  pendaftar: PendaftarDokumen;
  mentors: Mentor[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [status, setStatus] = useState(pendaftar.status);
  const [catatan, setCatatan] = useState("");
  const [mulai, setMulai] = useState("");
  const [selesai, setSelesai] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: Record<string, unknown> = {
      pendaftarId: pendaftar.id,
      status,
      catatan: catatan || undefined,
    };
    if (status === "DITERIMA") {
      if (!mulai || !selesai) {
        setError("Isi tanggal mulai & selesai peserta.");
        setLoading(false);
        return;
      }
      payload.tanggalMulai = mulai;
      payload.tanggalSelesai = selesai;
      payload.mentorId = mentorId || null;
    }

    const res_ = await fetch("/api/verifikasi", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res_.json();
    setLoading(false);
    if (!res_.ok) {
      setError(data.error ?? "Gagal menyimpan.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  // Cek apakah su ada file untuk tipe tertentu (ada = true, null/kosong = false).
  function hasFile(type: string): boolean {
    const map: Record<string, string | null | undefined> = {
      cv: pendaftar.cvUrl,
      surat: pendaftar.suratPengantarUrl,
      ktp: pendaftar.ktpKtmUrl,
      transkrip: pendaftar.transkripUrl,
    };
    return !!map[type] && map[type]!.trim().length > 0;
  }

  return (
    <>
      {/* Tombol Verifikasi */}
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
      >
        Verifikasi
      </button>

      {/* Tombol Lihat Dokumen */}
      <button
        onClick={() => setDocOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50"
      >
        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        Dokumen
      </button>

      {/* ===== Modal Lihat Dokumen ===== */}
      {docOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDocOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Dokumen Pendaftar</h3>
                <p className="text-xs text-slate-400">
                  {pendaftar.nama} &mdash; {pendaftar.noPendaftaran}
                </p>
              </div>
              <button
                onClick={() => setDocOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {DOC_ITEMS.map((item) => {
                const available = hasFile(item.type);
                const href = `/api/berkas/dokumen?id=${pendaftar.id}&type=${item.type}`;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${available ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{item.label}</p>
                        <p className={`text-xs ${available ? "text-emerald-600" : "text-slate-400"}`}>
                          {available ? "Tersedia" : "Tidak diunggah"}
                        </p>
                      </div>
                    </div>
                    {available ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        Lihat
                      </a>
                    ) : (
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-400">
                        &mdash;
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setDocOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Verifikasi ===== */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800">
              Verifikasi: {pendaftar.nama}
            </h3>
            <p className="text-xs text-slate-400">{pendaftar.noPendaftaran}</p>

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="MENUNGGU">Menunggu</option>
                  <option value="DITERIMA">Diterima</option>
                  <option value="DITOLAK">Ditolak</option>
                </select>
              </div>

              {status === "DITERIMA" && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Tanggal Mulai</label>
                      <input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Tanggal Selesai</label>
                      <input type="date" value={selesai} onChange={(e) => setSelesai(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Mentor Pembimbing</label>
                    <select value={mentorId} onChange={(e) => setMentorId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="">-- Pilih Mentor (opsional) --</option>
                      {mentors
                        .filter((m) => !m.unitId || !pendaftar.unitMinatId || m.unitId === pendaftar.unitMinatId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>{m.nama}</option>
                        ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">Catatan</label>
                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3}
                  placeholder="Catatan/admin untuk pendaftar (dikirim via email)"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Batal
                </button>
                <button type="submit" disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
