# LEMIGAS Magang

Sistem Pendaftaran & Manajemen Data Peserta Magang/PKL untuk **Balai Besar Pengujian Minyak dan Gas Bumi (LEMIGAS)**.

## Teknologi

- **Next.js 15** (App Router) + **TypeScript**
- **PostgreSQL** + **Prisma ORM** (connection pooling, tanpa raw SQL)
- **NextAuth.js v5** (Credentials + JWT, RBAC Admin/Mentor)
- **Tailwind CSS**
- **Zod** (validasi semua form & API route)
- bcrypt (hash password), Nodemailer (notifikasi email), exceljs & pdf-lib (laporan), recharts (grafik)

## Fitur

1. **Pendaftaran Online** — form pendaftar + upload CV/surat (PDF asli, maks 2MB, verifikasi magic bytes).
2. **Autentikasi & Hak Akses** — login Admin/Mentor, guard route via middleware + server.
3. **Verifikasi & Seleksi** — admin mengubah status (Menunggu/Diterima/Ditolak) + catatan.
4. **Notifikasi & Cek Status** — pendaftar mengecek status via nomor pendaftaran + email; email otomatis saat status berubah.
5. **Manajemen Peserta Aktif** — penempatan unit, tanggal mulai/selesai, mentor.
6. **Laporan & Rekapitulasi** — dashboard grafik (per bulan, per unit, per status) + ekspor Excel/PDF.

## Keamanan yang diterapkan

- Password di-hash `bcrypt` (tidak pernah plaintext).
- Validasi Zod di semua form & API sebelum akses DB.
- Prisma Query API (bukan raw SQL) → anti SQL Injection.
- Rate limiting (5 request/menit/IP) pada login, pendaftaran, dan cek-status.
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS, dsb.) & CSRF origin-check di middleware.
- Upload PDF diverifikasi dari isi file (magic bytes), ukuran maks 2MB.
- RBAC: halaman `/admin` dan `/mentor` dilindungi role; data sensitif tidak diekspos di halaman publik.

## Kebutuhan

- Node.js 20+
- PostgreSQL 14+

## Instalasi

```bash
# 1. Clone & masuk direktori
cd lemigas-magang

# 2. Install dependensi
npm install

# 3. Salin env & isi nilai sesuai lingkungan Anda
cp .env.example .env
#  -> atur DATABASE_URL, NEXTAUTH_SECRET, SMTP_*, dll.

# 4. Buat skema DB + migrasi
npx prisma migrate dev

# 5. Isi data contoh (seed)
npm run db:seed

# 6. Jalankan aplikasi
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

> Tanpa DB yang tersedia, jalankan dulu PostgreSQL lalu pastikan `DATABASE_URL` mengarah ke database kosong (migrasi akan membuat tabel).

## Akun contoh (hasil seed)

| Role   | Email                        | Password   |
|--------|------------------------------|------------|
| Admin  | `admin@lemigas.example`      | `Magang123`|
| Mentor | `mentor.lab@lemigas.example` | `Magang123`|
| Mentor | `mentor.litbang@lemigas.example` | `Magang123`|

## Script umum

```bash
npm run dev          # development
npm run build        # build produksi
npm run lint         # eslint
npm run db:migrate   # prisma migrate dev
npm run db:seed      # isi data contoh
npm run db:generate  # regenerasi Prisma Client
```

## Struktur folder

```
app/
  (public): /, /daftar, /cek-status, /login, /informasi
  /admin   : dashboard, pendaftar, peserta
  /mentor  : peserta
  /api     : auth, registrasi, verifikasi, peserta, cek-status, berkas, report
components/  : form, tabel, grafik, modal
lib/         : prisma, auth, rbac, rate-limit, security, email, report, validation, format
prisma/      : schema.prisma, seed.ts, migrations/
```
