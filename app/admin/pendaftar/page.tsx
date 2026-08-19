import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import StatusBadge from "@/components/ui/status-badge";
import Pagination from "@/components/ui/pagination";
import VerifikasiActiva from "@/components/admin/verifikasi-actions";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function AdminPendaftarPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string; unitId?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const status = sp.status ?? "";
  const q = sp.q?.trim() ?? "";
  const unitId = sp.unitId ?? "";

  const where: Prisma.PendaftarWhereInput = {
    ...(status ? { status: status as "MENUNGGU" | "DITERIMA" | "DITOLAK" } : {}),
    ...(unitId ? { unitMinatId: unitId } : {}),
    ...(q
      ? {
          OR: [
            { nama: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { noPendaftaran: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // Query dibungkus catch + fallback agar halaman tetap render bila ada error DB.
  const [pendaftar, total] = await Promise.all([
    prisma.pendaftar
      .findMany({
        where,
        include: { unitMinat: { select: { id: true, nama: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      })
      .catch(() => []),
    prisma.pendaftar.count({ where }).catch(() => 0),
  ]);

  const units = await prisma.unit
    .findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } })
    .catch(() => []);
  const mentors = await prisma.user
    .findMany({
      where: { role: "MENTOR" },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, email: true },
    })
    .catch(() => []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (q) qs.set("q", q);
  if (unitId) qs.set("unitId", unitId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pendaftar — Verifikasi &amp; Seleksi</h1>
          <p className="mt-1 text-sm text-slate-500">{total} pendaftar</p>
        </div>
      </div>

      {/* Filter */}
      <form method="get" className="mt-4 flex flex-wrap items-center gap-3">
        <input name="q" defaultValue={q} placeholder="Cari nama / email / no daftar"
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        <select name="status" defaultValue={status}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Semua Status</option>
          <option value="MENUNGGU">Menunggu</option>
          <option value="DITERIMA">Diterima</option>
          <option value="DITOLAK">Ditolak</option>
        </select>
        <select name="unitId" defaultValue={unitId}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Semua Unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{u.nama}</option>
          ))}
        </select>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Terapkan
        </button>
        <a href="/admin/pendaftar" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
          Reset
        </a>
      </form>

      {/* Tabel */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">No. Pendaftaran</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Instansi</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tgl Daftar</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pendaftar.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Tidak ada pendaftar.
                </td>
              </tr>
            ) : (
              pendaftar.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.noPendaftaran}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nama}</td>
                  <td className="px-4 py-3 text-slate-600">{p.asalInstansi}</td>
                  <td className="px-4 py-3 text-slate-600">{p.unitMinat?.nama ?? "-"}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{formatTanggal(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <VerifikasiActiva
                      pendaftar={{
                        id: p.id,
                        nama: p.nama,
                        noPendaftaran: p.noPendaftaran,
                        status: p.status,
                        berkasCV: p.berkasCV,
                        berkasSurat: p.berkasSurat,
                        email: p.email,
                      }}
                      mentors={mentors}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} basePath="/admin/pendaftar" query={qs.toString()} />
      </div>
    </div>
  );
}