import { NextRequest, NextResponse } from "next/server";
import { auth, ROLE_PENDAFTAR } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pendaftarSchema } from "@/lib/validation/pendaftar";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { checkDocumentSize, validateUploadFile } from "@/lib/security";
import { generateNoPendaftaran } from "@/lib/no-pendaftaran";

// Ubah buffer terverifikasi menjadi data URL (mis. "data:application/pdf;base64,...")
// agar berkas tersimpan di database tanpa bergantung pada filesystem serverless.
function toDataUrl(mime: string, buffer: Buffer): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function POST(req: NextRequest) {
  // 1) Rate limiting: maks 5 request/menit/IP untuk mencegah spam.
  const ip = getClientIp(req);
  const rate = await rateLimiter.consume(`registrasi:${ip}`);
  if (!rate.success) {
    return NextResponse.json(
      {
        error: "Terlalu banyak permintaan. Silakan coba lagi dalam 1 menit.",
        retryAfter: Math.ceil((rate.reset - Date.now()) / 1000),
      },
      { status: 429 }
    );
  }

  // 2) Formulir dilindungi: wajib login via Google (role PENDAFTAR). Email yang dikirim
  //    harus sesuai dengan akun yang sedang login (mencegah manipulasi email).
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Silakan login dengan akun Google terlebih dahulu." },
      { status: 401 }
    );
  }
  if (session.user.role !== ROLE_PENDAFTAR) {
    return NextResponse.json(
      { error: "Akses ditolak untuk akun ini." },
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
    nama: String(form.get("nama") ?? ""),
    asalInstansi: String(form.get("asalInstansi") ?? ""),
    jurusan: String(form.get("jurusan") ?? "") || undefined,
    jenisKelamin: String(form.get("jenisKelamin") ?? "") || undefined,
    noHp: String(form.get("noHp") ?? ""),
    email: String(form.get("email") ?? ""),
    unitMinatId: String(form.get("unitMinatId") ?? ""),
  };

  // 3) Validasi Zod untuk semua field sebelum menyentuh database.
  const parsed = pendaftarSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: "Validasi gagal.", fieldErrors: errors },
      { status: 422 }
    );
  }

  // 4) Pastikan email yang dikirim sama dengan akun Google yang login.
  if (parsed.data.email.toLowerCase().trim() !== session.user.email.toLowerCase().trim()) {
    return NextResponse.json(
      { error: "Email tidak sesuai dengan akun yang sedang login." },
      { status: 403 }
    );
  }

  // 5) Pastikan unit tersedia (hindari FK error & data valid).
  const unit = await prisma.unit.findUnique({ where: { id: parsed.data.unitMinatId } });
  if (!unit || !unit.aktif) {
    return NextResponse.json({ error: "Unit yang dipilih tidak tersedia." }, { status: 422 });
  }

  // 6) File upload: CV wajib (PDF). Surat pengantar, KTP/KTM (PDF/JPG),
  //    dan transkrip (PDF) opsional. Semua diverifikasi magic bytes.
  const cv = form.get("cvUrl") as File | null;
  const surat = form.get("suratPengantarUrl") as File | null;
  const ktpKtm = form.get("ktpKtmUrl") as File | null;
  const transkrip = form.get("transkripUrl") as File | null;

  if (!cv || cv.size === 0) {
    return NextResponse.json({ error: "CV (PDF) wajib diunggah." }, { status: 422 });
  }
  // AUD-09: tolak berkas > 1.5MB SEBELUM dibaca/dikonversi ke buffer Base64.
  const cvSize = checkDocumentSize(cv);
  if (!cvSize.ok) {
    return NextResponse.json({ error: cvSize.error }, { status: 400 });
  }
  const cvResult = await validateUploadFile(cv, ["application/pdf"]);
  if (!cvResult.ok) {
    return NextResponse.json({ error: `CV: ${cvResult.error}` }, { status: 422 });
  }

  const uploadSpecs: { key: string; label: string; file: File | null; allowed: string[] }[] = [
    { key: "suratPengantarUrl", label: "Surat pengantar", file: surat, allowed: ["application/pdf"] },
    { key: "ktpKtmUrl", label: "KTP/KTM", file: ktpKtm, allowed: ["application/pdf", "image/jpeg"] },
    { key: "transkripUrl", label: "Transkrip nilai", file: transkrip, allowed: ["application/pdf"] },
  ];

  // 7) Ubah semua berkas terverifikasi menjadi data URL (disimpan di database,
  //    bukan ditulis ke filesystem — kompatibel dengan runtime serverless Vercel).
  const cvDataUrl = toDataUrl(cvResult.mime!, cvResult.buffer!);

  const saved = new Map<string, string>();
  for (const spec of uploadSpecs) {
    const file = spec.file;
    if (!file || file.size === 0) continue;
    // AUD-09: tolak berkas > 1.5MB SEBELUM dibaca/dikonversi ke buffer Base64.
    const sizeCheck = checkDocumentSize(file);
    if (!sizeCheck.ok) {
      return NextResponse.json({ error: sizeCheck.error }, { status: 400 });
    }
    const result = await validateUploadFile(file, spec.allowed);
    if (!result.ok) {
      return NextResponse.json(
        { error: `${spec.label}: ${result.error}` },
        { status: 422 }
      );
    }
    saved.set(spec.key, toDataUrl(result.mime!, result.buffer!));
  }

  // 8) AUD-23: noPendaftaran kini ACAK — MAG-<YYMM>-<4 karakter acak> dengan
  // collision check ke database (lihat lib/no-pendaftaran.ts). Kegagalan
  // generator yang terkontrol dipetakan ke 503, bukan error 500.
  let noPendaftaran: string;
  try {
    noPendaftaran = await generateNoPendaftaran();
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat nomor pendaftaran. Silakan coba lagi." },
      { status: 503 }
    );
  }

  // Simpan data pendaftar dalam transaksi (beserta riwayat status awal).
  let pendaftar: { noPendaftaran: string };
  try {
    pendaftar = await prisma.$transaction(async (tx) => {
      const created = await tx.pendaftar.create({
        data: {
          noPendaftaran,
          nama: parsed.data.nama,
          asalInstansi: parsed.data.asalInstansi,
          jurusan: parsed.data.jurusan || null,
          jenisKelamin: (parsed.data.jenisKelamin as "L" | "P" | null) ?? null,
          noHp: parsed.data.noHp,
          email: parsed.data.email.toLowerCase().trim(),
          unitMinatId: parsed.data.unitMinatId,
          berkasCV: cvDataUrl,
          berkasSurat: saved.get("suratPengantarUrl") ?? null,
          cvUrl: cvDataUrl,
          suratPengantarUrl: saved.get("suratPengantarUrl") ?? null,
          ktpKtmUrl: saved.get("ktpKtmUrl") ?? null,
          transkripUrl: saved.get("transkripUrl") ?? null,
          status: "MENUNGGU",
          applicationType: "INDIVIDUAL",
        },
      });
      await tx.statusHistory.create({
        data: { pendaftarId: created.id, status: "MENUNGGU" },
      });
      return created;
    });
  } catch (err) {
    // P2002 = pelanggaran unique constraint (balapan langka ketika dua
    // pendaftaran bersamaan memilih kandidat nomor yang sama) → diminta
    // mencoba ulang, bukan jatuh ke error 500.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: unknown }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Nomor pendaftaran bentrok. Silakan coba lagi." },
        { status: 409 }
      );
    }
    throw err;
  }

  return NextResponse.json(
    {
      message: "Pendaftaran berhasil.",
      noPendaftaran: pendaftar.noPendaftaran,
    },
    { status: 201 }
  );
}
