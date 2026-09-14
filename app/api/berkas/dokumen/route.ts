import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Daftar field berkas pada model Pendaftar beserta label-nya.
const DOC_FIELDS = {
  cv: { field: "cvUrl" as const, fallback: "berkasCV" as const, label: "CV" },
  surat: { field: "suratPengantarUrl" as const, fallback: null, label: "Surat Pengantar" },
  ktp: { field: "ktpKtmUrl" as const, fallback: null, label: "KTP/KTM" },
  transkrip: { field: "transkripUrl" as const, fallback: null, label: "Transkrip Nilai" },
} as const;

type DocType = keyof typeof DOC_FIELDS;

function pdfResponse(data: Buffer, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=600",
    },
  });
}

function imageResponse(data: Buffer, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=600",
    },
  });
}

async function buildFallbackPdf(label: string, reason: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(`Berkas ${label} tidak ditemukan.`, {
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

// Generic endpoint untuk melihat/mengunduh berkas pendaftar.
// Query params: ?id=<pendaftarId>&type=cv|surat|ktp|transkrip
// Mengembalikan PDF inline untuk PDF, atau image/jpeg untuk JPG.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type") as DocType | null;

  if (!id || !type || !(type in DOC_FIELDS)) {
    return NextResponse.json(
      { error: "Parameter id & type wajib diisi (type: cv|surat|ktp|transkrip)." },
      { status: 400 }
    );
  }

  const spec = DOC_FIELDS[type];

  // Ambil data berkas + email pendaftar untuk otorisasi.
  let source: string | null = null;
  let pendaftarEmail: string | null = null;
  try {
    const pendaftar = await prisma.pendaftar.findUnique({
      where: { id },
      select: {
        email: true,
        [spec.field]: true,
        ...(spec.fallback ? { [spec.fallback]: true } : {}),
      },
    });
    if (pendaftar) {
      const row = pendaftar as Record<string, string | null>;
      source = row[spec.field] ?? (spec.fallback ? row[spec.fallback] : null) ?? null;
      pendaftarEmail = pendaftar.email;
    }
  } catch {
    source = null;
  }

  // Otorisasi: hanya admin/mentor atau pemilik data.
  const userRole = session.user.role as string;
  const isOwner = pendaftarEmail && session.user.email === pendaftarEmail;
  const isPrivileged = userRole === "ADMIN" || userRole === "MENTOR";
  if (!isOwner && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Berkas tidak tersedia.
  if (!source || !source.trim()) {
    const pdf = await buildFallbackPdf(spec.label, "Pendaftar tidak mengunggah berkas ini.");
    return pdfResponse(pdf, `${type}.pdf`);
  }

  // Data URL (base64) — format baru.
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/.exec(source);
  if (dataUrlMatch) {
    const mime = dataUrlMatch[1];
    const data = Buffer.from(dataUrlMatch[2], "base64");
    if (data.length === 0) {
      const pdf = await buildFallbackPdf(spec.label, "Berkas kosong.");
      return pdfResponse(pdf, `${type}.pdf`);
    }
    if (mime === "image/jpeg" || mime === "image/jpg") {
      return imageResponse(data, `${type}.jpg`);
    }
    return pdfResponse(data, `${type}.pdf`);
  }

  // Fallback: path filesystem (rekaman lama) — tidak lagi dipakai untuk
  // pendaftaran baru, tapi dipertahankan untuk kompatibilitas.
  const pdf = await buildFallbackPdf(spec.label, "Format berkas tidak dikenal.");
  return pdfResponse(pdf, `${type}.pdf`);
}

export const runtime = "nodejs";
export const maxDuration = 30;
