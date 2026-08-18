import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth, ROLE_PENDAFTAR } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pendaftarSchema } from "@/lib/validation/pendaftar";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { validateUploadFile, safeFileName, uploadDir } from "@/lib/security";

// Generator nomor pendaftaran: LEMIGAS-<Tahun>-<urutan>
async function generateNoPendaftaran(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.pendaftar.count();
  const seq = (count + 1).toString().padStart(4, "0");
  let candidate = `LEMIGAS-${year}-${seq}`;
  // Pastikan unik (perlindungan jika ada penghapusan data di tengah urutan).
  while (await prisma.pendaftar.findUnique({ where: { noPendaftaran: candidate } })) {
    const next = Math.floor(Math.random() * 9000) + 1000;
    candidate = `LEMIGAS-${year}-${next}`;
  }
  return candidate;
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

  // Tangkap tipe pendaftaran (INDIVIDUAL/GROUP) beserta anggota kelompok (JSON string).
  const applicationType = String(form.get("applicationType") ?? "INDIVIDUAL");
  let groupMembers: { name: string; identifier: string; major: string }[] | undefined;
  const groupMembersRaw = form.get("groupMembers");
  if (groupMembersRaw) {
    try {
      groupMembers = JSON.parse(String(groupMembersRaw));
    } catch {
      return NextResponse.json({ error: "Data anggota kelompok tidak valid." }, { status: 422 });
    }
  }

  const raw = {
    nama: String(form.get("nama") ?? ""),
    asalInstansi: String(form.get("asalInstansi") ?? ""),
    jurusan: String(form.get("jurusan") ?? "") || undefined,
    jenisKelamin: String(form.get("jenisKelamin") ?? "") || undefined,
    noHp: String(form.get("noHp") ?? ""),
    email: String(form.get("email") ?? ""),
    unitMinatId: String(form.get("unitMinatId") ?? ""),
    applicationType,
    groupMembers,
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

  // 3b) Pendaftaran kelompok wajib memiliki minimal 1 anggota.
  if (parsed.data.applicationType === "GROUP" && (!parsed.data.groupMembers || parsed.data.groupMembers.length === 0)) {
    return NextResponse.json(
      { error: "Data anggota kelompok wajib diisi untuk pendaftaran kelompok." },
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
  const cvResult = await validateUploadFile(cv, ["application/pdf"]);
  if (!cvResult.ok) {
    return NextResponse.json({ error: `CV: ${cvResult.error}` }, { status: 422 });
  }

  const uploadSpecs: { key: string; label: string; file: File | null; allowed: string[] }[] = [
    { key: "suratPengantarUrl", label: "Surat pengantar", file: surat, allowed: ["application/pdf"] },
    { key: "ktpKtmUrl", label: "KTP/KTM", file: ktpKtm, allowed: ["application/pdf", "image/jpeg"] },
    { key: "transkripUrl", label: "Transkrip nilai", file: transkrip, allowed: ["application/pdf"] },
  ];

  // 7) Siapkan direktori upload & simpan CV ke disk (bukan public/ agar hanya
  //    bisa diakses via route berizin).
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const cvName = safeFileName(cvResult.extension!);
  await writeFile(path.join(dir, cvName), cvResult.buffer!);

  const saved = new Map<string, string>();
  for (const spec of uploadSpecs) {
    const file = spec.file;
    if (!file || file.size === 0) continue;
    const result = await validateUploadFile(file, spec.allowed);
    if (!result.ok) {
      return NextResponse.json(
        { error: `${spec.label}: ${result.error}` },
        { status: 422 }
      );
    }
    const name = safeFileName(result.extension!);
    saved.set(spec.key, name);
    await writeFile(path.join(dir, name), result.buffer!);
  }

  // 8) Simpan data pendaftar dalam transaksi (beserta riwayat status awal).
  const noPendaftaran = await generateNoPendaftaran();
  const pendaftar = await prisma.$transaction(async (tx) => {
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
        berkasCV: `/berkas/${cvName}`,
        berkasSurat: saved.has("suratPengantarUrl")
          ? `/berkas/${saved.get("suratPengantarUrl")}`
          : null,
        cvUrl: `/berkas/${cvName}`,
        suratPengantarUrl: saved.has("suratPengantarUrl")
          ? `/berkas/${saved.get("suratPengantarUrl")}`
          : null,
        ktpKtmUrl: saved.has("ktpKtmUrl")
          ? `/berkas/${saved.get("ktpKtmUrl")}`
          : null,
        transkripUrl: saved.has("transkripUrl")
          ? `/berkas/${saved.get("transkripUrl")}`
          : null,
        status: "MENUNGGU",
        applicationType: parsed.data.applicationType,
        groupMembers:
          parsed.data.applicationType === "GROUP" ? (parsed.data.groupMembers ?? []) : undefined,
      },
    });
    await tx.statusHistory.create({
      data: { pendaftarId: created.id, status: "MENUNGGU" },
    });
    return created;
  });

  return NextResponse.json(
    {
      message: "Pendaftaran berhasil.",
      noPendaftaran: pendaftar.noPendaftaran,
    },
    { status: 201 }
  );
}