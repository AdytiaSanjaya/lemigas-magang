import { z } from "zod";

// Validasi untuk memperbarui data peserta aktif.
export const pesertaUpdateSchema = z.object({
  pesertaId: z.string().min(1, "ID peserta tidak valid"),
  unitId: z.string().min(1, "Unit wajib diisi"),
  tanggalMulai: z.string().min(1, "Tanggal mulai wajib diisi"),
  tanggalSelesai: z.string().min(1, "Tanggal selesai wajib diisi"),
  mentorId: z.string().optional().nullable(),
  catatan: z.string().max(2000, "Catatan maksimal 2000 karakter").optional(),
});

export type PesertaUpdateInput = z.infer<typeof pesertaUpdateSchema>;