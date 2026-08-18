import { z } from "zod";

// Validasi form pendaftaran online. Semua field wajib divalidasi sebelum masuk DB.
export const pendaftarSchema = z.object({
  nama: z
    .string({ message: "Nama wajib diisi" })
    .min(3, "Nama minimal 3 karakter")
    .max(150, "Nama terlalu panjang"),
  asalInstansi: z
    .string({ message: "Asal instansi wajib diisi" })
    .min(3, "Asal instansi minimal 3 karakter")
    .max(255, "Asal instansi terlalu panjang"),
  jurusan: z
    .string()
    .max(150, "Jurusan terlalu panjang")
    .optional()
    .or(z.literal("")),
  jenisKelamin: z.enum(["L", "P"]).optional(),
  noHp: z
    .string({ message: "No. HP wajib diisi" })
    .regex(/^[0-9+\- ]{8,16}$/, "Format nomor HP tidak valid (8-16 digit)"),
  email: z
    .string({ message: "Email wajib diisi" })
    .email("Format email tidak valid")
    .max(255, "Email terlalu panjang"),
  unitMinatId: z
    .string({ message: "Unit yang diminati wajib dipilih" })
    .min(1, "Silakan pilih unit"),
  applicationType: z.enum(["INDIVIDUAL", "GROUP"]).default("INDIVIDUAL"),
  groupMembers: z
    .array(
      z.object({
        name: z.string({ message: "Nama anggota wajib diisi" }).min(1, "Nama anggota wajib diisi"),
        identifier: z.string({ message: "No. identitas anggota wajib diisi" }).min(1, "No. identitas anggota wajib diisi"),
        major: z.string({ message: "Jurusan anggota wajib diisi" }).min(1, "Jurusan anggota wajib diisi"),
      })
    )
    .optional(),
});

export type PendaftarInput = z.infer<typeof pendaftarSchema>;