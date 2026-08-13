import nodemailer from "nodemailer";

// Nodemailer + SMTP. Saat NODE_ENV=development email TIDAK dikirim sungguhan,
// hanya di-log ke console (memudahkan pengembangan tanpa server email).
const FROM =
  process.env.SMTP_FROM ?? "LEMIGAS Magang <noreply@example.com>";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);

  // Belum ada konfigurasi SMTP lengkap → pakai fallback (tidak kirim sungguhan).
  if (!host) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port: isNaN(port) ? 587 : port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
  }
  return transporter;
}

export interface StatusEmailPayload {
  to: string;
  noPendaftaran: string;
  nama: string;
  status: "MENUNGGU" | "DITERIMA" | "DITOLAK";
  catatan?: string;
}

const STATUS_TEXT: Record<StatusEmailPayload["status"], string> = {
  MENUNGGU: "Menunggu Verifikasi",
  DITERIMA: "Diterima",
  DITOLAK: "Ditolak",
};

export async function sendStatusEmail(payload: StatusEmailPayload): Promise<boolean> {
  const subject = `Perubahan Status Lamaran ${payload.noPendaftaran} - LEMIGAS`;
  const text = [
    `Yth. ${payload.nama},`,
    ``,
    `Status pendaftaran magang/PKL Anda dengan nomor ${payload.noPendaftaran}`,
    `telah diperbarui menjadi: ${STATUS_TEXT[payload.status]}.`,
    payload.catatan ? `\nCatatan: ${payload.catatan}` : "",
    `\nAnda dapat mengecek status kapan saja melalui halaman Cek Status di website LEMIGAS.`,
    `\nSalam,`,
    `LEMIGAS`,
  ].join("\n");

  const t = getTransporter();
  // Fallback development: log saja, jangan kirim.
  if (!t || process.env.NODE_ENV === "development") {
    console.log(`\n[EMAIL BERHASIL-DEBUG] to=${payload.to} subject="${subject}"\n${text}\n`);
    return true;
  }

  try {
    await t.sendMail({ from: FROM, to: payload.to, subject, text });
    return true;
  } catch (e) {
    console.error("Gagal mengirim email:", e);
    return false;
  }
}