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
      // Penilaian mentor terbaru (read-only): hanya 1 baris terakhir + kolom
      // yang dirender di Dasbor Peserta ("Hasil Evaluasi Kinerja").
      evaluasi: {
        select: { kedisiplinan: true, keaktifan: true, kinerja: true, catatan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
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

// Cek apakah peserta punya sertifikat magang. Hanya mengambil boolean (id saja)
// sehingga isi berkas (data URL PDF) yang berukuran besar tidak ikut dimuat
// saat render halaman portal peserta.
export const punyaSertifikatByEmail = cache(async (email: string | null): Promise<boolean> => {
  if (!email) return false;
  try {
    const peserta = await prisma.peserta.findFirst({
      where: {
        pendaftar: { email: email.toLowerCase().trim() },
        sertifikatUrl: { not: null },
      },
      select: { id: true },
    });
    return Boolean(peserta);
  } catch {
    return false;
  }
});

// Ambil isi sertifikat (data URL) beserta nama pemilik untuk endpoint unduh
// /api/sertifikat. Terpisah dari getPesertaByEmail agar payload halaman panel
// tetap ringan (berkas PDF tidak ikut di-query saat render).
export const getSertifikatByEmail = cache(async (email: string | null) => {
  if (!email) return null;
  return prisma.peserta.findFirst({
    where: { pendaftar: { email: email.toLowerCase().trim() } },
    select: { sertifikatUrl: true, pendaftar: { select: { nama: true } } },
  });
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

// Status masa magang peserta: "Selesai" bila akhir hari tanggal selesai sudah
// lewat. Patokan sama dengan panel admin (/admin/peserta) dan API sertifikat,
// sehingga status di seluruh aplikasi konsisten. Murni komputasi tanggal —
// tanpa query, tanpa mutasi data.
export function isMagangSelesai(tanggalSelesai: Date, now: Date = new Date()): boolean {
  const batas = new Date(tanggalSelesai);
  batas.setHours(23, 59, 59, 999);
  return batas.getTime() <= now.getTime();
}
