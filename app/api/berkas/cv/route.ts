import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadDir } from "@/lib/security";

// Melayani CV peserta dalam bentuk PDF (Content-Type: application/pdf,
// Content-Disposition: inline) agar terbuka langsung di browser secara stabil,
// tanpa bergantung pada Data URL mentah. Data diambil dari database (data URL)
// untuk pendaftar baru, atau dari filesystem untuk rekaman lama.
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
  if (!source) {
    return NextResponse.json({ error: "CV tidak ditemukan." }, { status: 404 });
  }

  // Pendaftar baru: CV tersimpan sebagai data URL di database.
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/.exec(source);
  if (dataUrlMatch) {
    const data = Buffer.from(dataUrlMatch[2], "base64");
    if (data.length === 0) {
      return NextResponse.json({ error: "CV kosong." }, { status: 404 });
    }
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

  // Rekaman lama: CV tersimpan sebagai path "/berkas/<nama>" di filesystem.
  const filename = source.split("/").pop() ?? "";
  if (!/^file-[a-f0-9]+\.(pdf|jpg|jpeg)$/i.test(filename)) {
    return NextResponse.json({ error: "Nama berkas tidak valid." }, { status: 400 });
  }
  try {
    const data = await readFile(path.join(process.cwd(), uploadDir(), filename));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="cv.pdf"',
        "Content-Length": String(data.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;