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

// Rute yang SELALU lolos tanpa cek token / guard redirect (mencegah loop).
function isBypassPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/informasi") ||
    pathname.startsWith("/daftar") ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/admin/setup" ||
    pathname.startsWith("/api/admin/setup/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
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

  // Rute publik/auth/aset selalu lolos — tidak ada redirect di sini.
  if (isBypassPath(pathname)) {
    return response;
  }

  // --- CSRF protection (rute /api selain yang di-bypass di atas) ---
  // Untuk request penulisan (POST/PUT/PATCH/DELETE), validasi origin. Jika
  // browser mengirim Origin header tapi berbeda dari Host, tolak.
  if (isStateChanging(request.method) && pathname.startsWith("/api")) {
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

  // Halaman login: saat belum login biarkan lewat; saat sudah login arahkan
  // ke dashboard sesuai peran (tanpa callbackUrl berantai).
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return response;
    }
    const role = (token?.role as string | undefined) ?? null;
    const target = (role && ROLE_HOME[role]) ?? "/peserta/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // --- Role-based route guard (first line). Server akan memverifikasi lagi. ---
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isMentorRoute = pathname === "/mentor" || pathname.startsWith("/mentor/");
  const isPesertaRoute = pathname === "/peserta" || pathname.startsWith("/peserta/");

  if (!isAdminRoute && !isMentorRoute && !isPesertaRoute) {
    return response;
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const role = (token?.role as string | undefined) ?? null;

  // Belum login → ke /login TANPA callbackUrl agar tidak berantai.
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
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