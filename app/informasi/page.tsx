import Link from "next/link";
import {
  Users,
  FileStack,
  CalendarClock,
  FlaskConical,
  Mountain,
  Wrench,
  Laptop,
  Building2,
  Send,
  FileCheck2,
  FileSignature,
  Rocket,
  Info,
  ArrowRight,
  CheckCircle2,
  FileText,
  ClipboardCheck,
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
      "Beragam rumpun keahlian di unit kerja dan laboratorium pengujian migas LEMIGAS, disesuaikan dengan minat serta latar belakang studi Anda.",
    icon: FlaskConical,
  },
  {
    title: "Durasi Program",
    description:
      "Minimum 1 bulan hingga maksimum 3–6 bulan, menyesuaikan kurikulum kampus dan kesepakatan unit kerja.",
    icon: CalendarClock,
  },
  {
    title: "Persyaratan & Target Peserta",
    description:
      "Terbuka bagi siswa SMK/SMA dan mahasiswa aktif (D3, D4, S1) dari jurusan relevan yang memenuhi ketentuan administrasi.",
    icon: ClipboardCheck,
  },
];

const kategoriPeserta = [
  "Mahasiswa aktif jenjang D3, D4, atau S1 dari perguruan tinggi dalam maupun luar negeri.",
  "Siswa SMK/SMA sederajat untuk program Praktik Kerja Lapangan (PKL).",
  "Berada pada jurusan yang relevan dengan rumpun keahlian LEMIGAS (lihat Pilihan Unit Kerja).",
  "Mampu mengikuti seluruh rangkaian kegiatan sesuai durasi dan tata tertib LEMIGAS.",
];

const dokumenWajib = [
  {
    label: "Surat Pengantar / Permohonan Magang",
    detail: "Diterbitkan oleh kampus atau sekolah pemohon.",
    tag: "PDF",
  },
  {
    label: "Proposal Magang / PKL",
    detail: "Khusus mahasiswa, memuat rencana kegiatan magang.",
    tag: "Mahasiswa",
  },
  {
    label: "Curriculum Vitae (CV)",
    detail: "CV terbaru; wajib diunggah dalam formulir daring.",
    tag: "Wajib",
    wajib: true,
  },
  {
    label: "Transkrip Nilai Akademik",
    detail: "Transkrip atau daftar nilai akademik terakhir.",
    tag: "PDF",
  },
  {
    label: "Salinan KTP / Kartu Identitas",
    detail: "KTP, kartu tanda mahasiswa (KTM), atau kartu pelajar.",
    tag: "PDF/JPG",
  },
];

const durasiProgram = [
  { label: "Minimum", value: "1 bulan" },
  { label: "Maksimum", value: "3–6 bulan" },
  { label: "Penyesuaian", value: "Kesepakatan unit kerja" },
];

const unitKerja = [
  {
    title: "Eksplorasi & Eksploitasi Minyak dan Gas Bumi",
    icon: Mountain,
    scope:
      "Kegiatan pengkajian potensi, survei, dan teknologi produksi migas guna mendukung ketahanan energi nasional.",
    jurusan: ["Geologi", "Geofisika", "Teknik Perminyakan", "Teknik Kimia"],
  },
  {
    title: "Aplikasi & Pengolahan Hasil Pengujian",
    icon: FlaskConical,
    scope:
      "Laboratorium pengujian mutu BBM, pelumas, dan gas alam: analisis sampel, pengolahan data, serta penyusunan laporan hasil uji.",
    jurusan: ["Kimia", "Teknik Kimia"],
  },
  {
    title: "Sarana & Prasarana Pengujian",
    icon: Wrench,
    scope:
      "Pemeliharaan peralatan laboratorium dan instrumentasi pengujian agar beroperasi sesuai standar mutu.",
    jurusan: ["Teknik Mesin", "Teknik Elektro", "Instrumentasi"],
  },
  {
    title: "Teknologi Informasi & Manajemen Sistem",
    icon: Laptop,
    scope:
      "Pengembangan sistem informasi, software engineering, serta pengelolaan jaringan dan infrastruktur TIK.",
    jurusan: ["Sistem Informasi", "Teknik Informatika"],
  },
  {
    title: "Administrasi & Tata Usaha",
    icon: Building2,
    scope:
      "Pengelolaan surat-menyurat, dokumentasi, tata kelola arsip, dan dukungan administrasi perkantoran.",
    jurusan: ["Manajemen", "Akuntansi", "Administrasi Publik"],
  },
];

const tahapanSeleksi = [
  {
    title: "Pendaftaran Online",
    icon: Send,
    desc: "Isi formulir pendaftaran daring dan unggah seluruh berkas persyaratan melalui portal resmi.",
    detail: "Pastikan data diri dan dokumen sesuai ketentuan agar proses selanjutnya berjalan lancar.",
  },
  {
    title: "Verifikasi Berkas",
    icon: FileCheck2,
    desc: "Tim Admin memeriksa kelengkapan dan keabsahan dokumen pendaftaran Anda.",
    detail: "Dokumen yang tidak lengkap atau tidak sesuai dapat memperlambat proses seleksi.",
  },
  {
    title: "Penyaluran Unit Kerja",
    icon: Building2,
    desc: "Konfirmasi ketersediaan kuota serta penunjukan mentor pada unit kerja yang dituju.",
    detail: "Penempatan disesuaikan dengan minat, jurusan, dan kebutuhan unit kerja.",
  },
  {
    title: "Penerbitan Surat Balasan",
    icon: FileSignature,
    desc: "Unduh surat keterangan diterima / balasan resmi melalui halaman Cek Status.",
    detail: "Surat balasan menjadi dasar kelanjutan administrasi magang/PKL Anda.",
  },
  {
    title: "Pelaksanaan Magang",
    icon: Rocket,
    desc: "Onboarding, presensi harian ber-geolokasi, pengajuan izin, serta pelaporan kegiatan berkala.",
    detail: "Kegiatan dipantau mentor dan dievaluasi sebagai penilaian kinerja peserta.",
  },
];

export default async function InformasiPage() {
  const items = await prisma.infoProgram
    .findMany({
      where: { aktif: true },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => []);

  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />

      {/* Hero / Split Layout */}
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

        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Sisi kiri: judul, penjelasan, dan CTA */}
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-100 backdrop-blur">
                <Info className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
                Balai Besar Pengujian Minyak dan Gas Bumi
              </span>

              <h1 className="mt-5 animate-fade-in-up text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Informasi Program{" "}
                <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-amber-300 bg-clip-text text-transparent">
                  Magang &amp; PKL
                </span>
              </h1>

              <p className="mt-5 animate-fade-in-up text-base leading-7 text-slate-300">
                Panduan lengkap program magang/PKL LEMIGAS: ketentuan
                pendaftaran, dokumen yang diperlukan, pilihan unit kerja,
                hingga alur tahapan seleksi. Wujudkan pengalaman profesional
                langsung di LEMIGAS sebelum kuota terpenuhi.
              </p>

              <div className="mt-8 flex animate-fade-in-up flex-wrap items-center gap-4">
                <Link
                  href="/daftar"
                  className="inline-flex items-center rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 px-7 py-3.5 text-sm font-semibold text-navy-900 shadow-lg shadow-sky-500/25 transition hover:-translate-y-0.5 hover:from-sky-300 hover:to-cyan-200"
                >
                  Daftar Magang Sekarang
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/cek-status"
                  className="inline-flex items-center rounded-xl border border-white/30 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:border-sky-300/60 hover:bg-white/10"
                >
                  Cek Status Pendaftaran
                </Link>
              </div>
            </div>

            {/* Sisi kanan: ringkasan program */}
            <div className="space-y-5">
              {programFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-sky-300/40 hover:bg-white/10 sm:p-7"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/20 to-cyan-300/20 text-sky-300 ring-1 ring-sky-300/20">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {feature.title}
                      </h2>
                      <p className="mt-1.5 text-sm leading-6 text-slate-300">
                        {feature.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
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

      {/* Ketentuan & Persyaratan Pendaftaran */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-navy-800 shadow-sm">
            <ClipboardCheck className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            Syarat Pendaftaran
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            Ketentuan &amp; Persyaratan Pendaftaran
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            Pastikan Anda memenuhi seluruh ketentuan sebelum mengajukan
            pendaftaran magang/PKL melalui portal resmi.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Kategori Peserta */}
          <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-800 to-navy-600 text-sky-300 shadow-md shadow-navy-800/20">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-navy-900">
                Kategori Peserta
              </h3>
            </div>

            <ul className="mt-6 space-y-3.5">
              {kategoriPeserta.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-600">
                  <CheckCircle2
                    className="mt-1 h-4 w-4 shrink-0 text-sky-600"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          {/* Dokumen Wajib */}
          <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-800 to-navy-600 text-sky-300 shadow-md shadow-navy-800/20">
                <FileStack className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-navy-900">
                Dokumen Wajib
              </h3>
            </div>

            <ul className="mt-6 space-y-2.5">
              {dokumenWajib.map((doc) => (
                <li
                  key={doc.label}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 ring-1 ring-slate-200">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-navy-900">
                      {doc.label}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {doc.detail}
                    </span>
                  </span>
                  <span
                    className={
                      doc.wajib
                        ? "shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200"
                        : "shrink-0 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100"
                    }
                  >
                    {doc.tag}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-5 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-xs leading-5 text-sky-800">
              Dokumen diunggah melalui formulir pendaftaran daring (maks. 2MB
              per berkas). CV merupakan berkas wajib unggah; dokumen lainnya
              melengkapi proses verifikasi dan seleksi.
            </p>
          </article>

          {/* Durasi Program */}
          <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-800 to-navy-600 text-sky-300 shadow-md shadow-navy-800/20">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-navy-900">
                Durasi Program
              </h3>
            </div>

            <div className="mt-6 flex items-end gap-2.5">
              <span className="bg-gradient-to-r from-navy-800 to-navy-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
                1&ndash;6
              </span>
              <span className="pb-1 text-sm font-semibold text-slate-500">
                bulan
              </span>
            </div>
            <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              Rentang durasi program
            </p>

            <dl className="mt-6 space-y-3.5 border-t border-slate-100 pt-5">
              {durasiProgram.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-slate-500">{row.label}</dt>
                  <dd className="text-right font-semibold text-navy-900">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-5 text-xs leading-5 text-slate-500">
              Durasi akhir disepakati bersama unit kerja dan mengikuti ketentuan
              kurikulum kampus/sekolah serta jam kerja LEMIGAS.
            </p>
          </article>
        </div>
      </section>

      {/* Pilihan Unit Kerja & Rumpun Keahlian */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-navy-800 shadow-sm">
              <FlaskConical className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
              Pilihan Penempatan
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
              Unit Kerja &amp; Rumpun Keahlian
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              LEMIGAS menawarkan beragam penempatan sesuai rumpun keahlian.
              Pilih unit yang paling sesuai dengan minat dan latar belakang
              studi Anda.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {unitKerja.map((unit) => {
              const Icon = unit.icon;
              return (
                <article
                  key={unit.title}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-slate-50/40 p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:bg-white hover:shadow-xl hover:shadow-sky-100 sm:p-7"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-navy-800 to-navy-600 text-sky-300 shadow-md shadow-navy-800/20 transition group-hover:from-sky-400 group-hover:to-cyan-300 group-hover:text-navy-900">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold leading-snug text-navy-900">
                    {unit.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                    {unit.scope}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                    {unit.jurusan.map((j) => (
                      <span
                        key={j}
                        className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-100"
                      >
                        {j}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 text-sm leading-6 text-amber-900">
            Penempatan akhir ditentukan berdasarkan ketersediaan kuota serta
            kebutuhan unit kerja pada periode pendaftaran berjalan.
          </p>
        </div>
      </section>

      {/* Alur & Tahapan Seleksi */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div
          className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-100">
              <FileSignature className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
              Proses Seleksi
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Alur &amp; Tahapan Seleksi
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
              Proses seleksi berlangsung transparan dan dapat Anda pantau secara
              daring melalui halaman Cek Status.
            </p>
          </div>

          <ol className="relative mx-auto mt-12 max-w-3xl space-y-8">
            <div
              className="absolute top-2 bottom-2 left-6 w-px -translate-x-1/2 bg-gradient-to-b from-sky-400/60 via-white/20 to-amber-300/60"
              aria-hidden="true"
            />
            {tahapanSeleksi.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative flex items-start gap-5">
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 text-navy-900 shadow-lg shadow-sky-500/30 ring-4 ring-white/10">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-300">
                      Tahap {index + 1}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-slate-300">
                      {step.desc}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      {step.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Pengumuman & ketentuan dari admin */}
      {items.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-navy-800 shadow-sm">
              <Info className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
              Informasi Resmi
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
              Pengumuman &amp; Ketentuan Terbaru
            </h2>
          </div>

          <div className="mt-8 space-y-5">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:shadow-md sm:p-7"
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

      {/* Call to Action */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div
          className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-6 py-16 text-center sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-100 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
            Pendaftaran Terbuka
          </span>

          <h2 className="mx-auto mt-5 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            Sudah Siap Bergabung dengan LEMIGAS?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Daftarkan diri Anda secara daring dan pantau perkembangan status
            lamaran melalui portal resmi. Jadilah bagian dari generasi muda
            yang berkontribusi untuk kemajuan industri migas nasional.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/daftar"
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 px-7 py-3.5 text-sm font-semibold text-navy-900 shadow-lg shadow-sky-500/25 transition hover:-translate-y-0.5 hover:from-sky-300 hover:to-cyan-200"
            >
              Daftar Magang Sekarang
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/cek-status"
              className="inline-flex items-center rounded-xl border border-white/30 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:border-sky-300/60 hover:bg-white/10"
            >
              Cek Status Pendaftaran
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
