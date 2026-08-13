import { z } from "zod";

// Validasi input untuk mengubah status pendaftar oleh admin.
export const verifikasiSchema = z.object({
  pendaftarId: z.string().min(1, "ID pendaftar tidak valid"),
  status: z.enum(["MENUNGGU", "DITERIMA", "DITOLAK"]),
  catatan: z.string().max(1000, "Catatan maksimal 1000 karakter").optional(),
  // Dipakai untuk mencatat peserta aktif saat ditolakkan DITERIMA.
  tanggalMulai: z.string().optional(),
  tanggalSelesai: z.string().optional(),
  mentorId: z.string().optional().nullable(),
});

export type VerifikasiInput = z.infer<typeof verifikasiSchema>;