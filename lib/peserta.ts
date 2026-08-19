import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

// Query peserta aktif yang sering dipanggil (layout + halaman + API route dalam
// request yang sama) dibungkus React.cache() agar query Prisma di-dedup per
// request — dikunci berdasarkan email, sehingga tidak berulang saat layout dan
// halaman mengunduh profil yang sama sekaligus.
export const getPesertaByEmail = cache(async (email: string | null) => {
  if (!email) return null;
  return prisma.peserta.findFirst({
    where: { pendaftar: { email: email.toLowerCase().trim() } },
    select: {
      id: true,
      pendaftarId: true,
      unitId: true,
      mentorId: true,
      tanggalMulai: true,
      tanggalSelesai: true,
      unit: { select: { nama: true } },
      mentor: { select: { nama: true } },
      pendaftar: { select: { email: true } },
    },
  });
});

// Mencari data Peserta aktif yang terhubung dengan akun yang sedang login.
// Penghubungnya adalah email: User.email (akun Google/kredensial) sama dengan
// Pendaftar.email, lalu Peserta terhubung via pendaftarId.
export async function getPesertaBySession(session: Session | null) {
  return getPesertaByEmail(session?.user?.email ?? null);
}
