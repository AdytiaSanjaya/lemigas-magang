import { randomBytes } from "crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

// Role untuk pendaftar/peserta magang yang login via Google OAuth.
export const ROLE_PENDAFTAR = "PENDAFTAR";

// Google OAuth hanya diaktifkan bila GOOGLE_CLIENT_ID/SECRET tersedia.
// Dengan begitu aplikasi tetap berjalan meskipun env belum diset.
const useGoogleAuth = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export const isGoogleAuthEnabled = useGoogleAuth;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    // Semua error autentikasi (termasuk Google ditolak/DB gagal) dipetakan
    // kembali ke halaman login, bukan halaman error bawaan.
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize tidak boleh membuat session; hanya memvalidasi kredensial.
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: { unit: true },
        });

        if (!user || !user.isAktif) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.nama,
          email: user.email,
          role: user.role,
          unitId: user.unitId,
          unitNama: user.unit?.nama ?? null,
        };
      },
    }),
    // Google OAuth untuk pendaftar/peserta magang.
    ...(useGoogleAuth
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
          }),
        ]
      : []),
  ],
  callbacks: {
    // Google OAuth (JIT provisioning): pastikan email sudah ada di database
    // Prisma. Jika belum, buat User baru dengan role PENDAFTAR. Callback ini
    // SELALU mengembalikan true sehingga pembuatan session tidak pernah
    // terblokir oleh error DB atau timeout di serverless (Vercel).
    async signIn({ account, user }) {
      if (account?.provider === "google") {
        const email = (user?.email ?? "").toLowerCase().trim();
        if (email) {
          try {
            const existing = await prisma.user.findUnique({ where: { email } });
            if (!existing) {
              // passwordHash diisi acak: akun Google tidak pernah login via
              // kredensial, jadi password ini hanya memenuhi kolom NOT NULL.
              const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
              await prisma.user.create({
                data: {
                  nama: user.name?.trim() || email.split("@")[0] || "Peserta Magang",
                  email,
                  passwordHash,
                  role: ROLE_PENDAFTAR,
                },
              });
            }
          } catch {
            // Jangan blokir login walau DB gagal; data tetap diteruskan di jwt.
          }
        }
      }
      return true;
    },
    // Isi token JWT hanya dari data yang diteruskan (TANPA query database),
    // agar flow OAuth tidak timeout di fungsi serverless.
    async jwt({ token, user, account }) {
      if (!user) return token; // refresh token: biarkan data lama tetap ada.

      const isGoogle = account?.provider === "google";
      token.email = user.email ?? token.email ?? "";
      token.name = user.name ?? token.name ?? "";

      if (isGoogle) {
        // Login Google hanya untuk pendaftar/peserta magang, jadi role selalu
        // PENDAFTAR. id = sub Google karena tidak ada query DB untuk mengambil
        // primary key Prisma.
        token.uid = token.sub;
        token.role = ROLE_PENDAFTAR;
        token.unitId = null;
        token.unitNama = null;
      } else {
        // Credentials: authorize sudah menyediakan id/role/unit lengkap.
        token.uid = user.id;
        token.role = (user as { role?: string }).role ?? "GUEST";
        token.unitId = (user as { unitId?: string }).unitId ?? null;
        token.unitNama = (user as { unitNama?: string }).unitNama ?? null;
      }
      return token;
    },
    // Salin data token ke session tanpa interaksi DB.
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string | undefined) ?? token.sub ?? "";
        session.user.role = (token.role as string | undefined) ?? "GUEST";
        session.user.unitId = (token.unitId as string | null) ?? null;
        session.user.unitNama = (token.unitNama as string | null) ?? null;
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
});

export type SessionRole = "ADMIN" | "MENTOR" | "PENDAFTAR";