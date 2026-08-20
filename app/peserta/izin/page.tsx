import { requirePeserta } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getPesertaBySession, getUserIdBySession } from "@/lib/peserta";
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

  // Query profil peserta dibungkus try-catch: bila koneksi Supabase timeout /
  // error, halaman tetap render (fallback "Belum Peserta Aktif") alih-alih 500.
  let peserta: Awaited<ReturnType<typeof getPesertaBySession>> = null;
  try {
    peserta = await getPesertaBySession(session);
  } catch {
    peserta = null;
  }
  if (!peserta) return <NotParticipant />;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // Resolve User.id ASLI dari email session (NextAuth) — session.user.id untuk
  // akun Google adalah Google sub, bukan primary key Prisma, sehingga query
  // LeaveRequest harus memakai User.id hasil resolver agar match dengan data
  // yang tersimpan saat pengajuan dibuat. Dibungkus try-catch: jika gagal,
  // fallback ke userId kosong (riwayat tampil kosong).
  let userId = "";
  try {
    userId = (await getUserIdBySession(session)) ?? "";
  } catch {
    userId = "";
  }
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
    <div className="w-full min-w-0 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Izin / Sakit</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ajukan izin atau sakit dan pantau status persetujuan dari mentor pembimbing.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Formulir */}
        <section className="w-full min-w-0 max-w-full lg:col-span-2">
          <div className="w-full max-w-full rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm box-border overflow-hidden">
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
        <section className="w-full min-w-0 max-w-full lg:col-span-3">
          <div className="w-full max-w-full rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm box-border overflow-hidden">
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

            <div className="w-full max-w-full min-w-0 overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="w-full min-w-[500px] text-sm text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3 sm:px-4 sm:py-3 whitespace-nowrap">Jenis</th>
                    <th className="px-3 py-3 sm:px-4 sm:py-3 whitespace-nowrap">Tanggal</th>
                    <th className="px-3 py-3 sm:px-4 sm:py-3 whitespace-nowrap">Alasan</th>
                    <th className="px-3 py-3 sm:px-4 sm:py-3 whitespace-nowrap">Lampiran</th>
                    <th className="px-3 py-3 sm:px-4 sm:py-3 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-12 sm:px-4 text-center">
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
                        <td className="px-3 py-3 sm:px-4 sm:py-3 whitespace-nowrap">
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
                        <td className="px-3 py-3 sm:px-4 sm:py-3 whitespace-nowrap text-slate-700">
                          {formatTanggal(r.startDate)} &ndash; {formatTanggal(r.endDate)}
                          <div className="mt-0.5 text-xs text-slate-400">
                            diajukan {r.createdAt.toLocaleDateString("id-ID")}
                          </div>
                        </td>
                        <td className="max-w-[200px] px-3 py-3 sm:px-4 sm:py-3 text-slate-600">
                          <span className="block truncate">{r.reason}</span>
                          {r.catatanReview && (
                            <div className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">
                              <span className="font-medium text-slate-600">Catatan mentor:</span>{" "}
                              {r.catatanReview}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 sm:px-4 sm:py-3 whitespace-nowrap">
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
                        <td className="px-3 py-3 sm:px-4 sm:py-3 whitespace-nowrap">
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
