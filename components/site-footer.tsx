import Link from "next/link";
import Image from "next/image";

const developers = [
  { name: "Adytia Sanjaya", initial: "AS" },
  { name: "Fauzan Yusuf", initial: "FY" },
  { name: "Maula Fathan Gibran Lubis", initial: "MF" },
];

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-navy-950 text-slate-300">
      <div
        className="pointer-events-none absolute -top-40 -right-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand & deskripsi */}
          <div className="lg:col-span-4">
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15 transition group-hover:ring-sky-300/60">
                <Image
                  src="/logo-lemigas.png"
                  alt="Logo LEMIGAS"
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                />
              </div>
              <span className="flex flex-col leading-tight">
                <span className="text-lg font-extrabold uppercase tracking-[0.14em] text-white">
                  LEMIGAS{" "}
                  <span className="bg-gradient-to-r from-sky-300 to-amber-300 bg-clip-text text-transparent">
                    MAGANG
                  </span>
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Balai Besar Migas
                </span>
              </span>
            </Link>
            <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">
              Sistem pendaftaran dan manajemen data peserta magang/PKL Balai
              Besar Pengujian Minyak dan Gas Bumi (LEMIGAS). Bagian dari layanan
              komersial publik serta wujud tanggung jawab sosial untuk
              mencerdaskan kehidupan bangsa Indonesia.
            </p>
          </div>

          {/* Menu */}
          <div className="lg:col-span-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Menu
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { href: "/", label: "Beranda" },
                { href: "/informasi", label: "Info Program" },
                { href: "/daftar", label: "Daftar Magang" },
                { href: "/cek-status", label: "Cek Status Lamaran" },
                { href: "/login", label: "Masuk" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-slate-400 transition hover:text-sky-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tim Pengembang Sistem */}
          <div className="lg:col-span-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Tim Pengembang Sistem
            </h3>
            <ul className="mt-4 space-y-3">
              {developers.map((dev) => (
                <li key={dev.name} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 text-xs font-bold text-navy-900">
                    {dev.initial}
                  </span>
                  <span className="text-sm text-slate-300">{dev.name}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Pengembang Sistem Pendaftaran Magang &amp; PKL LEMIGAS.
            </p>
          </div>

          {/* Kontak */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Kontak
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li className="leading-6">
                Jl. Ciledug Raya No. 109, Cipulir, Kebayoran Lama, Jakarta
                Selatan 12230
              </li>
              <li>Telp: (021) 7394422</li>
              <li>Email: humas@lemigas.esdm.go.id</li>
            </ul>
          </div>
        </div>

        {/* Bar bawah */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
          <p>
            Hak Cipta &copy; {new Date().getFullYear()}{" "}
            <span className="text-slate-200">
              Balai Besar Pengujian Minyak dan Gas Bumi (LEMIGAS)
            </span>
            . Seluruh hak dilindungi.
          </p>
          <p>
            Sistem Magang &amp; PKL
            <span className="text-slate-300"> LEMIGAS Magang</span>
          </p>
        </div>
      </div>
    </footer>
  );
}