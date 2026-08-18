import { requireMentor } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatTanggal } from "@/lib/format";
import StatusBadge from "@/components/ui/status-badge";
import IzinActions from "@/components/mentor/izin-actions";
import { ClipboardCheck, FileText, Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MentorIzinPage() {
  const session = await requireMentor();

  // Peserta yang dibimbing oleh mentor ini (melalui email pendaftar yang sama).
  // Dibungkus catch + null-safe agar halaman tetap render bila query error
  // atau belum ada peserta bimbingan.
  const bimbingan = await prisma.peserta
    .findMany({
      where: { mentorId: session.user.id },
      select: { pendaftar: { select: { email: true } } },
    })
    .catch(() => []);
  const emails = bimbingan
    .map((p) => p.pendaftar?.email ?? "")
    .filter(Boolean);

  const requests = await prisma.leaveRequest
    .findMany({
      where: { user: { email: { in: emails } } },
      include: { user: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    })
    .catch(() => []);

  const pending = requests.filter((r) => r.status === "PENDING");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Persetujuan Izin / Sakit</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tinjau dan proses pengajuan izin/sakit dari peserta yang Anda bimbing.
        </p>
      </div>

      {pending.length > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          {pending.length} pengajuan menunggu keputusan Anda.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <ClipboardCheck className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-800">Daftar Pengajuan</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {requests.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Peserta</th>
                <th className="px-5 py-3">Jenis</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Alasan</th>
                <th className="px-5 py-3">Lampiran</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center">
                      <Inbox className="h-8 w-8 text-slate-300" aria-hidden="true" />
                      <p className="mt-2 text-sm text-slate-400">
                        Belum ada pengajuan dari peserta bimbingan Anda.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="align-top transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{r.user?.nama ?? "-"}</div>
                      <div className="text-xs text-slate-400">{r.user?.email ?? "-"}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          r.type === "SAKIT" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {r.type === "SAKIT" ? "Sakit" : "Izin"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {formatTanggal(r.startDate)} &ndash; {formatTanggal(r.endDate)}
                    </td>
                    <td className="max-w-[200px] px-5 py-3 text-slate-600">
                      <span className="line-clamp-2">{r.reason}</span>
                    </td>
                    <td className="px-5 py-3">
                      {r.attachmentUrl ? (
                        <a
                          href={r.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-600 hover:underline"
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
                    <td className="px-5 py-3">
                      {r.status === "PENDING" ? (
                        <IzinActions
                          izin={{
                            id: r.id,
                            type: r.type,
                            startDate: r.startDate.toISOString(),
                            endDate: r.endDate.toISOString(),
                            reason: r.reason,
                            nama: r.user?.nama ?? "-",
                          }}
                        />
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
