import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { lupaKodeSchema } from "@/lib/validation/cek-status";
import { sendWhatsAppNotification } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const maxDuration = 20;

// Batas jumlah record per email yang dikirimi pesan (melindungi dari spam
// bila satu email punya banyak riwayat pendaftaran).
const MAX_PESAN = 5;

// Pesan pengiriman internal (tidak pernah masuk ke respons JSON ke klien).
function pesanLupaKode(nama: string, noPendaftaran: string): string {
  return `Halo ${nama}, berikut adalah Nomor Pendaftaran magang LEMIGAS Anda: ${noPendaftaran}. Gunakan nomor ini untuk mengecek status lamaran Anda di portal. Harap jaga kerahasiaan nomor ini.`;
}

// Endpoint publik "Lupa Kode Pendaftaran".
//
// AUD-22 (DITUTUP): respons TIDAK LAGI memuat noPendaftaran (maupun nama,
// status, unit). Sebelumnya hanya email sudah cukup untuk mendapatkan
// no. pendaftaran korban, sehingga pasangan "no + email" yang dipakai Cek Status
// dan unduhan LoA efektif tinggal satu faktor (email).
//
// Pencarian DB tetap dijalankan (audit/layanan internal), tetapi hasilnya tidak
// pernah dikirim ke klien. Baik email terdaftar maupun tidak, klien menerima
// respons generik dan identik sehingga tidak ada orakel enumerasi email.
export async function POST(req: NextRequest) {
  // Rate limit untuk mencegah pencarian acak/spam per IP.
  const ip = getClientIp(req);
  const rate = await rateLimiter.consume(`lupa-kode:${ip}`);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Ulangi dalam 1 menit." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = lupaKodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validasi gagal.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  // Pemeriksaan database tetap berjalan di server (query read-only), namun
  // hasilnya hanya dipakai internal dan TIDAK pernah diteruskan ke klien.
  let pendaftarList: Array<{ nama: string; noPendaftaran: string; noHp: string }> = [];
  try {
    pendaftarList = await prisma.pendaftar.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      take: MAX_PESAN,
      select: { nama: true, noPendaftaran: true, noHp: true },
    });
  } catch {
    // Gagal DB: respons tetap sama persis (tanpa membedakan keadaan).
    pendaftarList = [];
  }

  // Pengiriman WhatsApp (Fonnte) berjalan di BACKGROUND setelah respons 200
  // terkirim, sehingga API Fonnte yang lambat/maupun down TIDAK PERNAH bisa
  // menunda atau menggagalkan respons 200 OK ke klien. Seluruh blok dibungkus
  // try/catch terpisah (failsafe) + try/catch per pesan: kegagalan satu
  // pengiriman tidak menghentikan yang lain dan tidak meng-crash server.
  if (pendaftarList.length > 0) {
    after(async () => {
      try {
        for (const p of pendaftarList) {
          try {
            const tujuan = (p.noHp ?? "").replace(/\D/g, "");
            if (!tujuan || tujuan.length < 9) continue; // nomor tidak valid → lewati
            await sendWhatsAppNotification({
              phone: tujuan,
              message: pesanLupaKode(p.nama, p.noPendaftaran),
            });
          } catch {
            // Failsafe per pesan: lanjutkan ke record berikutnya.
          }
        }
      } catch {
        // Failsafe global: serap semua error agar tidak memicu unhandled rejection.
      }
    });
  }

  // Respons generik & identik untuk semua kasus (email terdaftar maupun tidak)
  // agar tidak membocorkan keberadaan email maupun nomor pendaftaran.
  return NextResponse.json({
    message:
      "Permintaan diproses. Jika email terdaftar, informasi akan dikirimkan secara internal.",
    success: true,
  });
}

