import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { auth, isGoogleAuthEnabled } from "@/lib/auth";
import LembagasLogo from "@/components/lemigas-logo";
import LoginRoleSelector from "@/components/forms/login-role-selector";
import LoginQuoteCarousel from "@/app/login/login-quote-carousel";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  MENTOR: "/mentor/peserta",
  PENDAFTAR: "/peserta/dashboard",
};

function safeCallbackUrl(callbackUrl?: string): string | null {
  if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  let session;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  const { callbackUrl } = await searchParams;

  if (session?.user) {
    redirect(safeCallbackUrl(callbackUrl) ?? ROLE_HOME[session.user.role] ?? "/peserta/dashboard");
  }

  const resolvedCallback = safeCallbackUrl(callbackUrl) ?? "/peserta/dashboard";
  const isRegistrationFlow = resolvedCallback.startsWith("/daftar");

  return isRegistrationFlow ? (
    /* ════════════════════════════════════════════
        REGISTRATION MODE — Asymmetric 40:60 Split
    ════════════════════════════════════════════ */
    <main className="relative min-h-screen w-full flex flex-col lg:flex-row">
      {/* ── Back link ── */}
      <Link
        href="/"
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 lg:left-8 lg:top-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Beranda
      </Link>

      {/* LEFT COLUMN — Login Area (40%) */}
      <section className="w-full lg:w-2/5 flex flex-col justify-center items-center min-h-screen lg:min-h-0 bg-white p-8">
        <div className="w-full max-w-sm flex flex-col items-center">
          <LoginRoleSelector
            callbackUrl={resolvedCallback}
            isGoogleEnabled={isGoogleAuthEnabled}
            mode="registration"
          />

          <p className="mt-8 text-center text-xs text-gray-400">
            Balai Besar Pengujian Minyak dan Gas Bumi (LEMIGAS)
          </p>
        </div>
      </section>

      {/* RIGHT COLUMN — Quote Area (60%) */}
      <section className="hidden lg:flex w-full lg:w-3/5 bg-[#F9FAFB] flex-col justify-center items-center p-12 border-l border-gray-200">
        <LoginQuoteCarousel />
      </section>
    </main>
  ) : (
    /* ════════════════════════════════════════════
        GATEWAY MODE — Split-Screen (desktop) / Stacked (mobile)
    ════════════════════════════════════════════ */
    <main className="relative grid h-screen w-full grid-cols-1 lg:grid-cols-2">
      {/* ── LEFT COLUMN — Branding LEMIGAS ── */}
      <section className="relative flex h-full flex-col justify-center overflow-hidden bg-navy-900 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        {/* Dekorasi lembut */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-yellow-400/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-navy-700/50 blur-3xl"
        />

        {/* Logo kiri-atas */}
        <div className="relative z-10 flex items-center gap-3">
          <LembagasLogo className="h-11 w-11" />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide text-white">LEMIGAS</p>
            <p className="text-[11px] text-slate-400">Balai Besar Pengujian Minyak dan Gas</p>
          </div>
        </div>

        {/* Teks branding — tengah vertikal */}
        <div className="relative z-10 flex flex-1 flex-col justify-center py-14 lg:py-16">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-yellow-400"
            />
            Program Magang &amp; PKL
          </span>
          {/* Garis aksen kuning */}
          <div className="mt-6 mb-6 h-1 w-12 rounded-full bg-yellow-500" aria-hidden="true" />
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            LEMIGAS
            <br />
            Magang
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-400 sm:text-base">
            Sistem manajemen program magang di Balai Besar Pengujian Minyak dan
            Gas Bumi.
          </p>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} Balai Besar Pengujian Minyak dan Gas Bumi
        </p>
      </section>

      {/* ── RIGHT COLUMN — Form / Tombol Login ── */}
      <section className="relative flex h-full flex-col justify-center overflow-y-auto bg-white px-6 py-6 sm:px-10 lg:px-12">
        {/* Navigasi atas — pojok kiri atas area putih */}
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
        </div>

        {/* Konten tengah */}
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <LoginRoleSelector
              callbackUrl={resolvedCallback}
              isGoogleEnabled={isGoogleAuthEnabled}
              mode="gateway"
            />
          </div>
        </div>

        {/* Footer area putih — paling bawah */}
        <div className="relative z-10 mx-auto w-full max-w-md">
          <p className="text-center text-xs text-slate-400">
            <Lock
              className="mr-2 inline-block h-4 w-4 align-middle text-slate-400"
              aria-hidden="true"
            />
            Akses hanya untuk peserta terdaftar.{" "}
            <a
              href="https://wa.me/6289527821564?text=Halo%20Admin%20Magang%20LEMIGAS,%20saya%20butuh%20bantuan%20terkait%20akses%20login."
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-500 underline underline-offset-2 transition-colors hover:text-slate-700"
            >
              Butuh bantuan?
            </a>
          </p>
          <p className="mt-2.5 text-center text-[11px] text-gray-400">
            Balai Besar Pengujian Minyak dan Gas Bumi (LEMIGAS)
          </p>
        </div>
      </section>
    </main>
  );
}
