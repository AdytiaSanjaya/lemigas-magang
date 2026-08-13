import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ message: "Email wajib diisi" })
    .email("Format email tidak valid")
    .max(255, "Email terlalu panjang"),
  password: z
    .string({ message: "Password wajib diisi" })
    .min(6, "Password minimal 6 karakter")
    .max(128, "Password terlalu panjang"),
});

export type LoginInput = z.infer<typeof loginSchema>;