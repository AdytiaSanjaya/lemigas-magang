import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid");

export const kehadiranSchema = z.object({
  action: z.enum(["CHECK_IN", "CHECK_OUT"]),
});

export type KehadiranInput = z.infer<typeof kehadiranSchema>;

export const izinSchema = z.object({
  type: z.enum(["IZIN", "SAKIT"], { message: "Jenis pengajuan wajib dipilih" }),
  startDate: dateString,
  endDate: dateString,
  reason: z
    .string()
    .trim()
    .min(10, "Alasan minimal 10 karakter")
    .max(2000, "Alasan maksimal 2000 karakter"),
});

export type IzinInput = z.infer<typeof izinSchema>;

export const reviewIzinSchema = z.object({
  izinId: z.string().min(1, "ID pengajuan tidak valid"),
  status: z.enum(["APPROVED", "REJECTED"]),
  catatan: z
    .string()
    .trim()
    .max(2000, "Catatan maksimal 2000 karakter")
    .optional(),
});

export type ReviewIzinInput = z.infer<typeof reviewIzinSchema>;
