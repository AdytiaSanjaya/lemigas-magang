import { NextResponse, type NextRequest } from "next/server";

// Matcher: terapkan middleware ke semua route kecuali asset statis.
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
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

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

  // Middleware HANYA menangani rute API internal (kecuali /api/auth yang
  // dikelola NextAuth sendiri). Semua rute halaman (/login, /admin/*,
  // /peserta/*, /mentor/*, dll.) dibiarkan lolos tanpa redirect — proteksi
  // akses dilakukan di Server Component via auth() (getServerSession).
  if (!pathname.startsWith("/api") || pathname.startsWith("/api/auth")) {
    return response;
  }

  // --- CSRF protection ---
  // Untuk request penulisan (POST/PUT/PATCH/DELETE) ke /api, validasi origin.
  // Jika browser mengirim Origin header tapi berbeda dari Host, tolak.
  if (isStateChanging(request.method)) {
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

  return response;
}