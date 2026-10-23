import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AUD-27: aset statis dikecualikan dari middleware (lihat matcher di
  // middleware.ts), jadi nosniff untuk berkas /_next/static dipasang di sini
  // agar semua response tetap terlindungi tanpa biaya middleware per-request.
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
};

export default nextConfig;
