import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth, isGoogleAuthEnabled } from "@/lib/auth";
import LoginRoleSelector from "@/components/forms/login-role-selector";

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

  const resolvedCallback = safeCallbackUrl(callbackUrl) ?? "/peserta/dashboard";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-navy-900 via-slate-800 to-navy-950 p-4">
      {/* Decorative blurs */}
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

      {/* Back link */}
      <Link
        href="/"
        className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/60 px-4 py-2 text-xs font-medium text-slate-200 backdrop-blur-md transition-all hover:bg-slate-800 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Beranda
      </Link>

      {/* Main card */}
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center rounded-2xl border border-slate-100 bg-white p-8 shadow-2xl md:p-10">
        <LoginRoleSelector
          callbackUrl={resolvedCallback}
          isGoogleEnabled={isGoogleAuthEnabled}
        />

        <p className="mt-8 text-center text-xs text-slate-400">
          Balai Besar Pengujian Minyak dan Gas Bumi (LEMIGAS)
        </p>
      </div>
    </main>
  );
}
