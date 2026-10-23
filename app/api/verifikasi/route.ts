import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { verifikasiSchema } from "@/lib/validation/verifikasi";
import { sendStatusEmail } from "@/lib/email";
import { sendWhatsAppNotification } from "@/lib/whatsapp";
import { checkDocumentSize, validatePdfFile } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

// Ubah buffer PDF LoA terverifikasi menjadi data URL (storage sama dengan
// fitur sertifikat: di database, aman untuk runtime serverless Vercel).
function toDataUrl(mime: string, buffer: Buffer): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function PATCH(req: NextRequest) {
  // Hanya admin yang boleh mengubah status pendaftar.
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Body berupa multipart/form-data: field teks biasa + berkas PDF LoA opsional.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const raw = {
    pendaftarId: String(form.get("pendaftarId") ?? ""),
    status: String(form.get("status") ?? ""),
    catatan: String(form.get("catatan") ?? "") || undefined,
    tanggalMulai: String(form.get("tanggalMulai") ?? "") || undefined,
    tanggalSelesai: String(form.get("tanggalSelesai") ?? "") || undefined,
    mentorId: String(form.get("mentorId") ?? "") || undefined,
  };

  // Validasi Zod sebelum mengubah data.
  const parsed = verifikasiSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validasi gagal.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { pendaftarId, status, catatan, tanggalMulai, tanggalSelesai, mentorId } = parsed.data;

  const pendaftar = await prisma.pendaftar
    .findUnique({
      where: { id: pendaftarId },
      // AUD-14: loaUrl (data URL PDF Base64) tidak ikut di-select — cukup
      // dicek keberadaannya lewat query kecil di blok Surat Balasan (LoA).
      select: {
        email: true,
        noPendaftaran: true,
        nama: true,
        noHp: true, // dipakai blok notifikasi WhatsApp (Fonnte) di bawah
        unitMinatId: true,
        unitMinat: { select: { nama: true } },
      },
    })
    .catch(() => null);
  if (!pendaftar) {
    return NextResponse.json({ error: "Pendaftar tidak ditemukan." }, { status: 404 });
  }

  // --- Surat Balasan (LoA) ---
  // Wajib diunggah saat status DITERIMA (PESERTA_AKTIF bukan nilai yang
  // diterima verifikasiSchema, jadi tidak perlu dicek di sini), kecuali
  // pendaftar sudah punya LoA tersimpan (re-verifikasi tanpa unggah ulang).
  const butuhLoa = status === "DITERIMA";
  const loaFile = form.get("loa") as File | null;
  let loaUrlBaru: string | null = null;

  if (loaFile && loaFile.size > 0) {
    // AUD-09: tolak berkas kebesaran SEBELUM dibaca/dikonversi ke buffer Base64.
    const sizeCheck = checkDocumentSize(loaFile);
    if (!sizeCheck.ok) {
      return NextResponse.json({ error: sizeCheck.error }, { status: 400 });
    }
    const hasil = await validatePdfFile(loaFile);
    if (!hasil.ok) {
      return NextResponse.json(
        { error: `Surat Balasan (LoA): ${hasil.error}` },
        { status: 422 }
      );
    }
    loaUrlBaru = toDataUrl(hasil.mime!, hasil.buffer!);
  } else if (butuhLoa) {
    // Cek keberadaan LoA lama: query id saja, tanpa memuat isi data URL Base64.
    const loaTersedia = await prisma.pendaftar
      .findFirst({
        where: { id: pendaftarId, NOT: { OR: [{ loaUrl: null }, { loaUrl: "" }] } },
        select: { id: true },
      })
      .catch(() => null);
    if (!loaTersedia) {
      return NextResponse.json(
        { error: "Surat Balasan (LoA) wajib diunggah saat pendaftar diterima." },
        { status: 422 }
      );
    }
  }

  // Validasi tanggal (wajib saat DITERIMA untuk pencatatan peserta).
  let mulai: Date | null = null;
  let selesai: Date | null = null;
  if (status === "DITERIMA") {
    if (!tanggalMulai || !tanggalSelesai) {
      return NextResponse.json(
        { error: "Tanggal mulai & selesai wajib diisi saat pendaftar diterima." },
        { status: 422 }
      );
    }
    mulai = new Date(tanggalMulai);
    selesai = new Date(tanggalSelesai);
    if (isNaN(mulai.getTime()) || isNaN(selesai.getTime()) || selesai <= mulai) {
      return NextResponse.json(
        { error: "Rentang tanggal tidak valid." },
        { status: 422 }
      );
    }
  }

  // Simpan perubahan status + riwayat dalam satu transaksi.
  // LoA ikut di-commit di sini sehingga sudah tersimpan sebelum notifikasi
  // email/WhatsApp dikirim (lihat blok Fonnte di bawah).
  await prisma.$transaction(async (tx) => {
    await tx.pendaftar.update({
      where: { id: pendaftarId },
      data: {
        status,
        catatan: catatan ?? null,
        diprosesAdminId: session.user.id,
        // Hanya tulis loaUrl bila ada berkas baru — jangan menimpa yang lama.
        ...(loaUrlBaru ? { loaUrl: loaUrlBaru } : {}),
      },
    });

    await tx.statusHistory.create({
      data: {
        pendaftarId,
        status,
        catatan: catatan ?? null,
        diubahOlehId: session.user.id,
      },
    });

    if (status === "DITERIMA") {
      // AUD-14: cukup id saja — kolom sertifikatUrl (data URL Base64) tidak dimuat.
      const existing = await tx.peserta.findUnique({
        where: { pendaftarId },
        select: { id: true },
      });
      if (existing) {
        await tx.peserta.update({
          where: { pendaftarId },
          data: {
            unitId: pendaftar.unitMinatId,
            tanggalMulai: mulai!,
            tanggalSelesai: selesai!,
            mentorId: mentorId || null,
          },
        });
      } else {
        await tx.peserta.create({
          data: {
            pendaftarId,
            unitId: pendaftar.unitMinatId,
            tanggalMulai: mulai!,
            tanggalSelesai: selesai!,
            mentorId: mentorId || null,
          },
        });
      }
    }
  });

  // Kirim notifikasi email (di development hanya log ke console).
  await sendStatusEmail({
    to: pendaftar.email,
    noPendaftaran: pendaftar.noPendaftaran,
    nama: pendaftar.nama,
    status,
    catatan: catatan ?? undefined,
  });

  // Kirim notifikasi WhatsApp saat status DITERIMA (isolasi error).
  // CATATAN: blok Fonnte ini sengaja diletakkan SETELAH transaksi commit di
  // atas — pesan mengarahkan pendaftar mengunduh LoA di halaman Cek Status,
  // jadi berkas LoA wajib sudah tersimpan di database saat pesan terkirim.
  if (status === "DITERIMA") {
    try {
      const tanggalMulaiFmt = mulai!.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const tanggalSelesaiFmt = selesai!.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const waMessage = [
        `Assalamualaikum, ${pendaftar.nama}.`,
        ``,
        `Selamat! Status pendaftaran magang/PKL Anda dengan nomor ${pendaftar.noPendaftaran} telah *DITERIMA*.`,
        ``,
        `Tanggal mulai: ${tanggalMulaiFmt}`,
        `Tanggal selesai: ${tanggalSelesaiFmt}`,
        `Unit penempatan: ${pendaftar.unitMinat.nama}`,
        ``,
        `Silakan cek detail lebih lanjut dan unduh Surat Balasan (LoA) resmi Anda di menu Cek Status pada website kami: https://lemigas-magang.vercel.app menggunakan kode pendaftaran Anda.`,
        ``,
        `Salam,`,
        `LEMIGAS`,
      ].join("\n");

      await sendWhatsAppNotification({
        phone: pendaftar.noHp,
        message: waMessage,
      });
    } catch (e) {
      console.error("Gagal mengirim notifikasi WhatsApp:", e);
    }
  }

  // Revalidasi cache agar dashboard & daftar pendaftar langsung sinkron.
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/pendaftar");
  revalidatePath("/admin/peserta");
  revalidatePath("/mentor/dashboard");

  return NextResponse.json({ message: "Status pendaftar diperbarui." });
}