import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { evaluasiSchema } from "@/lib/validation/evaluasi";

export const runtime = "nodejs";
export const maxDuration = 20;

// Penilaian peserta oleh mentor pembimbingnya.
export async function POST(req: NextRequest) {
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

  const parsed = evaluasiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validasi gagal.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const peserta = await prisma.peserta.findUnique({
    where: { id: parsed.data.pesertaId },
    select: { id: true, mentorId: true },
  });
  if (!peserta) {
    return NextResponse.json({ error: "Peserta tidak ditemukan." }, { status: 404 });
  }
  if (peserta.mentorId !== session.user.id) {
    return NextResponse.json(
      { error: "Anda bukan mentor pembimbing dari peserta ini." },
      { status: 403 }
    );
  }

  const record = await prisma.evaluasi.create({
    data: {
      pesertaId: peserta.id,
      kedisiplinan: parsed.data.kedisiplinan,
      keaktifan: parsed.data.keaktifan,
      kinerja: parsed.data.kinerja,
      catatan: parsed.data.catatan ?? null,
      dinilaiOlehId: session.user.id,
    },
  });

  return NextResponse.json({ message: "Penilaian berhasil disimpan.", record });
}
