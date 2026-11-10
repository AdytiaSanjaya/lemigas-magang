import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserIdBySession } from "@/lib/peserta";
import { detectMimeFromBuffer } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 20;

// Penyaji lampiran pengajuan izin (data URL Base64 di LeaveRequest.attachmentUrl).
//
// Mengapa lewat route ini, bukan <a href="data:...;base64,..."> langsung:
// - Chrome/Safari memblokir navigasi top-level ke data: URL, sehingga tab baru
//   yang terbuka KOSONG (bug "Lihat lampiran membuka tab kosong").
// - Content-Type ditentukan dari magic bytes isi berkas, sehingga gambar tampil
//   sebagai gambar dan PDF tampil sebagai PDF (tanpa MIME mismatch).
// - Berkas terpotong/korup terdeteksi di sini (410) alih-alih dirender rusak.
// Akses: ADMIN bebas; PENDAFTAR/PESERTA hanya miliknya sendiri; MENTOR hanya
// lampiran peserta bimbingannya (skoping sama dengan PATCH /api/mentor/izin).

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Cek penanda akhir berkas agar base64 yang terpotong/korup tidak dirender.
function lampiranLengkap(buf: Buffer, mime: string): boolean {
  if (buf.length === 0) return false;
  if (mime === "application/pdf") {
    // PDF wajib ditutup penanda %%EOF (dicari longgar di 2KB terakhir).
    const tail = buf.subarray(Math.max(0, buf.length - 2048)).toString("latin1");
    return tail.includes("%%EOF");
  }
  if (mime === "image/jpeg") {
    // JPEG ditutup penanda EOI (FF D9) — cari longgar di 64 byte terakhir.
    const tail = buf.subarray(Math.max(0, buf.length - 64));
    for (let i = 0; i + 1 < tail.length; i++) {
      if (tail[i] === 0xff && tail[i + 1] === 0xd9) return true;
    }
    return false;
  }
  if (mime === "image/png") {
    // PNG ditutup chunk IEND + CRC (AE 42 60 82).
    const tail = buf.subarray(Math.max(0, buf.length - 12)).toString("latin1");
    return tail.includes("IEND");
  }
  return true;
}

async function bolehAkses(
  session: Session,
  izin: { id: string; userId: string }
): Promise<boolean> {
  const role = session.user.role;
  if (role === "ADMIN") return true;

  if (role === "PENDAFTAR" || role === "PESERTA") {
    const userId = await getUserIdBySession(session);
    return Boolean(userId) && userId === izin.userId;
  }

  if (role === "MENTOR") {
    const pemohon = await prisma.user.findUnique({
      where: { id: izin.userId },
      select: { email: true },
    });
    if (!pemohon) return false;
    const peserta = await prisma.peserta.findFirst({
      where: { pendaftar: { email: pemohon.email.toLowerCase().trim() } },
      select: { mentorId: true },
    });
    return peserta?.mentorId === session.user.id;
  }

  return false;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return jsonError("Unauthorized", 401);
  }

  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) {
    return jsonError("Id lampiran tidak valid.", 400);
  }

  const izin = await prisma.leaveRequest
    .findUnique({
      where: { id },
      select: { id: true, userId: true, attachmentUrl: true },
    })
    .catch(() => null);
  if (!izin) {
    return jsonError("Pengajuan tidak ditemukan.", 404);
  }

  const authorized = await bolehAkses(session, izin).catch(() => false);
  if (!authorized) {
    return jsonError("Forbidden", 403);
  }

  const source = izin.attachmentUrl;
  if (!source || !source.startsWith("data:")) {
    // Rekaman lama menyimpan path filesystem (/berkas/...) yang sudah tidak
    // tersedia di serverless — laporkan jelas, jangan biarkan tab kosong.
    return jsonError("Lampiran lama sudah tidak tersedia.", 410);
  }

  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(source);
  if (!match) {
    return jsonError("Format lampiran tidak valid (bukan data URL Base64).", 410);
  }

  const buf = Buffer.from(match[2], "base64");
  if (buf.length === 0) {
    return jsonError("Lampiran kosong atau rusak.", 410);
  }

  // Tentukan MIME dari isi berkas sebenarnya (magic bytes), bukan dari string
  // yang tersimpan — menetralkan MIME mismatch lampiran lama.
  const mime = detectMimeFromBuffer(new Uint8Array(buf.subarray(0, 16)));
  if (!mime || !["application/pdf", "image/jpeg", "image/png"].includes(mime)) {
    return jsonError("Tipe lampiran tidak didukung.", 415);
  }

  if (!lampiranLengkap(buf, mime)) {
    return jsonError(
      "Lampiran tidak lengkap atau terpotong. Silakan ajukan ulang dengan berkas yang utuh.",
      410
    );
  }

  const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="lampiran-izin-${izin.id}.${ext}"`,
      "Content-Length": String(buf.length),
      "X-Content-Type-Options": "nosniff",
      // Jangan simpan di cache browser: lampiran bersifat privat.
      "Cache-Control": "private, no-store",
    },
  });
}
