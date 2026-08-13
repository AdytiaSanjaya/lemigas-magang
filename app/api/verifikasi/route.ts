import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { verifikasiSchema } from "@/lib/validation/verifikasi";
import { sendStatusEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function PATCH(req: NextRequest) {
  // Hanya admin yang boleh mengubah status pendaftar.
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  // Validasi Zod sebelum mengubah data.
  const parsed = verifikasiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validasi gagal.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { pendaftarId, status, catatan, tanggalMulai, tanggalSelesai, mentorId } = parsed.data;

  const pendaftar = await prisma.pendaftar.findUnique({
    where: { id: pendaftarId },
    include: { unitMinat: true },
  });
  if (!pendaftar) {
    return NextResponse.json({ error: "Pendaftar tidak ditemukan." }, { status: 404 });
  }

  // Validasi tanggal (wajib saat DITERIMA untuk pencatatan peserta).
  let mulai: Date | null = null;
  let selesai: Date | null = null;
  if (status === "DITERIMA") {
    if (!tanggalMulai || !tanggalSelesai) {
      return NextResponse.json(
        { error: "Tanggal mulai & selesai wajib diisi saat pendaftar diterima." },
        { status: 422 }
      );
    }
    mulai = new Date(tanggalMulai);
    selesai = new Date(tanggalSelesai);
    if (isNaN(mulai.getTime()) || isNaN(selesai.getTime()) || selesai <= mulai) {
      return NextResponse.json(
        { error: "Rentang tanggal tidak valid." },
        { status: 422 }
      );
    }
  }

  // Simpan perubahan status + riwayat dalam satu transaksi.
  await prisma.$transaction(async (tx) => {
    await tx.pendaftar.update({
      where: { id: pendaftarId },
      data: {
        status,
        catatan: catatan ?? null,
        diprosesAdminId: session.user.id,
      },
    });

    await tx.statusHistory.create({
      data: {
        pendaftarId,
        status,
        catatan: catatan ?? null,
        diubahOlehId: session.user.id,
      },
    });

    if (status === "DITERIMA") {
      const existing = await tx.peserta.findUnique({ where: { pendaftarId } });
      if (existing) {
        await tx.peserta.update({
          where: { pendaftarId },
          data: {
            unitId: pendaftar.unitMinatId,
            tanggalMulai: mulai!,
            tanggalSelesai: selesai!,
            mentorId: mentorId || null,
          },
        });
      } else {
        await tx.peserta.create({
          data: {
            pendaftarId,
            unitId: pendaftar.unitMinatId,
            tanggalMulai: mulai!,
            tanggalSelesai: selesai!,
            mentorId: mentorId || null,
          },
        });
      }
    }
  });

  // Kirim notifikasi email (di development hanya log ke console).
  await sendStatusEmail({
    to: pendaftar.email,
    noPendaftaran: pendaftar.noPendaftaran,
    nama: pendaftar.nama,
    status,
    catatan: catatan ?? undefined,
  });

  return NextResponse.json({ message: "Status pendaftar diperbarui." });
}