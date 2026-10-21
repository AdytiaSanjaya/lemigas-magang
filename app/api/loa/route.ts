import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { uploadDir } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

function pdfResponse(data: Buffer, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

// Endpoint publik untuk mengunduh Surat Balasan (LoA) milik sendiri.
// AMAN: akses dikunci pasangan no. pendaftaran + email (pengetahuan yang sama
// dengan fitur Cek Status), dibatasi rate limit per IP, dan hanya melayani
// pendaftar berstatus DITERIMA / PESERTA_AKTIF yang LoA-nya sudah diunggah
// admin. Tidak pernah mengembalikan data pendaftar lain.
export async function POST(req: NextRequest) {
  // Rate limit untuk mencegah penebakan/spam unduhan.
  const ip = getClientIp(req);
  const rate = await rateLimiter.consume(`loa:${ip}`);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Ulangi dalam 1 menit." },
      { status: 429 }
    );
  }

  let body: { noPendaftaran?: string; email?: string };
  try {
    body = (await req.json()) as { noPendaftaran?: string; email?: string };
  } catch {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const { noPendaftaran, email } = body;
  if (!noPendaftaran || !email) {
    return NextResponse.json({ error: "Lengkapi nomor pendaftaran dan email." }, { status: 422 });
  }

  let source: string | null = null;
  let nama = "";
  try {
    const pendaftar = await prisma.pendaftar.findUnique({
      where: { noPendaftaran: noPendaftaran.trim().toUpperCase() },
      select: {
        email: true,
        nama: true,
        status: true,
        loaUrl: true,
      },
    });

    // Cocokkan email + status diterima + LoA benar-benar ada.
    if (
      pendaftar &&
      pendaftar.email.toLowerCase() === email.trim().toLowerCase() &&
      (pendaftar.status === "DITERIMA" || pendaftar.status === "PESERTA_AKTIF") &&
      pendaftar.loaUrl?.trim()
    ) {
      source = pendaftar.loaUrl;
      nama = pendaftar.nama;
    }
  } catch {
    source = null;
  }

  // Respons generik (tanpa detail) agar tidak membocorkan status data.
  if (!source) {
    return NextResponse.json(
      { error: "Surat Balasan (LoA) tidak tersedia untuk data tersebut." },
      { status: 404 }
    );
  }

  // Nama berkas unduhan yang aman.
  const safeNama =
    nama
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "Magang";
  const safeNo = noPendaftaran.trim().toUpperCase().replace(/[^\w-]/g, "").slice(0, 40);
  const filename = `LoA-${safeNo ? safeNo + "-" : ""}${safeNama}.pdf`;

  // LoA baru: tersimpan sebagai data URL (base64) di database.
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/.exec(source);
  if (dataUrlMatch) {
    const data = Buffer.from(dataUrlMatch[2], "base64");
    if (data.length === 0) {
      return NextResponse.json({ error: "Berkas LoA kosong." }, { status: 404 });
    }
    return pdfResponse(data, filename);
  }

  // Rekaman lama: path "/berkas/<nama>" di filesystem (hanya nama aman).
  const storedName = source.split(/[/\\]/).pop() ?? "";
  if (!/^file-[a-f0-9]+\.pdf$/i.test(storedName)) {
    return NextResponse.json({ error: "Format berkas LoA tidak dikenal." }, { status: 404 });
  }
  try {
    const data = await readFile(path.join(process.cwd(), uploadDir(), storedName));
    return pdfResponse(data, filename);
  } catch {
    return NextResponse.json({ error: "Berkas LoA tidak ditemukan." }, { status: 404 });
  }
}
