import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

const features = [
  {
    title: "Pendaftaran Daring",
    description:
      "Isi formulir pendaftaran magang/PKL secara online tanpa perlu datang langsung ke kantor.",
    href: "/daftar",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Pantau Status Lamaran",
    description:
      "Lacak perkembangan lamaran Anda secara real-time melalui nomor pendaftaran.",
    href: "/cek-status",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
        <path d="M8 11h6" />
      </svg>
    ),
  },
  {
    title: "Informasi Program",
    description:
      "Simak syarat, jadwal, dan ketentuan terbaru program magang/PKL LEMIGAS.",
    href: "/informasi",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01" />
        <path d="M11 12h1v4h1" />
      </svg>
    ),
  },
];

const steps = [
  {
    title: "Isi Formulir",
    description: "Lengkapi data diri dan pilih program magang yang tersedia.",
  },
  {
    title: "Unggah Berkas",
    description: "Sertakan CV, surat pengantar, dan dokumen pendukung lainnya.",
  },
  {
    title: "Verifikasi & Seleksi",
    description: "Tim kami memverifikasi kelengkapan berkas pendaftaran Anda.",
  },
  {
    title: "Pengumuman",
    description: "Pantau status lamaran Anda secara daring dari halaman Cek Status.",
  },
];

export default async function HomePage() {
  let session;
  try {
    session = await auth();
  } catch {
    session = null;
  }

  // Admin/Mentor langsung diarahkan ke panelnya masing-masing. Peserta
  // (Google OAuth) tetap bisa mengakses beranda.
  if (session?.user?.role === "ADMIN") {
    redirect("/admin/dashboard");
  }
  if (session?.user?.role === "MENTOR") {
    redirect("/mentor/peserta");
  }

  // Tombol pendaftaran: user yang belum login diarahkan ke Google OAuth
  // terlebih dahulu (callbackUrl=/daftar untuk melanjutkan ke formulir).
  const daftarHref = session?.user ? "/daftar" : "/login?callbackUrl=/daftar";

  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-600 text-white">
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-navy-900/60 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center lg:py-32">
          <span className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-100 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
            Balai Besar Pengujian Minyak dan Gas Bumi
          </span>

          <h1 className="mx-auto mt-6 max-w-4xl animate-fade-in-up text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            Portal Pendaftaran &amp; Manajemen Magang/PKL{" "}
            <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-amber-300 bg-clip-text text-transparent">
              LEMIGAS
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-3xl animate-fade-in-up text-base leading-7 text-slate-300 sm:text-lg">
            Layanan terpadu pendaftaran, seleksi, serta portal kegiatan harian
            peserta Magang &amp; PKL (Mahasiswa &amp; Pelajar) di Balai Besar
            Pengujian Minyak dan Gas Bumi (LEMIGAS).
          </p>

          <div
            className="mt-9 flex animate-fade-in-up flex-wrap items-center justify-center gap-4"
            style={{ animationDelay: "300ms" }}
          >
            <Link
              href={daftarHref}
              className="rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 px-7 py-3.5 text-sm font-semibold text-navy-900 shadow-lg shadow-sky-500/25 transition hover:-translate-y-0.5 hover:from-sky-300 hover:to-cyan-200"
            >
              Daftar Magang Sekarang
            </Link>
            <Link
              href="/cek-status"
              className="rounded-xl border border-white/30 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:border-sky-300/60 hover:bg-white/10"
            >
              Cek Status Lamaran
            </Link>
          </div>
        </div>

        {/* Wave bawah agar transisi ke konten berikutnya lembut */}
        <div className="relative -mt-px h-10 w-full" aria-hidden="true">
          <svg
            viewBox="0 0 1440 48"
            className="h-full w-full text-slate-50"
            preserveAspectRatio="none"
          >
            <path
              d="M0 48h1440V20C1200 40 960 48 720 48S240 40 0 20V48Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </section>

      {/* Tentang program / narasi resmi */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="relative overflow-hidden rounded-3xl border border-navy-100 bg-gradient-to-br from-white via-navy-50/40 to-sky-50/40 p-8 shadow-sm sm:p-12">
            <div
              className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-sky-200">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2Z" />
                </svg>
                Misi LEMIGAS
              </span>

              <h2 className="mt-5 text-2xl font-bold text-navy-900 sm:text-3xl">
                Pendidikan untuk Mencerdaskan Bangsa
              </h2>

              <blockquote className="mt-5 max-w-3xl border-l-4 border-sky-400 pl-5 text-base leading-relaxed text-slate-600 sm:text-lg">
                &ldquo;Program Magang &amp; PKL di{" "}
                <span className="font-semibold text-navy-800">
                  Balai Besar Pengujian Minyak dan Gas Bumi (LEMIGAS)
                </span>{" "}
                merupakan bagian dari{" "}
                <span className="rounded bg-sky-100 px-1 font-semibold text-sky-800">
                  layanan komersial publik
                </span>{" "}
                serta wujud{" "}
                <span className="rounded bg-amber-100 px-1 font-semibold text-amber-800">
                  tanggung jawab sosial
                </span>{" "}
                kepada masyarakat untuk{" "}
                <span className="rounded bg-navy-100 px-1 font-semibold text-navy-800">
                  mencerdaskan kehidupan bangsa Indonesia
                </span>
                .&rdquo;
              </blockquote>

              <p className="mt-6 max-w-3xl text-sm leading-6 text-slate-500">
                Melalui sistem pendaftaran daring ini, pelajar dan mahasiswa dari
                seluruh Indonesia dapat mengakses kesempatan magang secara
                transparan, efisien, dan mudah dipantau — sejalan dengan
                semangat pelayanan publik LEMIGAS.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fitur layanan */}
      <section className="mx-auto max-w-6xl px-6 pb-16 sm:pb-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">
            Layanan Lengkap dalam Satu Sistem
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 sm:text-base">
            Seluruh proses pendaftaran magang/PKL dapat dilakukan secara daring
            dan mudah dipantau.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href === "/daftar" ? daftarHref : feature.href}
              className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-navy-800 to-navy-600 text-sky-300 shadow-md shadow-navy-800/20 transition group-hover:from-sky-400 group-hover:to-cyan-300 group-hover:text-navy-900">
                {feature.icon}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-navy-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Alur pendaftaran */}
      <section className="border-y border-white/10 bg-navy-900">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Cara Mendaftar
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
              Ikuti empat langkah sederhana berikut untuk memulai program
              magang/PKL di LEMIGAS.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="relative text-center">
                {index < steps.length - 1 && (
                  <div
                    className="absolute top-7 left-[calc(50%+40px)] hidden h-0.5 bg-gradient-to-r from-sky-400/60 to-amber-300/60 lg:block lg:w-[calc(100%-80px)]"
                    aria-hidden="true"
                  />
                )}
                <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 text-lg font-bold text-navy-900 shadow-lg shadow-sky-500/30 ring-4 ring-white/10">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mx-auto mt-2 max-w-[220px] text-sm leading-6 text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href={daftarHref}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 px-7 py-3.5 text-sm font-semibold text-navy-900 shadow-lg shadow-sky-500/25 transition hover:-translate-y-0.5 hover:from-sky-300 hover:to-cyan-200"
            >
              Mulai Pendaftaran
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA penutup */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-50 via-white to-sky-50">
        <div
          className="pointer-events-none absolute -top-24 right-1/4 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-16 text-center sm:py-20">
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">
            Siap Memulai Perjalanan Magang Anda?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 sm:text-base">
            Jadilah bagian dari generasi muda yang berkontribusi untuk kemajuan
            industri migas nasional bersama LEMIGAS.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={daftarHref}
              className="rounded-xl bg-gradient-to-r from-navy-800 to-navy-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-navy-800/20 transition hover:-translate-y-0.5 hover:from-navy-700 hover:to-navy-500"
            >
              Daftar Magang Sekarang
            </Link>
            <Link
              href="/cek-status"
              className="rounded-xl border border-navy-200 bg-white px-7 py-3.5 text-sm font-semibold text-navy-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
            >
              Cek Status Lamaran
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}