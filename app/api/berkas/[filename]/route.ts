import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectMimeFromBuffer, uploadDir } from "@/lib/security";
import { authorizeBerkasAccess } from "@/lib/berkas-access";

// Melayani berkas upload legacy (rekaman lama yang menyimpan path filesystem).
//
// AUD-01: endpoint ini awalnya HANYA mengecek "sudah login" tanpa verifikasi
// kepemilikan, sehingga setiap user (termasuk pendaftar lain) dapat mengambil
// berkas siapa pun (IDOR). Sekarang akses non-ADMIN wajib lolos pemeriksaan
// database bahwa berkas memang terkait dengan akun pemohon:
// - ADMIN              : akses penuh semua berkas.
// - PENDAFTAR/PESERTA  : hanya berkas miliknya sendiri (email cocok).
// - MENTOR             : hanya berkas penilaian (cv/surat) milik peserta
//                        bimbingannya (cek mentorId) — KTP dkk. ditolak.
// Gagal cocok → 403; berkas tidak ada di disk → 404.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;
  // Hanya izinkan nama berkas aman (file-<hex>.pdf/.jpg/.jpeg) — anti path traversal.
  if (!/^file-[a-f0-9]+\.(pdf|jpg|jpeg)$/i.test(filename)) {
    return NextResponse.json({ error: "Nama berkas tidak valid." }, { status: 400 });
  }

  // --- AUD-01: verifikasi kepemilikan untuk semua role selain ADMIN ---
  if (session.user.role !== "ADMIN") {
    // Query ringan: hanya id/email/mentorId yang diambil — kolom berkas (data
    // URL Base64) TIDAK dimuat; cukup dipakai sebagai syarat filter endsWith.
    const rows = await prisma.pendaftar
      .findMany({
        where: {
          OR: [
            { berkasCV: { endsWith: filename } },
            { berkasSurat: { endsWith: filename } },
            { ktpKtmUrl: { endsWith: filename } },
            { transkripUrl: { endsWith: filename } },
            { loaUrl: { endsWith: filename } },
          ],
        },
        select: {
          id: true,
          email: true,
          peserta: { select: { mentorId: true } },
        },
      })
      .catch(() => []);

    // Fail-closed: tanpa record yang mereferensikan berkas → 403 (tanpa
    // membocorkan apakah berkas ada di disk — hindari oracle keberadaan).
    if (rows.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let diizinkan = false;

    if (session.user.role === "MENTOR") {
      // Scoping vertikal: hanya peserta bimbingan (mentorId cocok) ...
      const bimbingan = rows.filter((r) => r.peserta?.mentorId === session.user.id);
      if (bimbingan.length > 0) {
        // ... dan hanya berkas penilaian (cv/surat); KTP/transkrip/LoA → 403.
        const tipeDiizinkan = await prisma.pendaftar
          .findFirst({
            where: {
              id: { in: bimbingan.map((r) => r.id) },
              OR: [{ berkasCV: { endsWith: filename } }, { berkasSurat: { endsWith: filename } }],
            },
            select: { id: true },
          })
          .catch(() => null);
        diizinkan = Boolean(tipeDiizinkan);
      }
    } else {
      // PENDAFTAR/PESERTA (dan role lain): hanya pemilik berkas (email cocok).
      diizinkan = rows.some(
        (r) =>
          authorizeBerkasAccess({
            session,
            ownerEmail: r.email,
            mentorId: r.peserta?.mentorId ?? null,
            tipe: "cv", // tipe tidak berpengaruh bagi non-mentor (lihat helper)
          }).ok
      );
    }

    if (!diizinkan) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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

    // Validasi magic bytes: isi berkas wajib sesuai ekstensi yang diklaim
    // (PDF diawali "%PDF-", JPEG diawali FF D8 FF). Tidak cocok → tolak 404.
    const expectedMime = ext === "pdf" ? "application/pdf" : "image/jpeg";
    const detectedMime = detectMimeFromBuffer(new Uint8Array(data.subarray(0, 16)));
    if (detectedMime !== expectedMime) {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
    }

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
