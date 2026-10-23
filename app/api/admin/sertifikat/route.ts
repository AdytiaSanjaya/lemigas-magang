import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkDocumentSize, validatePdfFile } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

// Ubah buffer PDF terverifikasi menjadi data URL agar sertifikat tersimpan di
// database (kompatibel dengan runtime serverless Vercel yang filesystem-nya
// read-only), konsisten dengan pola upload berkas pada /api/registrasi.
function toDataUrl(mime: string, buffer: Buffer): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

// Akhir hari tanggal selesai magang (lokal server) — patokan status "Selesai".
function batasSelesai(tanggalSelesai: Date): number {
  const d = new Date(tanggalSelesai);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// Unggah / ganti sertifikat magang (PDF) untuk satu peserta. HANYA admin.
export async function POST(req: NextRequest) {
  // 1) Guard RBAC: wajib role ADMIN.
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2) Baca multipart form (pesertaId + file PDF).
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const pesertaId = String(form.get("pesertaId") ?? "").trim();
  const file = form.get("file") as File | null;

  if (!pesertaId) {
    return NextResponse.json({ error: "pesertaId wajib diisi." }, { status: 422 });
  }
  if (!file || file.size === 0) {
    return NextResponse.json(
      { error: "Sertifikat (PDF) wajib diunggah." },
      { status: 422 }
    );
  }

  // 3) AUD-09: tolak berkas > 1.5MB SEBELUM dibaca/dikonversi ke buffer
  //    Base64, lalu validasi isi file: wajib PDF sungguhan (magic bytes).
  const sizeCheck = checkDocumentSize(file);
  if (!sizeCheck.ok) {
    return NextResponse.json({ error: sizeCheck.error }, { status: 400 });
  }
  const result = await validatePdfFile(file);
  if (!result.ok) {
    return NextResponse.json({ error: `Sertifikat: ${result.error}` }, { status: 422 });
  }

  // 4) Cek peserta + status masa magang sudah "Selesai".
  const peserta = await prisma.peserta
    .findUnique({
      where: { id: pesertaId },
      select: { id: true, tanggalSelesai: true, pendaftar: { select: { nama: true } } },
    })
    .catch(() => null);

  if (!peserta) {
    return NextResponse.json({ error: "Peserta tidak ditemukan." }, { status: 404 });
  }
  if (batasSelesai(peserta.tanggalSelesai) > Date.now()) {
    return NextResponse.json(
      { error: "Sertifikat hanya dapat diunggah setelah masa magang selesai." },
      { status: 422 }
    );
  }

  // 5) Simpan (kolom baru sertifikatUrl — tidak menyentuh kolom lain).
  try {
    await prisma.peserta.update({
      where: { id: peserta.id },
      data: { sertifikatUrl: toDataUrl(result.mime!, result.buffer!) },
    });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan sertifikat." }, { status: 500 });
  }

  revalidatePath("/admin/peserta");
  revalidatePath("/peserta/dashboard");

  return NextResponse.json({
    message: `Sertifikat untuk ${peserta.pendaftar?.nama ?? "peserta"} berhasil diunggah.`,
  });
}
