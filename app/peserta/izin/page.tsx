import { requirePeserta } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getPesertaBySession } from "@/lib/peserta";
import { formatTanggal } from "@/lib/format";
import IzinForm from "@/components/peserta/izin-form";
import StatusBadge from "@/components/ui/status-badge";
import Pagination from "@/components/ui/pagination";
import { ClipboardPenLine, FileText, Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

const PER_PAGE = 8;

function NotParticipant() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <ClipboardPenLine className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-lg font-bold text-slate-900">Belum Peserta Aktif</h1>
      <p className="mt-2 text-sm text-slate-500">
        Modul pengajuan izin hanya tersedia bagi peserta yang telah diaktifkan oleh admin.
      </p>
    </div>
  );
}

export default async function IzinPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requirePeserta();
  const peserta = await getPesertaBySession(session);
  if (!peserta) return <NotParticipant />;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const userId = session.user.id;
  // Fallback data kosong agar halaman tetap render bila query error atau
  // record izin belum ada (tidak crash 500).
  const [records, total, pendingCount] = await Promise.all([
    prisma.leaveRequest
      .findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
        select: {
          id: true,
          type: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          reason: true,
          catatanReview: true,
          attachmentUrl: true,
          status: true,
        },
      })
      .catch(() => []),
    prisma.leaveRequest.count({ where: { userId } }).catch(() => 0),
    prisma.leaveRequest.count({ where: { userId, status: "PENDING" } }).catch(() => 0),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Izin / Sakit</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ajukan izin atau sakit dan pantau status persetujuan dari mentor pembimbing.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Formulir */}
        <section className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
                <ClipboardPenLine className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Pengajuan Baru</h2>
                <p className="text-xs text-slate-400">Data yang Anda kirim diverifikasi mentor.</p>
              </div>
            </div>
            <IzinForm />
          </div>
        </section>

        {/* Riwayat */}
        <section className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Riwayat Pengajuan</h2>
                <p className="text-xs text-slate-400">Status persetujuan dari mentor</p>
              </div>
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  {pendingCount} menunggu persetujuan
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Jenis</th>
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-5 py-3">Alasan</th>
                    <th className="px-5 py-3">Lampiran</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center">
                        <div className="mx-auto flex max-w-xs flex-col items-center">
                          <Inbox className="h-8 w-8 text-slate-300" aria-hidden="true" />
                          <p className="mt-2 text-sm text-slate-400">
                            Belum ada pengajuan izin/sakit.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="align-top transition-colors hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
                              r.type === "SAKIT"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-sky-50 text-sky-700"
                            }`}
                          >
                            {r.type === "SAKIT" ? "Sakit" : "Izin"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {formatTanggal(r.startDate)} &ndash; {formatTanggal(r.endDate)}
                          <div className="mt-0.5 text-xs text-slate-400">
                            diajukan {r.createdAt.toLocaleDateString("id-ID")}
                          </div>
                        </td>
                        <td className="max-w-[220px] px-5 py-3 text-slate-600">
                          <span className="line-clamp-2">{r.reason}</span>
                          {r.catatanReview && (
                            <div className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">
                              <span className="font-medium text-slate-600">Catatan mentor:</span>{" "}
                              {r.catatanReview}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {r.attachmentUrl ? (
                            <a
                              href={r.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-600 hover:text-navy-700 hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              Lihat
                            </a>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="border-t border-slate-100 px-5 py-3">
                <Pagination page={page} totalPages={totalPages} basePath="/peserta/izin" />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
