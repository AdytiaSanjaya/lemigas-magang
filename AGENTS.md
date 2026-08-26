# AGENTS.md — lemigas-magang

## WAJIB: Lemigas Guardrail

Sebelum mengerjakan **tugas apa pun** di proyek ini, baca dan ikuti aturan di:

**`.agents/skills/lemigas-guardrail.md`**

Aturan tersebut wajib (non-negotiable) untuk semua perubahan yang menyentuh:
- Prisma / query database
- Koneksi Vercel (serverless)
- Autentikasi (`middleware.ts`, `lib/auth.ts`, `lib/rbac.ts`)
- Halaman panel Admin/Mentor/Peserta

Ringkasan poin paling kritis (detail lengkap di file guardrail):
1. DILARANG reset database (`migrate reset`, `db push --force-reset`, `DROP/TRUNCATE/DELETE` massal). Skema produksi hanya lewat migrasi additive yang direview.
2. DILARANG hapus/ubah massal data User/Peserta. Refactor query harus tetap read-only.
3. Sistem keamanan (NextAuth middleware, RBAC) tidak boleh dilemahkan; `passwordHash` tidak boleh pernah ter-select ke klien.
4. Prisma query shaping: `select` eksplisit, null-safety dengan `?.` + fallback, try/catch untuk query panel.
5. Optimasi serverless: singleton PrismaClient di `lib/prisma.ts`, `prefetch={true}` pada Sidebar link, paginasi + `count`/`groupBy`.
6. Verifikasi sebelum selesai: `npx tsc --noEmit` dan `npx eslint` tanpa error.
