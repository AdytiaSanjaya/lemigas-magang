import { PrismaClient } from "@prisma/client";

// Connection pooling Prisma: di production, gunakan satu instance client yang
// dipakai bersama (singleton) agar koneksi database tidak membengkak saat banyak
// pengguna mengakses secara bersamaan. Prisma sudah menerapkan connection pool
// internal dengan ukuran default sesuai CPU.
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

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;