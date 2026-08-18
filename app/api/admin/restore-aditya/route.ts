import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayString, toUtcDate } from "@/lib/dates";

const ADITYA_EMAIL = "dfxadit123@gmail.com";
const UNIT_DEFAULT = "Bagian SDM & Umum";

// Route satu kali pakai (hanya ADMIN) untuk mengembalikan akun Aditya Sanjaya
// sebagai peserta aktif: membuat/memperbarui Pendaftar + Peserta, menetapkan
// status PESERTA_AKTIF, dan menghubungkannya ke unit kerja & mentor.
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cari akun Aditya; bila belum ada (mis. setelah reset DB), buat dengan
  // password acak karena login via Google akan memprovisi akun tersebut.
  let user = await prisma.user.findUnique({ where: { email: ADITYA_EMAIL } });
  if (!user) {
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
    user = await prisma.user.create({
      data: {
        nama: "Aditya Sanjaya",
        email: ADITYA_EMAIL,
        passwordHash,
        role: "PENDAFTAR",
        isAktif: true,
      },
    });
  }

  // Pastikan akun berperan peserta/pendaftar agar bisa login ke portal.
  if (user.role !== "PENDAFTAR") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "PENDAFTAR", isAktif: true },
    });
  }

  // Unit kerja tujuan (default: "Bagian SDM & Umum", fallback unit aktif pertama).
  const unit =
    (await prisma.unit.findUnique({ where: { nama: UNIT_DEFAULT } })) ||
    (await prisma.unit.findFirst({ where: { aktif: true }, orderBy: { nama: "asc" } })) ||
    (await prisma.unit.findFirst({ orderBy: { nama: "asc" } }));
  if (!unit) {
    return NextResponse.json(
      { error: "Belum ada unit kerja yang tersedia." },
      { status: 422 }
    );
  }

  // Mentor pembimbing: utamakan mentor di unit yang sama, fallback mentor aktif mana pun.
  const mentor =
    (await prisma.user.findFirst({
      where: { role: "MENTOR", isAktif: true, unitId: unit.id },
    })) ||
    (await prisma.user.findFirst({
      where: { role: "MENTOR", isAktif: true },
    }));

  // Buat Pendaftar bila belum ada (email tidak unik; cari lalu buat/perbarui).
  // berkasCV wajib diisi; dipakai path placeholder karena tidak ada berkas.
  const existingPendaftar = await prisma.pendaftar.findFirst({
    where: { email: user.email },
    orderBy: { createdAt: "asc" },
  });
  const pendaftar = existingPendaftar
    ? await prisma.pendaftar.update({
        where: { id: existingPendaftar.id },
        data: { status: "PESERTA_AKTIF", unitMinatId: unit.id },
      })
    : await prisma.pendaftar.create({
        data: {
          noPendaftaran: `LEMIGAS-${new Date().getFullYear()}-RESTORE`,
          nama: user.nama,
          asalInstansi: "-",
          noHp: "-",
          email: user.email,
          unitMinatId: unit.id,
          berkasCV: "/berkas/restore-aditya.pdf",
          status: "PESERTA_AKTIF",
        },
      });

  // Peserta aktif (upsert per pendaftarId unik).
  const tanggalMulai = toUtcDate(todayString());
  const tanggalSelesai = new Date(tanggalMulai.getTime() + 90 * 86400000);
  await prisma.peserta.upsert({
    where: { pendaftarId: pendaftar.id },
    update: {
      unitId: unit.id,
      tanggalMulai,
      tanggalSelesai,
      mentorId: mentor?.id ?? null,
    },
    create: {
      pendaftarId: pendaftar.id,
      unitId: unit.id,
      tanggalMulai,
      tanggalSelesai,
      mentorId: mentor?.id ?? null,
    },
  });

  // Catatan audit perubahan status.
  await prisma.statusHistory.create({
    data: {
      pendaftarId: pendaftar.id,
      status: "PESERTA_AKTIF",
      catatan: "Dikembalikan sebagai peserta aktif (route restore-aditya).",
      diubahOlehId: session.user.id,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Akun Aditya Sanjaya berhasil diaktifkan kembali sebagai peserta aktif.",
  });
}

export const runtime = "nodejs";
export const maxDuration = 30;