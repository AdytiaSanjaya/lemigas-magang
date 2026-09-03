import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth, isGoogleAuthEnabled } from "@/lib/auth";
import GoogleSignInButton from "@/components/forms/google-sign-in-button";
import LembagasLogo from "@/components/lemigas-logo";

// Halaman beranda per role saat sudah login tanpa callbackUrl.
const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  MENTOR: "/mentor/peserta",
  PENDAFTAR: "/peserta/dashboard",
};

// Cegah open-redirect: hanya terima callbackUrl internal.
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

  // Jika sudah login, langsung diarahkan ke callbackUrl (mis. dari portal
  // peserta) atau ke dashboard sesuai role; bukan ke halaman beranda.
  if (session?.user) {
    redirect(safeCallbackUrl(callbackUrl) ?? ROLE_HOME[session.user.role] ?? "/peserta/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl"
      />

      <Link
        href="/"
        className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/60 px-4 py-2 text-xs font-medium text-slate-200 backdrop-blur-md transition-all hover:bg-slate-800 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Beranda
      </Link>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-2xl md:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/70">
            <LembagasLogo className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-zinc-900">
            LEMIGAS Magang
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Sistem Pendaftaran &amp; Manajemen Data Peserta Magang/PKL
          </p>
          <div className="mx-auto mt-6 h-px w-14 bg-zinc-200" />
        </div>

        <div className="mt-8">
          {isGoogleAuthEnabled ? (
            <GoogleSignInButton callbackUrl={safeCallbackUrl(callbackUrl) ?? "/peserta/dashboard"} />
          ) : null}
          {/* Credential login form di-hide khusus alur pendaftar magang. */}
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400">
          Balai Besar Pengujian Minyak dan Gas Bumi (LEMIGAS)
        </p>
      </div>
    </main>
  );
}
