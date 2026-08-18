import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Matcher: terapkan middleware ke semua route kecuali asset statis/API auth.
export const config = {
  matcher: [
    /*
     * Semua route kecuali:
     * - file statis di /_next/static, /_next/image
     * - favicon
     * - image assets (svg/png/jpg/jpeg/gif/webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// Security headers yang diterapkan ke semua respon (PWA/OWASP).
const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https:", // Tailwind/Next injects some inline scripts
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

// Halaman beranda per role (mengikuti folder fisik aplikasi).
const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  MENTOR: "/mentor/peserta",
  PENDAFTAR: "/peserta/dashboard",
};

// Path publik/auth/aset yang TIDAK boleh kena guard redirect ke /login,
// agar tidak terjadi loop redirect.
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/login") ||
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/informasi") ||
    pathname === "/unauthorized" ||
    pathname.startsWith("/cek-status") ||
    pathname.startsWith("/daftar")
  );
}

// Cegah open-redirect: hanya terima callbackUrl internal.
function safeCallbackUrl(value?: string | null): string | null {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return null;
}

function isStateChanging(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Terapkan security headers pada semua response.
  Object.entries(securityHeaders).forEach(([header, value]) => {
    response.headers.set(header, value);
  });

  // --- CSRF protection ---
  // Untuk request penulisan (POST/PUT/PATCH/DELETE) ke /api (kecuali /api/auth
  // yang dikelola NextAuth), validasi origin. Jika browser mengirim Origin
  // header tapi berbeda dari Host, tolak.
  if (
    isStateChanging(request.method) &&
    pathname.startsWith("/api") &&
    !pathname.startsWith("/api/auth")
  ) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json(
            { error: "Cross-site request ditolak." },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json({ error: "Origin tidak valid." }, { status: 403 });
      }
    }
  }

  // --- Role-based route guard (first line). Server akan memverifikasi lagi. ---
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const role = (token?.role as string | undefined) ?? null;

  // Pengguna yang sudah login tidak perlu melihat halaman login.
  // Arahkan ke callbackUrl yang aman atau dashboard sesuai perannya.
  if (token && pathname === "/login") {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    const target =
      safeCallbackUrl(callbackUrl) ??
      (role ? ROLE_HOME[role] : null) ??
      "/peserta/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Rute publik tidak boleh di-redirect ke /login (hindari loop).
  if (isPublicPath(pathname)) {
    return response;
  }

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isMentorRoute = pathname === "/mentor" || pathname.startsWith("/mentor/");
  const isPesertaRoute = pathname === "/peserta" || pathname.startsWith("/peserta/");

  if (!isAdminRoute && !isMentorRoute && !isPesertaRoute) {
    return response;
  }

  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (isMentorRoute && role !== "MENTOR") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (isPesertaRoute && role !== "PENDAFTAR") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // /admin tidak memiliki page (hanya layout) → default ke dashboard.
  if (isAdminRoute && pathname === "/admin" && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return response;
}