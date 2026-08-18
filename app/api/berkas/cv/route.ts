import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadDir } from "@/lib/security";

// PDF fallback yang dirender di browser ketika CV tidak tersedia, sehingga
// admin tetap mendapat tampilan PDF (bukan error 400 "nama berkas tidak valid").
async function buildCvFallbackPdf(reason: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("Berkas CV tidak ditemukan.", {
    x: 50,
    y: page.getHeight() - 100,
    size: 18,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });
  page.drawText(reason, {
    x: 50,
    y: page.getHeight() - 130,
    size: 11,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

function pdfResponse(data: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="cv.pdf"',
      "Content-Length": String(data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=600",
    },
  });
}

// Melayani CV peserta dalam bentuk PDF (Content-Type: application/pdf,
// Content-Disposition: inline) agar terbuka langsung di browser secara stabil.
// Data diambil dari database (data URL) untuk pendaftar baru, atau dari
// filesystem untuk rekaman lama. Bila CV tidak tersedia/tidak valid, ditampilkan
// PDF default "Berkas CV tidak ditemukan." — bukan error nama berkas.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Parameter id wajib diisi." }, { status: 400 });
  }

  let source: string | null = null;
  try {
    const pendaftar = await prisma.pendaftar.findUnique({
      where: { id },
      select: { berkasCV: true, cvUrl: true },
    });
    source = pendaftar?.cvUrl ?? pendaftar?.berkasCV ?? null;
  } catch {
    source = null;
  }

  // Fallback: CV tidak tersedia di database.
  if (!source || !source.trim()) {
    return pdfResponse(await buildCvFallbackPdf("Pendaftar tidak memiliki berkas CV."));
  }

  // Pendaftar baru: CV tersimpan sebagai data URL (base64) di database.
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/.exec(source);
  if (dataUrlMatch) {
    const data = Buffer.from(dataUrlMatch[2], "base64");
    if (data.length === 0) {
      return pdfResponse(await buildCvFallbackPdf("Berkas CV kosong."));
    }
    return pdfResponse(data);
  }

  // Rekaman lama: CV tersimpan sebagai path "/berkas/<nama>" di filesystem.
  // Nama berkas disanitasi (hanya basename, tanpa traversal direktori); bila
  // tidak aman atau berkasnya tidak ditemukan, tampilkan PDF fallback.
  const filename = source.split(/[/\\]/).pop() ?? "";
  if (!/^[a-zA-Z0-9._-]+\.(pdf|jpg|jpeg)$/i.test(filename)) {
    return pdfResponse(await buildCvFallbackPdf("Format berkas CV tidak dikenal."));
  }
  try {
    const data = await readFile(path.join(process.cwd(), uploadDir(), filename));
    return pdfResponse(data);
  } catch {
    return pdfResponse(await buildCvFallbackPdf("Berkas CV tidak ditemukan di penyimpanan."));
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
