"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Unit = { id: string; nama: string };
type Mentor = { id: string; nama: string };

type PesertaProps = {
  id: string;
  pendaftarNama: string;
  unitId: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  mentorId?: string | null;
  catatan?: string | null;
};

export default function PesertaActions({
  peserta,
  units,
  mentors,
}: {
  peserta: PesertaProps;
  units: Unit[];
  mentors: Mentor[];
}) {
  const router = useRouter();
  const [openEdit, setOpenEdit] = useState(false);
  const [form, setForm] = useState({
    unitId: peserta.unitId,
    tanggalMulai: peserta.tanggalMulai,
    tanggalSelesai: peserta.tanggalSelesai,
    mentorId: peserta.mentorId ?? "",
    catatan: peserta.catatan ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function update(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/peserta", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pesertaId: peserta.id,
        ...form,
        mentorId: form.mentorId || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan.");
      return;
    }
    setOpenEdit(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Hapus peserta ${peserta.pendaftarNama}? Status pendaftar akan kembali ke "Menunggu".`)) return;
    setLoading(true);
    const res = await fetch("/api/peserta", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pesertaId: peserta.id }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
    else alert("Gagal menghapus peserta.");
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setOpenEdit(true)}
        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
      >
        Edit
      </button>
      <button
        onClick={remove}
        disabled={loading}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
      >
        Hapus
      </button>

      {openEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpenEdit(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800">Edit Peserta: {peserta.pendaftarNama}</h3>
            {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

            <form onSubmit={update} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Unit Penempatan</label>
                <select
                  value={form.unitId}
                  onChange={(e) => setForm((p) => ({ ...p, unitId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Tanggal Mulai</label>
                  <input type="date" value={form.tanggalMulai}
                    onChange={(e) => setForm((p) => ({ ...p, tanggalMulai: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Tanggal Selesai</label>
                  <input type="date" value={form.tanggalSelesai}
                    onChange={(e) => setForm((p) => ({ ...p, tanggalSelesai: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Mentor Pembimbing</label>
                <select value={form.mentorId}
                  onChange={(e) => setForm((p) => ({ ...p, mentorId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Tanpa Mentor</option>
                  {mentors.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Catatan</label>
                <textarea rows={3} value={form.catatan}
                  onChange={(e) => setForm((p) => ({ ...p, catatan: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpenEdit(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}