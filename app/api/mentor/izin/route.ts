import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { reviewIzinSchema } from "@/lib/validation/presensi";

export const runtime = "nodejs";
export const maxDuration = 20;

// Persetujuan / penolakan pengajuan izin oleh mentor pembimbing.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MENTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = reviewIzinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validasi gagal.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const izin = await prisma.leaveRequest.findUnique({
    where: { id: parsed.data.izinId },
  });
  if (!izin) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }
  if (izin.status !== "PENDING") {
    return NextResponse.json(
      { error: "Pengajuan ini sudah diproses sebelumnya." },
      { status: 409 }
    );
  }

  // Hanya mentor pembimbing dari peserta tersebut yang boleh memproses.
  const pemohon = await prisma.user.findUnique({ where: { id: izin.userId } });
  if (!pemohon) {
    return NextResponse.json({ error: "Pemohon tidak ditemukan." }, { status: 404 });
  }
  const peserta = await prisma.peserta.findFirst({
    where: { pendaftar: { email: pemohon.email.toLowerCase().trim() } },
  });
  if (!peserta || peserta.mentorId !== session.user.id) {
    return NextResponse.json(
      { error: "Anda bukan mentor pembimbing dari peserta ini." },
      { status: 403 }
    );
  }

  const record = await prisma.leaveRequest.update({
    where: { id: izin.id },
    data: {
      status: parsed.data.status as "APPROVED" | "REJECTED",
      catatanReview: parsed.data.catatan ?? null,
      diprosesOlehId: session.user.id,
    },
  });

  return NextResponse.json({
    message:
      parsed.data.status === "APPROVED"
        ? "Pengajuan disetujui."
        : "Pengajuan ditolak.",
    record,
  });
}
