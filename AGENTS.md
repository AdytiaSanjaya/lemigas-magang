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


## 🚨 CRITICAL DATABASE & DATA PRESERVATION RULES 🚨

1. NO DESTRUCTIVE ACTIONS: Dilarang keras menjalankan perintah yang menghapus, mereset, atau menimpa data di dalam database (seperti npx prisma migrate reset, npx prisma db push --force, atau npx prisma db seed) tanpa izin tertulis dan eksplisit dari pengguna.

2. PROTECT REAL DATA: Saat melakukan debugging, mengubah skema, atau memperbaiki relasi database, Anda WAJIB menjaga keutuhan data (Real Data) yang sudah ada. Dilarang menghapus data asli hanya demi kelancaran testing.

3. SEEDING PROTOCOL: Jika perbaikan membutuhkan seeding data baru, JANGAN gunakan skrip yang melakukan operasi deleteMany(). Lakukan injeksi data (upsert/create) secara spesifik hanya pada entitas yang kurang tanpa menyentuh entitas yang sudah ada.

4. MANDATORY CONFIRMATION: Selalu jelaskan dampak dari perintah terminal terkait database sebelum Anda mengeksekusinya.