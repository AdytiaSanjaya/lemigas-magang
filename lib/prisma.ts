import { PrismaClient } from "@prisma/client";

// Connection pooling Prisma: gunakan satu instance client yang dipakai bersama
// (singleton) di seluruh modul dan reuse lintas request pada serverless instance
// yang sama (Vercel). Instance disimpan di globalThis agar koneksi database tidak
// membengkak saat banyak pengguna mengakses secara bersamaan.
//
// Untuk production berskala besar, kombinasikan dengan PgBouncer/Neon/Supabase
// (pooler URL) pada DATABASE_URL agar pool tidak melampaui batas koneksi DB.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;