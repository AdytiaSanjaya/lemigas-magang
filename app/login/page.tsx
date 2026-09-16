import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { auth, isGoogleAuthEnabled } from "@/lib/auth";
import LoginRoleSelector from "@/components/forms/login-role-selector";

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
        <div className="max-w-xl w-full">
          {/* Double-quote icon */}
          <svg
            aria-hidden="true"
            className="mb-6 h-14 w-14 text-gray-200"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14 28c-3.3 0-6-2.7-6-6 0-4.4 3.6-8 8-8 1.4 0 2.7.4 3.8 1C17.7 10.4 14.5 7 10.5 7v-4c7.2 0 13.5 5.1 15 12.1-.7-.1-1.3-.1-2-.1-5.5 0-10 4.5-10 10v3h.5ZM36 28c-3.3 0-6-2.7-6-6 0-4.4 3.6-8 8-8 1.4 0 2.7.4 3.8 1C39.7 10.4 36.5 7 32.5 7v-4c7.2 0 13.5 5.1 15 12.1-.7-.1-1.3-.1-2-.1-5.5 0-10 4.5-10 10v3h.5Z"
              fill="currentColor"
            />
          </svg>

          <blockquote className="text-2xl text-gray-800 font-medium leading-relaxed mt-6">
            &ldquo;Magang di sini bukan sekadar rutinitas, ini adalah langkah
            awal membangun insting profesional dan relasi di dunia nyata.&rdquo;
          </blockquote>

          {/* Profile */}
          <div className="flex flex-row items-center gap-4 mt-8">
            <Image
              src="/adit.png"
              alt="Adytia Sanjaya"
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <p className="font-semibold text-gray-900">Adytia Sanjaya</p>
              <p className="text-sm text-gray-500">@adytiasanjaya</p>
            </div>
          </div>
        </div>
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
