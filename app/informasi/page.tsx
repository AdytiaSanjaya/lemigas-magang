import Link from "next/link";
import {
  FlaskConical,
  CalendarDays,
  ClipboardCheck,
  ArrowRight,
  Info,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

// ISR: halaman informasi umum jarang berubah → dihasilkan statis & di-revalidate
// setiap 1 jam. Mengurangi beban DB saat banyak pengunjung.
export const revalidate = 3600;

const programFeatures = [
  {
    title: "Pilihan Bidang",
    description:
      "Pilih bidang sesuai minat dan latar belakang studi Anda, tersebar di berbagai unit kerja dan laboratorium pengujian migas LEMIGAS.",
    icon: FlaskConical,
  },
  {
    title: "Durasi Program",
    description:
      "Jadwal magang disesuaikan dengan ketentuan kampus dan kesepakatan bersama, umumnya berlangsung dalam rentang waktu 1–3 bulan.",
    icon: CalendarDays,
  },
  {
    title: "Persyaratan & Target Peserta",
    description:
      "Terbuka bagi pelajar dan mahasiswa aktif dari seluruh Indonesia yang memenuhi persyaratan administrasi serta ketentuan yang berlaku.",
    icon: ClipboardCheck,
  },
];

export default async function InformasiPage() {
  const items = await prisma.infoProgram.findMany({
    where: { aktif: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />

      {/* Feature List / Split Layout */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Sisi kiri: judul, penjelasan, dan CTA */}
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-navy-800 shadow-sm">
              <Info className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
              Balai Besar Migas
            </span>

            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-navy-900 sm:text-4xl lg:text-5xl">
              Informasi Program Magang 2026
            </h1>

            <p className="mt-5 text-base leading-7 text-slate-600">
              Wujudkan pengalaman profesional langsung di LEMIGAS. Pelajari
              pilihan bidang, durasi, hingga persyaratan program magang &amp;
              PKL, lalu daftarkan diri Anda secara daring sebelum kuota terpenuhi.
            </p>

            <div className="mt-8">
              <Link
                href="/daftar"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 px-7 py-3.5 text-sm font-semibold text-navy-900 shadow-lg shadow-sky-500/25 transition hover:-translate-y-0.5 hover:from-sky-300 hover:to-cyan-200"
              >
                Daftar Sekarang
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Sisi kanan: daftar fitur/informasi */}
          <div className="space-y-5">
            {programFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:shadow-md sm:p-7"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-navy-900">
                      {feature.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">
                      {feature.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pengumuman & ketentuan dari admin */}
      {items.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-16 sm:pb-20">
          <h2 className="text-xl font-bold text-navy-900 sm:text-2xl">
            Pengumuman &amp; Ketentuan Terbaru
          </h2>
          <div className="mt-6 space-y-5">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-800">
                  {item.judul}
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {item.isi}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
