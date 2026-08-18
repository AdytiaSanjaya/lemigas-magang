import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { izinSchema } from "@/lib/validation/presensi";
import { getPesertaBySession } from "@/lib/peserta";
import { toUtcDate } from "@/lib/dates";
import { validateUploadFile } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

// Pengajuan izin / sakit peserta. Menggunakan multipart form agar dapat
// melampirkan bukti pendukung (PDF/JPG, opsional, maks. 2MB).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PENDAFTAR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const peserta = await getPesertaBySession(session);
  if (!peserta) {
    return NextResponse.json(
      { error: "Akun Anda belum terdaftar sebagai peserta aktif." },
      { status: 403 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const raw = {
    type: String(form.get("type") ?? ""),
    startDate: String(form.get("startDate") ?? ""),
    endDate: String(form.get("endDate") ?? ""),
    reason: String(form.get("reason") ?? ""),
  };

  const parsed = izinSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validasi gagal.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const startDate = toUtcDate(parsed.data.startDate);
  const endDate = toUtcDate(parsed.data.endDate);
  if (endDate < startDate) {
    return NextResponse.json(
      { error: "Tanggal selesai tidak boleh sebelum tanggal mulai." },
      { status: 422 }
    );
  }

  // Cegah tumpang-tindih dengan pengajuan yang masih aktif.
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });
  if (overlap) {
    return NextResponse.json(
      { error: "Ada pengajuan izin yang masih aktif pada rentang tanggal tersebut." },
      { status: 422 }
    );
  }

  // Lampiran bukti (opsional): verifikasi tipe asli file (magic bytes), lalu
  // simpan sebagai data URL di database (tanpa filesystem, aman di Vercel).
  const attachment = form.get("attachment") as File | null;
  let attachmentUrl: string | null = null;
  if (attachment && attachment.size > 0) {
    const result = await validateUploadFile(attachment, ["application/pdf", "image/jpeg"]);
    if (!result.ok) {
      return NextResponse.json({ error: `Lampiran: ${result.error}` }, { status: 422 });
    }
    attachmentUrl = `data:${result.mime};base64,${result.buffer!.toString("base64")}`;
  }

  const record = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      type: parsed.data.type as "IZIN" | "SAKIT",
      startDate,
      endDate,
      reason: parsed.data.reason,
      attachmentUrl,
    },
  });

  return NextResponse.json(
    { message: "Pengajuan berhasil dikirim dan menunggu persetujuan mentor.", record },
    { status: 201 }
  );
}
