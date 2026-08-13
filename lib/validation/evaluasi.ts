import { z } from "zod";

// Validasi penilaian peserta oleh mentor. Semua nilai skala 1-100.
export const evaluasiSchema = z.object({
  pesertaId: z.string().min(1, "ID peserta tidak valid"),
  kedisiplinan: z.coerce.number().int().min(1, "Nilai minimal 1").max(100, "Nilai maksimal 100"),
  keaktifan: z.coerce.number().int().min(1, "Nilai minimal 1").max(100, "Nilai maksimal 100"),
  kinerja: z.coerce.number().int().min(1, "Nilai minimal 1").max(100, "Nilai maksimal 100"),
  catatan: z.string().trim().max(2000, "Catatan maksimal 2000 karakter").optional(),
});

export type EvaluasiInput = z.infer<typeof evaluasiSchema>;
