import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSertifikatByEmail } from "@/lib/peserta";
import { uploadDir } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

// Nama berkas unduhan yang aman (tanpa karakter aneh dari input user).
function downloadFilename(nama: string): string {
  const clean = nama
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `Sertifikat-${clean || "Magang"}.pdf`;
}

function pdfResponse(data: Buffer, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

// Unduh sertifikat magang (PDF).
// - Role PENDAFTAR: hanya boleh mengunduh sertifikat miliknya sendiri.
// - Role ADMIN: dapat mengunduh sertifikat peserta mana pun via ?pesertaId=.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as string;
  if (role !== "ADMIN" && role !== "PENDAFTAR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let source: string | null = null;
  let nama = "Magang";

  try {
    if (role === "ADMIN") {
      const pesertaId = req.nextUrl.searchParams.get("pesertaId");
      if (!pesertaId) {
        return NextResponse.json({ error: "Parameter pesertaId wajib diisi." }, { status: 400 });
      }
      const peserta = await prisma.peserta.findUnique({
        where: { id: pesertaId },
        select: { sertifikatUrl: true, pendaftar: { select: { nama: true } } },
      });
      source = peserta?.sertifikatUrl ?? null;
      nama = peserta?.pendaftar?.nama ?? "Magang";
    } else {
      // Peserta: ambil data milik sendiri berdasarkan email session.
      const peserta = await getSertifikatByEmail(session.user.email ?? null);
      source = peserta?.sertifikatUrl ?? null;
      nama = peserta?.pendaftar?.nama ?? "Magang";
    }
  } catch {
    return NextResponse.json({ error: "Gagal memuat sertifikat." }, { status: 500 });
  }

  if (!source || !source.trim()) {
    return NextResponse.json(
      { error: "Sertifikat belum tersedia. Hubungi admin magang." },
      { status: 404 }
    );
  }

  const filename = downloadFilename(nama);

  // Sertifikat baru: tersimpan sebagai data URL (base64) di database.
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/.exec(source);
  if (dataUrlMatch) {
    const data = Buffer.from(dataUrlMatch[2], "base64");
    if (data.length === 0) {
      return NextResponse.json({ error: "Berkas sertifikat kosong." }, { status: 404 });
    }
    return pdfResponse(data, filename);
  }

  // Rekaman lama: path "/berkas/<nama>" di filesystem. Hanya nama berkas aman
  // yang diizinkan (mencegah path traversal).
  const storedName = source.split(/[/\\]/).pop() ?? "";
  if (!/^file-[a-f0-9]+\.(pdf|jpg|jpeg)$/i.test(storedName)) {
    return NextResponse.json({ error: "Format berkas sertifikat tidak dikenal." }, { status: 404 });
  }
  try {
    const data = await readFile(path.join(process.cwd(), uploadDir(), storedName));
    return pdfResponse(data, filename);
  } catch {
    return NextResponse.json({ error: "Berkas sertifikat tidak ditemukan." }, { status: 404 });
  }
}
