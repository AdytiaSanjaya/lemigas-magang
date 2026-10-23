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

// Security headers yang diterapkan ke semua respon (PWA/OWASP) — AUD-27.
const isDev = process.env.NODE_ENV === "development";

const securityHeaders: Record<string, string> = {
  // AUD-27: `https:` DIHAPUS dari script-src — semua aset skrip dihasilkan
  // sendiri oleh Next.js ('self'), sehingga skrip dari origin HTTPS asing
  // tidak lagi boleh dieksekusi. 'unsafe-inline' masih dipertahankan karena
  // App Router merender payload/hydration lewat <script> inline (migrasi ke
  // nonce/hash adalah peningkatan lanjutan).
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    // 'unsafe-inline' dibutuhkan atribut style (recharts, utilitas inline).
    "style-src 'self' 'unsafe-inline'",
    // Gambar: aset lokal + data URL (dokumen base64) + blob (pratinjau berkas).
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Hanya XHR/fetch ke origin sendiri. Di development ditambah ws:/wss:
    // agar Hot Module Replacement (Turbopack) tidak diblokir.
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Naikkan request http → https di produksi (localhost bersifat
    // "potentially trustworthy" sehingga aman untuk development).
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  // Nilai dipertahankan >= permintaan audit (31536000) + preload; guardrail
  // melarang penurunan kekuatan header keamanan.
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

function isStateChanging(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

// Semua response (baik halaman/API yang dilanjutkan maupun error CSRF) wajib
// membawa security headers — termasuk response error agar tidak "telanjang".
function denganSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = denganSecurityHeaders(NextResponse.next());

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
          return denganSecurityHeaders(
            NextResponse.json({ error: "Cross-site request ditolak." }, { status: 403 })
          );
        }
      } catch {
        return denganSecurityHeaders(
          NextResponse.json({ error: "Origin tidak valid." }, { status: 403 })
        );
      }
    }
  }

  return response;
}