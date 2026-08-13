import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { uploadDir } from "@/lib/security";

// Melayani berkas upload. Hanya diakses oleh user yang sudah login (admin/mentor),
// dan besarnya dibatasi. Berkas disimpan di luar folder public.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;
  // Hanya izinkan nama berkas aman (file-<hex>.pdf/.jpg/.jpeg).
  if (!/^file-[a-f0-9]+\.(pdf|jpg|jpeg)$/i.test(filename)) {
    return NextResponse.json({ error: "Nama berkas tidak valid." }, { status: 400 });
  }

  const ext = filename.split(".").pop()!.toLowerCase();
  const contentType =
    ext === "pdf"
      ? "application/pdf"
      : ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : "application/octet-stream";

  const filePath = path.join(process.cwd(), uploadDir(), filename);
  try {
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(data.length),
        "X-Content-Type-Options": "nosniff",
        // cache singkat untuk akses berulang admin
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Berkas tidak ditemukan." },
      { status: 404 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;