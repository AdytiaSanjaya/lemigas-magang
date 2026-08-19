import { z } from "zod";

// Validasi pencarian status: nomor pendaftaran + email.
export const cekStatusSchema = z.object({
  noPendaftaran: z
    .string({ message: "Nomor pendaftaran wajib diisi" })
    .min(6, "Nomor pendaftaran tidak valid")
    .max(30, "Nomor pendaftaran tidak valid")
    .regex(/^[A-Za-z0-9-]+$/, "Format nomor pendaftaran tidak valid"),
  email: z
    .string({ message: "Email wajib diisi" })
    .email("Format email tidak valid")
    .max(255, "Email terlalu panjang"),
});

export type CekStatusInput = z.infer<typeof cekStatusSchema>;

// Validasi "Lupa Kode Pendaftaran": cukup email untuk menemukan kembali kode
// pendaftaran yang dipakai saat mendaftar.
export const lupaKodeSchema = z.object({
  email: z
    .string({ message: "Email wajib diisi" })
    .email("Format email tidak valid")
    .max(255, "Email terlalu panjang"),
});

export type LupaKodeInput = z.infer<typeof lupaKodeSchema>;