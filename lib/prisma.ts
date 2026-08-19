import { PrismaClient } from "@prisma/client";

// Singleton PrismaClient (lihat .agents/skills/lemigas-guardrail.md):
// satu instance client dipakai bersama seluruh modul dan di-cache di globalThis
// agar koneksi Supabase/Postgres di Vercel tidak membengkak saat banyak request
// serverless berjalan bersamaan. Mencegah kebocoran koneksi & jeda saat pindah
// menu.
//
// Koneksi:
// - DATABASE_URL (datasource url): koneksi runtime (query) — pakai connection
//   pooler Supabase (PgBouncer/Supavisor, mis. *.pooler.supabase.com) agar
//   jumlah koneksi per fungsi serverless tetap terkendali (disarankan
//   `?pgbouncer=true&connection_limit=1` di Supabase transaction pooler).
// - DIRECT_URL (datasource directUrl): koneksi langsung non-pooling — dipakai
//   Prisma CLI saat migrasi/introspection yang tidak bisa lewat pooler.
//
// Catatan serverless: globalThis persist per warm instance serverless, sehingga
// cache tanpa syarat (termasuk production) memastikan satu PrismaClient per
// instance dipakai ulang antar-request, bukan membuat koneksi baru setiap API
// dipanggil.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Cache instance di globalThis (dev hot-reload & warm serverless instance)
// agar tidak membuat instance PrismaClient baru berulang kali.
globalForPrisma.prisma = prisma;