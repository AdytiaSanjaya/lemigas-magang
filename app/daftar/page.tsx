import { redirect } from "next/navigation";
import { ClipboardPen } from "lucide-react";
import { auth, ROLE_PENDAFTAR } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PendaftaranForm from "@/components/forms/pendaftaran-form";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

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
