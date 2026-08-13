import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Pagination from "@/components/ui/pagination";
import PesertaActions from "@/components/admin/peserta-actions";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function AdminPesertaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; unitId?: string; q?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const unitId = sp.unitId ?? "";
  const q = sp.q?.trim() ?? "";

  const where = {
    ...(unitId ? { unitId } : {}),
    ...(q ? { pendaftar: { nama: { contains: q, mode: "insensitive" as const } } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.peserta.findMany({
      where,
      include: { pendaftar: true, unit: true, mentor: { select: { id: true, nama: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.peserta.count({ where }),
  ]);

  const units = await prisma.unit.findMany({ orderBy: { nama: "asc" } });
  const mentors = await prisma.user.findMany({ where: { role: "MENTOR" }, orderBy: { nama: "asc" } });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = new URLSearchParams();
  if (unitId) qs.set("unitId", unitId);
  if (q) qs.set("q", q);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800">Peserta Aktif</h1>
      <p className="mt-1 text-sm text-slate-500">Manajemen penempatan, tanggal, dan mentor pembimbing.</p>

      <form method="get" className="mt-4 flex flex-wrap items-center gap-3">
        <input name="q" defaultValue={q} placeholder="Cari nama peserta"
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        <select name="unitId" defaultValue={unitId} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Semua Unit</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
        </select>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Terapkan</button>
        <a href="/admin/peserta" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Reset</a>
      </form>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Instansi</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Mulai</th>
              <th className="px-4 py-3">Selesai</th>
              <th className="px-4 py-3">Mentor</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Belum ada peserta aktif.</td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.pendaftar.nama}</td>
                  <td className="px-4 py-3 text-slate-600">{p.pendaftar.asalInstansi}</td>
                  <td className="px-4 py-3 text-slate-600">{p.unit.nama}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTanggal(p.tanggalMulai)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTanggal(p.tanggalSelesai)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.mentor?.nama ?? "-"}</td>
                  <td className="px-4 py-3">
                    <PesertaActions
                      peserta={{
                        id: p.id,
                        pendaftarNama: p.pendaftar.nama,
                        unitId: p.unitId,
                        tanggalMulai: p.tanggalMulai.toISOString().slice(0, 10),
                        tanggalSelesai: p.tanggalSelesai.toISOString().slice(0, 10),
                        mentorId: p.mentorId,
                        catatan: p.catatan,
                      }}
                      units={units.map((u) => ({ id: u.id, nama: u.nama }))}
                      mentors={mentors.map((m) => ({ id: m.id, nama: m.nama }))}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} basePath="/admin/peserta" query={qs.toString()} />
      </div>
    </div>
  );
}