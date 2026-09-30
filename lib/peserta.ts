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
      pendaftar: { select: { email: true, nama: true } },
    },
  });
});

// Mencari data Peserta aktif yang terhubung dengan akun yang sedang login.
// Penghubungnya adalah email: User.email (akun Google/kredensial) sama dengan
// Pendaftar.email, lalu Peserta terhubung via pendaftarId.
export async function getPesertaBySession(session: Session | null) {
  return getPesertaByEmail(session?.user?.email ?? null);
}

// Cek apakah email sudah tercatat sebagai pendaftar. Setiap Peserta aktif
// selalu punya relasi wajib ke Pendaftar, jadi cek ke tabel Pendaftar sudah
// mewakili keduanya. Dipakai guard requirePeserta() untuk menghalau akun
// (mis. login Google) yang belum pernah mendaftar masuk portal peserta.
export const isEmailTerdaftar = cache(async (email: string | null): Promise<boolean> => {
  if (!email) return false;
  try {
    const pendaftar = await prisma.pendaftar.findFirst({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });
    return Boolean(pendaftar);
  } catch {
    // Gagal DB: jangan blokir akses (konsisten dengan fallback di lib/auth.ts).
    return true;
  }
});

// Ambil User.id ASLI dari database berdasarkan email session (NextAuth).
// `session.user.id` untuk akun Google OAuth berisi Google `sub` (bukan primary
// key Prisma), sehingga TIDAK boleh dipakai sebagai FK (Attendance, LeaveRequest).
// Seluruh query presensi/izin harus memakai User.id hasil resolver ini agar
// match persis dengan data yang disimpan saat create.
export const getUserIdByEmail = cache(async (email: string | null) => {
  if (!email) return null;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true },
  });
  return user?.id ?? null;
});

export async function getUserIdBySession(session: Session | null) {
  return getUserIdByEmail(session?.user?.email ?? null);
}
