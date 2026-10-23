import { randomBytes } from "crypto";

// AUD-09: batas ketat ukuran dokumen yang disimpan sebagai data URL (Base64)
// di database. Diverifikasi SEBELUM berkas dibaca/dikonversi ke buffer agar
// memori serverless tidak terbuang untuk berkas yang akan ditolak.
export const MAX_DOCUMENT_BYTES = 1_500_000; // 1.5MB
export const DOCUMENT_SIZE_ERROR =
  "Ukuran dokumen maksimal 1.5MB untuk menghemat ruang penyimpanan.";

// Cek ukuran wajib dipanggil tiap rute unggahan sebelum validateUploadFile /
// validatePdfFile (yang membaca isi berkas ke buffer) dan sebelum toDataUrl.
export function checkDocumentSize(file: File): { ok: boolean; error?: string } {
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { ok: false, error: DOCUMENT_SIZE_ERROR };
  }
  return { ok: true };
}

// Deteksi tipe file sebenarnya berdasarkan "magic bytes" (isi file), bukan hanya
// ekstensi nama file. Mencegah berkas berbahaya yang diubah namanya jadi .pdf.
export function detectMimeFromBuffer(buf: Uint8Array): string | null {
  // PDF dimulai dengan "%PDF-"
  if (
    buf.length >= 5 &&
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46 &&
    buf[4] === 0x2d
  ) {
    return "application/pdf";
  }
  // JPEG dimulai dengan FF D8 FF
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return "image/jpeg";
  }
  return null;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
};

export interface ParseFileResult {
  ok: boolean;
  error?: string;
  extension?: string;
  mime?: string;
  buffer?: Buffer;
}

export async function validateUploadFile(
  file: File,
  allowedMimes: string[]
): Promise<ParseFileResult> {
  const maxBytes = maxUploadBytes();

  if (file.size <= 0) {
    return { ok: false, error: "Berkas kosong." };
  }
  if (file.size > maxBytes) {
    const mb = maxBytes / 1_000_000;
    return {
      ok: false,
      error: `Ukuran berkas melebihi ${Number.isInteger(mb) ? mb : mb.toFixed(1)}MB.`,
    };
  }

  // Baca isi file untuk memverifikasi tipe asli (bukan dari ekstensi).
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectMimeFromBuffer(new Uint8Array(buffer.subarray(0, 16)));
  if (!detected || !allowedMimes.includes(detected)) {
    return {
      ok: false,
      error: `Berkas bukan file ${allowedMimes
        .map((m) => (EXTENSION_BY_MIME[m] ?? m).toUpperCase())
        .join("/")} yang benar (verifikasi isi file).`,
    };
  }

  return { ok: true, buffer, mime: detected, extension: EXTENSION_BY_MIME[detected] };
}

export async function validatePdfFile(file: File): Promise<ParseFileResult> {
  return validateUploadFile(file, ["application/pdf"]);
}

// Nama file aman: menambahkan random suffix agar tidak bentrok & mencegah
// path traversal / eksekusi berkas berbahaya.
export function safeFileName(extension = "pdf"): string {
  return `file-${randomBytes(6).toString("hex")}.${extension}`;
}

export function maxUploadBytes(): number {
  const v = parseInt(process.env.MAX_FILE_SIZE ?? "", 10);
  const configured = isNaN(v) || v <= 0 ? MAX_DOCUMENT_BYTES : v;
  // Env hanya boleh MENURUNKAN batas, tidak pernah menaikkan di atas 1.5MB
  // (batas keras AUD-09 juga dijalankan rute lewat checkDocumentSize).
  return Math.min(configured, MAX_DOCUMENT_BYTES);
}

export function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? "uploads";
}