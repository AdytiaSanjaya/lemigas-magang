import { redirect } from "next/navigation";
import { ClipboardPen } from "lucide-react";
import { auth, ROLE_PENDAFTAR } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PendaftaranForm from "@/components/forms/pendaftaran-form";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ActiveParticipantBlockToast from "@/components/ui/active-participant-block-toast";

export default async function DaftarPage() {
  const session = await auth();

  // Formulir dilindungi: wajib login (Google) supaya email bisa terisi otomatis.
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/daftar");
  }
  // Role panel (Admin/Mentor) tidak memakai formulir pendaftaran peserta.
  if (session.user.role !== ROLE_PENDAFTAR) {
    redirect(session.user.role === "ADMIN" ? "/admin/dashboard" : "/mentor/peserta");
  }

  // Cegah pendaftar dengan status MENUNGGU mengajukan ulang.
  const email = session.user.email?.toLowerCase().trim();
  if (email) {
    const pendingPendaftar = await prisma.pendaftar
      .findFirst({
        where: { email, status: "MENUNGGU" },
        select: { id: true, noPendaftaran: true },
      })
      .catch(() => null);

    if (pendingPendaftar) {
      return (
        <main className="flex min-h-screen flex-col bg-zinc-50">
          <SiteHeader />
          <section className="flex flex-1 items-center justify-center px-6 py-14 sm:py-16">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                <svg
                  className="h-7 w-7 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Pendaftaran Sedang Diproses
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Maaf, sistem mendeteksi bahwa akun kamu sudah memiliki pendaftaran
                yang sedang diproses.
                {pendingPendaftar.noPendaftaran && (
                  <>
                    <br />
                    <span className="mt-1 inline-block font-medium text-zinc-700">
                      No. Pendaftaran: {pendingPendaftar.noPendaftaran}
                    </span>
                  </>
                )}
              </p>
              <p className="mt-3 text-sm text-zinc-500">
                Silakan pantau status daftar Anda melalui fitur cek status.
              </p>
              <a
                href="/cek-status"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Cek Status Pendaftaran
              </a>
            </div>
          </section>
          <SiteFooter />
        </main>
      );
    }
  }

  // Cegah pendaftar aktif mengakses ulang formulir: jika email sudah tercatat
  // memiliki data Peserta (magang aktif), tampilkan notifikasi lalu redirect.
  if (email) {
    const existingActive = await prisma.peserta
      .findFirst({
        where: { pendaftar: { email } },
        select: { id: true },
      })
      .catch(() => null);

    if (existingActive) {
      return (
        <main className="flex min-h-screen flex-col bg-zinc-50">
          <SiteHeader />
          <section className="flex flex-1 items-center justify-center px-6 py-14 sm:py-16">
            <ActiveParticipantBlockToast redirectUrl="/peserta/dashboard" />
          </section>
          <SiteFooter />
        </main>
      );
    }
  }

  const units = await prisma.unit.findMany({
    where: { aktif: true },
    orderBy: { nama: "asc" },
  });

  return (
    <main className="min-h-screen bg-zinc-50">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 py-14 sm:py-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700">
            <ClipboardPen className="h-4 w-4" aria-hidden="true" />
            Pendaftaran Terbuka
          </span>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Formulir Pendaftaran Magang &amp; PKL
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
            Isi data dengan benar. CV wajib dalam format PDF; surat pengantar
            (PDF), KTP/KTM (PDF/JPG), dan transkrip nilai (PDF) bersifat opsional
            (maks. 2MB per berkas).
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm md:p-10">
          <PendaftaranForm units={units} initialEmail={session.user.email} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
