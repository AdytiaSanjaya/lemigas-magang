"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mentor = { id: string; nama: string; email: string };

export default function VerifikasiActiva({
  pendaftar,
  mentors,
}: {
  pendaftar: {
    id: string;
    nama: string;
    noPendaftaran: string;
    status: string;
    berkasCV: string;
    berkasSurat?: string | null;
    email: string;
  };
  mentors: Mentor[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
      >
        Verifikasi
      </button>
      <a
        href={`/api/berkas/${pendaftar.berkasCV.split("/").pop()}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50"
      >
        CV
      </a>

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
                      {mentors.map((m) => (
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