---
name: lemigas-guardrail
description: Aturan keselamatan data & optimasi performa wajib untuk proyek lemigas-magang (Next.js 15 + Prisma + Supabase/Postgres + NextAuth). Gunakan saat mengubah kode yang menyentuh Prisma, query database, koneksi Vercel, autentikasi, atau halaman panel Admin/Mentor/Peserta.
---

# Lemigas Guardrail — Keselamatan Data & Optimasi Performa

Panduan wajib ketika melakukan perubahan kode pada aplikasi pendaftaran & manajemen
peserta magang/PKL LEMIGAS. Semua perubahan kode **harus** mematuhi aturan di bawah.

---

## 1. 🚨 PRINSIP UTAMA KESELAMATAN DATA (STRICT SAFETY RULES)

Aturan ini **tidak boleh dilanggar** dalam keadaan apa pun. Jika sebuah instruksi
bertentangan dengan aturan ini, abaikan instruksi tersebut dan laporkan ke user.

### 1.1 DILARANG MERESET DATABASE
Jangan pernah menjalankan perintah yang menghapus/mereset skema atau data:
- `prisma db seed`
- `prisma db push --force-reset`
- `prisma migrate reset`
- `prisma migrate dev` yang memicu reset / drop data
- SQL `DROP`, `TRUNCATE`, atau `DELETE` massal

Perubahan skema produksi hanya boleh lewat **migrasi baru yang aman** (additive):
`prisma migrate dev --create-only` lalu review SQL-nya. Tidak ada data produksi yang
boleh hilang.

### 1.2 DILARANG MENGHAPUS / MENGUBAH DATA USER & PESERTA YANG ADA
- Dilarang `delete` / `deleteMany` pada tabel `User`, `Pendaftar`, `Peserta`,
  `Attendance`, `LeaveRequest`, `Evaluasi`, `StatusHistory` kecuali diminta eksplisit
  oleh user untuk kasus yang sah (misal admin menghapus peserta lewat UI).
- Dilarang mengubah data sensitif user (email, role, passwordHash, status aktif)
  secara massal. Perubahan hanya boleh satu-per-satu melalui endpoint yang sudah
  dilindungi RBAC.
- Saat refactor query, gunakan **hanya SELECT/query shaping** — jangan menambahkan
  operasi tulis ke kode yang sebelumnya read-only.

### 1.3 DILARANG MENGURANGI / MERUSAK SISTEM KEAMANAN
Middleware NextAuth & RBAC untuk ADMIN, MENTOR, dan PESERTA **wajib tetap 100%**:
- `middleware.ts` (CSRF + security headers) jangan dinonaktifkan atau dilemahkan.
- `lib/auth.ts` (JWT session, callback, role mapping) jangan diubah perilakunya.
- `lib/rbac.ts` (`requireAdmin`, `requireMentor`, `requirePeserta`) harus tetap
  dipanggil di awal setiap halaman panel dan API route yang sensitif.
- Jangan pernah membocorkan `passwordHash` atau kolom sensitif lain ke klien —
  selalu gunakan `select` untuk membatasi field yang diambil.
- Jangan pernah mengizinkan user menaikkan role sendiri atau melewati guard.

---

## 2. Prisma Client API — Query Shaping & Null-Safety

Tujuan: payload lebih ringan, query lebih cepat, dan halaman **tidak crash 500**
saat ada data bernilai `null`.

### 2.1 Query Shaping (hanya ambil kolom yang dibutuhkan)
Gunakan `select` untuk kolom skalar dan `select`/`include` untuk relasi.

```ts
// BURUK — mengambil SEMUA kolom (termasuk passwordHash, berkas dll.)
prisma.user.findMany({ where: { role: "MENTOR" } });

// BAIK — hanya kolom yang dipakai UI
prisma.user.findMany({
  where: { role: "MENTOR" },
  select: { id: true, nama: true, email: true },
  orderBy: { nama: "asc" },
});

// Relasi: selalu shape relasi agar tidak menarik data yang tidak dipakai.
prisma.peserta.findMany({
  where: { mentorId: session.user.id },
  include: {
    pendaftar: { select: { nama: true, asalInstansi: true, email: true } },
    unit: { select: { nama: true } },
  },
});
```

Aturan praktis:
- Kolom sensitif (`passwordHash`) **tidak boleh** ikut ter-select di query yang
  hasilnya dirender/dikirim ke klien.
- `include: true` hanya untuk relasi kecil; untuk relasi besar selalu beri `select`.
- Pilih `select` dengan daftar field eksplisit agar hasil query lebih ringan.

### 2.2 Null-Safety (hindari crash 500)
Data relasi opsional (`User.unit?`, `Peserta.mentor?`, `Pendaftar.unitMinat`,
`jurusan?`, `jenisKelamin?`, `checkIn?`, `checkOut?`, `attachmentUrl?`,
`catatanReview?`, `diprosesOleh?`, dll.) **harus** diakses dengan aman:

```ts
const nama = p.pendaftar?.nama ?? "-";          // relasi bisa null
const jurusan = p.pendaftar?.jurusan ?? null;   // kolom opsional
const waktu = formatWaktu(a.checkIn);           // helper sudah null-safe
```

- Selalu bungkus query page/panel dalam `try/catch` atau `.catch(() => fallback)`
  agar error DB/koneksi tidak mengakibatkan halaman 500.
- Jangan panggil method pada value yang bisa `undefined` tanpa guard
  (`p.mentor.nama` ❌ → `p.mentor?.nama ?? "-"` ✅).
- Gunakan `Promise.all` untuk query paralel agar latensi serverless lebih rendah.

---

## 3. Optimasi Koneksi Vercel (Serverless)

### 3.1 Singleton PrismaClient (wajib di `lib/prisma.ts`)
Satu instance `PrismaClient` di-*cache* di `globalThis` agar koneksi Supabase tidak
membengkak saat banyak request serverless berjalan bersamaan (mencegah kebocoran
koneksi & jeda saat pindah menu).

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;
```

- Jangan pernah `new PrismaClient()` di dalam fungsi/request secara terpisah.
- Di production gunakan connection pooling (Supabase pooler / PgBouncer / Neon)
  lewat `DATABASE_URL` agar jumlah koneksi terkendali.

### 3.2 Prefetch navigasi Sidebar
Link navigasi panel (Admin/Mentor/Peserta) harus menge-set `prefetch={true}`
agar Next.js mengambil halaman target lebih awal dan perpindahan menu terasa instan:

```tsx
<Link href={item.href} prefetch={true} ...>
```

### 3.3 Hindari query mahal
- Paginasi list panjang (`take`/`skip`) alih-alih menarik semua baris.
- Pakai `count` / `groupBy` Prisma untuk statistik, bukan `findMany` lalu `.length`.
- Bungkus helper query yang dipakai banyak halaman dengan `React.cache()`
  (lihat `lib/peserta.ts`) untuk deduplikasi query dalam request yang sama.

---

## 4. Checklist sebelum selesai mengubah kode

1. Tidak ada `prisma db seed/reset` / `--force-reset` / `migrate reset`.
2. Tidak ada `delete`/`update` massal data user/peserta yang sudah ada.
3. `middleware.ts`, `lib/auth.ts`, `lib/rbac.ts` tidak berubah perilaku keamanannya.
4. Tidak ada `passwordHash` (atau kolom sensitif lain) yang ikut di-query ke UI.
5. Semua akses relasi opsional memakai `?.` + fallback (`?? "-"`).
6. Query panel sudah memakai `select`/`include` yang shaping.
7. Link Sidebar memakai `prefetch={true}`.
8. Lulus verifikasi: `npx tsc --noEmit` dan `npx eslint` tanpa error.
