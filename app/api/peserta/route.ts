import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { pesertaUpdateSchema } from "@/lib/validation/peserta";

export const runtime = "nodejs";

async function isAdmin() {
  const s = await auth();
  return s?.user?.role === "ADMIN";
}

// Perbarui data peserta aktif (unit, tanggal, mentor).
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = pesertaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validasi gagal.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { pesertaId, unitId, tanggalMulai, tanggalSelesai, mentorId, catatan } = parsed.data;
  const mulai = new Date(tanggalMulai);
  const selesai = new Date(tanggalSelesai);

  if (isNaN(mulai.getTime()) || isNaN(selesai.getTime()) || selesai <= mulai) {
    return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 422 });
  }

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  const mentor = mentorId ? await prisma.user.findUnique({ where: { id: mentorId } }) : null;
  if (!unit || !unit.aktif) return NextResponse.json({ error: "Unit tidak tersedia." }, { status: 422 });
  if (mentorId && (!mentor || mentor.role !== "MENTOR")) {
    return NextResponse.json({ error: "Mentor tidak valid." }, { status: 422 });
  }

  const updated = await prisma.peserta.update({
    where: { id: pesertaId },
    data: {
      unitId,
      tanggalMulai: mulai,
      tanggalSelesai: selesai,
      mentorId: mentorId ?? null,
      catatan: catatan ?? null,
    },
  });

  return NextResponse.json({ message: "Peserta diperbarui.", id: updated.id });
}

// Terima daftar peserta (dengan pagination) untuk panel admin.
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = 10;
  const unitId = url.searchParams.get("unitId") ?? "";
  const q = url.searchParams.get("q")?.trim() ?? "";

  const where: Prisma.PesertaWhereInput = {
    ...(unitId ? { unitId } : {}),
    ...(q
      ? { pendaftar: { nama: { contains: q, mode: "insensitive" } } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.peserta.findMany({
      where,
      include: { pendaftar: true, unit: true, mentor: { select: { nama: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.peserta.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

// Hapus peserta aktif (mengembalikan status pendaftar ke MENUNGGU).
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as { pesertaId?: string };
  if (!body.pesertaId) {
    return NextResponse.json({ error: "pesertaId wajib." }, { status: 422 });
  }

  await prisma.$transaction(async (tx) => {
    const peserta = await tx.peserta.findUnique({ where: { id: body.pesertaId } });
    if (!peserta) throw new Error("not_found");
    await tx.peserta.delete({ where: { id: body.pesertaId } });
    await tx.pendaftar.update({
      where: { id: peserta.pendaftarId },
      data: { status: "MENUNGGU" },
    });
  });

  return NextResponse.json({ message: "Peserta dihapus, status pendaftar dikembalikan ke Menunggu." });
}
