import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth, isGoogleAuthEnabled } from "@/lib/auth";
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
        GATEWAY MODE — Centered Card Layout
    ════════════════════════════════════════════ */
    <main className="relative min-h-screen w-full flex items-center justify-center bg-gray-50 p-8">
      {/* ── Back link ── */}
      <Link
        href="/"
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 lg:left-8 lg:top-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Beranda
      </Link>

      {/* White Card Container */}
      <div className="bg-white p-8 rounded-xl shadow-sm max-w-lg w-full">
        <LoginRoleSelector
          callbackUrl={resolvedCallback}
          isGoogleEnabled={isGoogleAuthEnabled}
          mode="gateway"
        />

        <p className="mt-8 text-center text-xs text-gray-400">
          Balai Besar Pengujian Minyak dan Gas Bumi (LEMIGAS)
        </p>
      </div>
    </main>
  );
}
