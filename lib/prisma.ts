import { PrismaClient } from "@prisma/client";

// Singleton PrismaClient (lihat .agents/skills/lemigas-guardrail.md):
// satu instance client dipakai bersama seluruh modul dan di-cache di globalThis
// agar koneksi Supabase/Postgres di Vercel tidak membengkak saat banyak request
// serverless berjalan bersamaan. Mencegah kebocoran koneksi & jeda saat pindah
// menu. Di production gunakan connection pooling (Supabase pooler / PgBouncer /
// Neon) lewat DATABASE_URL agar jumlah koneksi tetap terkendali.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Cache instance di globalThis agar hot-reload dev / reuse request serverless
// tidak membuat instance PrismaClient baru berulang kali.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
