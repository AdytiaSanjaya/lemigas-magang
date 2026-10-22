# Laporan Audit Keamanan — Sistem Pendaftaran & Magang LEMIGAS

**Metode:** Audit statis *strictly read-only* (hanya pembacaan kode sumber).
**Ruang lingkup:** `app/api/**` (21 route), halaman `app/**`, komponen `components/**`, `lib/**`, `middleware.ts`, `prisma/schema.prisma`, konfigurasi `next.config.ts`, `package.json`, `.gitignore`, artefak repo.
**Fokus:** (1) Otorisasi API / IDOR, (2) Keamanan unggahan file (LoA & Sertifikat), (3) Eksposur data sensitif Prisma → Client, (4) Brute-force pada rute publik.
**Batasan:** Tidak ada eksekusi terhadap aplikasi, tidak ada pemindaian dinamis/fuzzing, tidak ada pemeriksaan dependensi CVE terhadap registry, tidak ada pengujian terhadap environment produksi. Tidak ada satu pun berkas kode yang diubah, dihapus, atau dimodifikasi — satu-satunya berkas yang dibuat/ditulis adalah `audit.md` ini.

---

## 0. Ringkasan Eksekutif

Keamanan aplikasi ini pada dasarnya sudah **di atas rata-rata**: RBAC konsisten dipanggil di seluruh route API dan halaman panel, query Prisma di-shaping dengan `select` eksplisit, `passwordHash` tidak pernah terpilih ke klien, unggahan file divalidasi dengan *magic bytes* (bukan sekadar ekstensi), penulisan berkas tidak lagi ke filesystem (disimpan sebagai *data URL* di database), dan ada pembatasan laju (rate limit) pada endpoint publik.

Namun audit menemukan **beberapa kelemahan material** yang bila digabungkan dapat dieksploitasi:

| # | Temuan | Severity | Area |
|---|--------|----------|------|
| AUD-20 | Endpoint login NextAuth **tanpa rate limit / lockout** (middleware sengaja melewatkan `/api/auth`) | **KRITIS** | Brute-force |
| AUD-28 | Endpoint `POST /api/admin/setup` & `POST /api/admin/fix-credentials` dapat **meng-reset password ke default bersama** kapan saja oleh sesi admin | **KRITIS** | Otorisasi / Kredensial |
| AUD-22 | `POST /api/cek-status/lupa-kode` adalah **oracle email → no. pendaftaran**, sehingga "dua faktor" (no+email) pada Cek Status & LoA efektif tinggal **satu faktor (email)** | **TINGGI** | Brute-force / IDOR |
| AUD-20b | Rate limiter **in-memory per-instance** (tidak efektif di Vercel serverless), kunci IP dari `X-Forwarded-For`, `cleanup()` dinonaktifkan | **TINGGI** | Brute-force |
| AUD-01 | `GET /api/berkas/[filename]` hanya mengecek *login*, **tanpa cek kepemilikan** — setiap user login (termasuk Peserta) bisa mengambil file siapa pun | **TINGGI** | IDOR |
| AUD-02 | `GET /api/berkas/dokumen` & `/api/berkas/cv` memberi **MENTOR akses lintas-records** (semua pendaftar, semua unit) tanpa scoping mentor/unit | **SEDANG** | IDOR |
| AUD-08 | Validasi unggahan hanya *magic byte* 16 pertama → file poligraf/rusak diterima, disajikan ulang `inline` tanpa sanitasi struktural PDF | **SEDANG** | Unggahan |
| AUD-14 | Halaman Admin memilih 5 kolom *data URL* PDF penuh (KTP/CV/dsb.) ke memori server tiap render | **SEDANG** | Eksposur Prisma |
| AUD-23 | `noPendaftaran` dibuat **sekuensial** (`count()+1`) → mudah ditebak/disusuri | **SEDANG** | Brute-force |
| AUD-27 | CSP `script-src 'self' 'unsafe-inline' https:` mengizinkan skrip dari **origin HTTPS mana pun** | **SEDANG** | Lintas-area |

**Rantai eksploitasi paling berbahaya (gabungan AUD-20 + AUD-28 + AUD-22):**
diketahui akun default `admin@lemigas.example` + `DEFAULT_ADMIN_PASSWORD` (bila masih default/lemah) → *credential stuffing* tanpa batas ke `/api/auth/callback/credentials` → bila berhasil, endpoint reset password membuat akun admin kembali ke kata sandi default → skala-ke-tinggi. Sisi publik: hanya dengan **email** korban → `lupa-kode` memberi no. pendaftaran → `cek-status` membuka status + catatan admin + riwayat → `POST /api/loa` mengunduh **LoA resmi** bersegel LEMIGAS.

---

## 1. Inventaris Route API & Posisi Kontrol

| Route | Method | Autentikasi / Otorisasi | Rate limit | Catatan |
|---|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth (framework) | **TIDAK ADA** | Dilewatkan middleware (`middleware.ts:51`) |
| `/api/cek-status` | POST | Publik (no+email) | 5/mnt/IP | `app/api/cek-status/route.ts` |
| `/api/cek-status/lupa-kode` | POST | Publik (email saja) | 5/mnt/IP | Oracle email → noPendaftaran |
| `/api/loa` | POST | Publik (no+email) | 5/mnt/IP | Unduh LoA resmi |
| `/api/registrasi` | POST | Session `PENDAFTAR` + email cocok | 5/mnt/IP | Unggahan CV/dokumen |
| `/api/berkas/[filename]` | GET | **Login saja** (semua role) | — | **Tanpa cek kepemilikan** |
| `/api/berkas/cv?id=` | GET | ADMIN/MENTOR **atau** owner-by-email | — | MENTOR tanpa scoping |
| `/api/berkas/dokumen?id&type=` | GET | ADMIN/MENTOR **atau** owner-by-email | — | MENTOR tanpa scoping |
| `/api/sertifikat?pesertaId=` | GET | ADMIN (bebas id) / PENDAFTAR (milik sendiri) | — | MENTOR ditolak (403) ✓ |
| `/api/verifikasi` | PATCH | ADMIN | — | Ubah status + upload LoA |
| `/api/peserta` | GET/PATCH/DELETE | ADMIN | — | ✓ |
| `/api/admin/sertifikat` | POST | ADMIN | — | Unggah sertifikat |
| `/api/admin/setup` | POST | ADMIN | — | Reset password default |
| `/api/admin/fix-credentials` | POST | ADMIN | — | Reset password default |
| `/api/mentor/izin` | PATCH | MENTOR + scoping `peserta.mentorId` | — | ✓ |
| `/api/mentor/evaluasi` | POST | MENTOR + scoping `peserta.mentorId` | — | ✓ |
| `/api/peserta/izin` | POST | PENDAFTAR + `getPesertaBySession` | — | ✓ |
| `/api/peserta/kehadiran` | POST | PENDAFTAR + `getPesertaBySession` | — | ✓ |
| `/api/report/stats` | GET | ADMIN | — | ✓ |
| `/api/report/excel` | GET | ADMIN | — | ✓ |
| `/api/report/pdf` | GET | ADMIN | — | ✓ |

**Kesimpulan inventaris:** semua route menyebut pemeriksaan sesi di awal handler — tidak ada route API yang *lupa* guard. Kerentanan bukan pada "guard hilang", melainkan pada **kedalaman guard** (scoping), **konsistensi publik vs terproteksi**, dan **ketiadaan pengendali laju**.

---

## 2. AREA 1 — Otorisasi API (IDOR / BOLA)

### AUD-01 — `GET /api/berkas/[filename]` : autentikasi tanpa otorisasi (IDOR file) — **TINGGI**

**Lokasi:** `app/api/berkas/[filename]/route.ts:13-32`

```ts
const session = await auth();
if (!session?.user) { ... 401 }
const { filename } = await params;
if (!/^file-[a-f0-9]+\.(pdf|jpg|jpeg)$/i.test(filename)) { ... 400 }
const filePath = path.join(process.cwd(), uploadDir(), filename);
```

**Analisis risiko:** handler hanya memastikan *ada sesi* (role apa pun: `PENDAFTAR`, `MENTOR`, `ADMIN`), lalu membaca file berdasarkan nama. Tidak ada langkah yang memverifikasi bahwa file tersebut milik pemohon. Setiap peserta yang mengetahui/menebak nama file (`file-<12 hex>.pdf`, hasil `randomBytes(6)`, `lib/security.ts:81-83`) dapat mengunduh dokumen (CV, KTP/KTM, transkrip, LoA) peserta lain. Entropi nama file memang tinggi (48 bit) sehingga *brute-force* murni tidak realistis, tetapi:
- nama file mudah bocor (riwayat browser, log, tangkapan layar, file lama yang pernah dibagikan, atau rekaman lama berlabel `/berkas/<nama>`); dan
- prinsip "*deny by default*" tidak diterapkan — keamanan bergantung pada kerahasiaan nama file, bukan pada bukti kepemilikan.

Endpoint ini **tidak dipakai oleh UI mana pun** (pemindaian `grep "api/berkas"` hanya menemukan pemakaian `/api/berkas/dokumen` di `components/admin/verifikasi-actions.tsx:164`). Artinya ini permukaan serangan mati yang bisa dihilangkan.

**Rekomendasi tambalan:**
1. **Hapus route** `app/api/berkas/[filename]/route.ts` (paling bersih), atau
2. Jika masih diperlukan untuk kompatibilitas: wajibkan `role === "ADMIN"`, **dan** lakukan query `Pendaftar`/`Peserta` untuk memastikan `berkasCV/loaUrl/...` yang menyimpan nama file tersebut milik sesi pemilik; tolak dengan 403 bila tidak cocok.
3. Terapkan pola sama dengan endpoint lain: `select` hanya kolom boolean keberadaan file, lalu sajikan stream.

### AUD-02 — `/api/berkas/dokumen` & `/api/berkas/cv` : MENTOR tanpa scoping (bola horizontal + vertikal) — **SEDANG**

**Lokasi:** `app/api/berkas/dokumen/route.ts:105-111` dan `app/api/berkas/cv/route.ts:74-79`

```ts
const isOwner = pendaftarEmail && session.user.email === pendaftarEmail;
const isPrivileged = userRole === "ADMIN" || userRole === "MENTOR";
if (!isOwner && !isPrivileged) return ... 403;
```

**Analisis risiko:** UI mentor **tidak pernah** memanggil endpoint ini (hanya admin — `verifikasi-actions.tsx:164`), dan UI admin pun sudah menautkannya lewat `/api/berkas/dokumen`. Namun secara API, **mentor mana pun** dapat mengambil CV, **KTP/KTM**, surat pengantar, transkrip nilai, dan LoA **pendaftar mana pun** — termasuk pendaftar unit lain dan pendaftar yang belum pernah menjadi bimbingannya — cukup dengan `?id=<pendaftarId>`. Tidak ada pemeriksaan `peserta.mentorId === session.user.id` (pola scoping yang sudah benar dipakai di `app/api/mentor/evaluasi/route.ts:40` dan `app/api/mentor/izin/route.ts:57`).

Ini pelanggaran prinsip *least privilege*: dokumen identitas (KTP) seharusnya terbatas pada ADMIN.

Catatan positif (sudah diperiksa, aman):
- Pembandingan email owner bersifat *fail-closed* (bila `pendaftar` tidak ada → `isOwner=false` → 403), sehingga **tidak ada** *oracle* keberadaan record dari perbedaan status respons (`dokumen/route.ts:87-111`).
- Pembandingan email case-sensitive (`session.user.email === pendaftarEmail`, `dokumen/route.ts:107`) hanya berpotensi *menolak* pemilik yang sah (akun Google jarang bercase), bukan membuka akses — kecacatan fungsional, bukan kerentanan.

**Rekomendasi tambalan:**
1. Batasi `isPrivileged` menjadi `userRole === "ADMIN"` untuk tipe berkas identitas (`ktp`, `transkrip`), dan untuk `MENTOR` wajibkan relasi: peserta dengan `pendaftarId` tsb. harus memiliki `mentorId === session.user.id`.
2. Pindahkan pemeriksaan otorisasi **sebelum** query (hemat query & menghindari pola "query dulu, baru cek").
3. Gunakan satu helper otorisasi terpusat, mis. `canReadPendaftarDocs(session, pendaftarId)`, agar aturan tidak terduplikasi di dua file.

### AUD-04 — `PATCH /api/verifikasi` : `mentorId` tidak divalidasi (role & FK) — **RENDAH**

**Lokasi:** `app/api/verifikasi/route.ts:40`, `:149`, `:159`; skema `lib/validation/verifikasi.ts:11`

`mentorId` diterima sebagai `z.string().optional()` lalu langsung ditulis ke `Peserta.mentorId`. Berbeda dengan `PATCH /api/peserta` yang memvalidasi keberadaan user **dan** `mentor.role === "MENTOR"` (`app/api/peserta/route.ts:48-54`). Akibat: (a) nilai FK tidak valid → P2003 → *unhandled* 500 karena blok transaksi tidak dibungkus try/catch (`verifikasi/route.ts:119-164`); (b) admin API bisa menetapkan user ber-role `ADMIN`/`PENDAFTAR` sebagai "mentor" bila UI disiasati — melanggar integritas RBAC data.

**Rekomendasi:** samakan validasi dengan `app/api/peserta/route.ts:48-54` (cek eksistensi + `role === "MENTOR"`), dan bungkus transaksi dengan try/catch yang mengembalikan JSON 500.

### AUD-05 — Middleware tidak menerapkan *deny-by-default* untuk API & halaman — **INFO (defense-in-depth)**

**Lokasi:** `middleware.ts:47-76`

Middleware hanya memasang *security header* + pemeriksaan `Origin` untuk penulisan ke `/api`. Ia **tidak** pernah memverifikasi sesi/role. Artinya:
- keamanan seluruh API bergantung pada disiplin setiap `route.ts` memanggil `auth()` (saat ini sudah dilakukan — baik, tapi rapuh);
- keamanan halaman bergantung pada setiap `page.tsx` memanggil `requireAdmin/requireMentor/requirePeserta` (saat ini juga dilakukan, tetapi satu halaman baru yang lupa guard = langsung terbuka).

**Rekomendasi:** terapkan *deny-by-default* di middleware untuk `/api/*` dengan allowlist publik (`/api/auth/*`, `/api/cek-status*`, `/api/loa`, `/api/registrasi`), dan untuk panel gunakan allowlist path (`/admin/*`, `/mentor/*`, `/peserta/*`) yang mewajibkan kehadiran sesi sebelum masuk ke Server Component. Guard di dalam kode tetap dipertahankan (lapis kedua).

### AUD-06 — `requirePeserta` gagal-terbuka (*fail-open*) saat DB error — **RENDAH**

**Lokasi:** `lib/peserta.ts:38-50` dipakai `lib/rbac.ts:35-36`

```ts
} catch {
  // Gagal DB: jangan blokir akses (konsisten dengan fallback di lib/auth.ts).
  return true;
}
```

Bila query `Pendaftar` error (timeout, koneksi putus), guard portal peserta **menganggap semua akun PENDAFTAR terdaftar** → setiap akun Google apa pun diarahkan ke `/peserta/dashboard`. Query di halaman panel sendiri memakai `.catch(() => fallback)`, sehingga halaman akan render dalam keadaan kosong — dampak praktis terbatas (tidak ada data orang lain yang bocor karena query lain juga gagal), tetapi ini melanggar prinsip *fail-closed* pada kontrol akses dan dapat menciptakan status halaman yang menyesatkan saat insiden.

Catatan: jalur API (`getPesertaBySession` → `null` → 403) berperilaku *fail-closed*, sehingga terjadi **ketidakkonsistenan** antara halaman dan API.

**Rekomendasi:** ubah menjadi `return false` (tolak saat DB tidak tersedia) atau kembalikan redirect ke halaman "gangguan teknis"; jangan pernah mengabulkan guard berdasarkan error.

### AUD-07 — Kontrol otorisasi yang sudah BENAR (verifikasi positif)

Bagian ini dicatat agar tim tidak "memperbaiki" kontrol yang sudah berjalan:

- `/api/report/*`, `/api/peserta` (GET/PATCH/DELETE), `/api/verifikasi`, `/api/admin/*` → semua `role !== "ADMIN"` → 403 (`report/excel/route.ts:11-14`, `peserta/route.ts:16-19,76-79,112-115`, `verifikasi/route.ts:21-24`, `admin/setup/route.ts:10-13`).
- `/api/sertifikat` → ADMIN boleh `pesertaId` apa pun; PENDAFTAR dibatasi `getSertifikatByEmail(session.user.email)` (`sertifikat/route.ts:44-69`); MENTOR ditolak tegas (403).
- Scoping mentor yang benar: `peserta.mentorId !== session.user.id` pada `mentor/evaluasi/route.ts:40` dan join email → `peserta.mentorId` pada `mentor/izin/route.ts:53-62`; daftar halaman `app/mentor/peserta/page.tsx:39` dan `app/mentor/izin/page.tsx:16-32` juga sudah difilter `mentorId`/email bimbingan.
- `/api/registrasi` mengikat email form ke email session (`registrasi/route.ts:86-91`) → manipulasi email tidak mungkin.
- Tidak ditemukan `passwordHash` yang ter-select pada jalur apa pun selain `lib/auth.ts:42` (untuk `bcrypt.compare`) dan skrip admin/seed — sudah sesuai guardrail.
- `session.user.id` untuk akun Google di-resolve ke PK Prisma di `jwt` callback (`lib/auth.ts:119-135`), dan resolver `getUserIdBySession` dipakai untuk FK (`peserta/izin`, `peserta/kehadiran`, `mentor/evaluasi`) — mencegah salah-FK dan mencegah manipulasi id.

---

## 3. AREA 2 — Keamanan Unggahan File (LoA & Sertifikat)

### Kontrol yang sudah ada (positif)

| Kontrol | Lokasi | Penilaian |
|---|---|---|
| Deteksi tipe via *magic bytes* (`%PDF-`, `FF D8 FF`) bukan ekstensi | `lib/security.ts:7-73` | Baik |
| Batas ukuran dari env, default 2MB, dicek **sebelum** membaca isi | `lib/security.ts:50-58`, `:85-88` | Baik (cegah pembacaan memori massal) |
| Tidak menulis ke filesystem — disimpan sebagai *data URL* di DB | `registrasi/route.ts:120-136`, `verifikasi/route.ts:88`, `admin/sertifikat/route.ts:81` | Baik (aman untuk Vercel read-only FS) |
| Pembacaan rekaman lama dkk. dijaga regex + `pop()` basename (anti path traversal) | `loa/route.ts:108-113`, `sertifikat/route.ts:95-98`, `berkas/cv/route.ts:99-102` | Baik |
| Nama file legacy acak (`file-<hex>`) | `lib/security.ts:81-83` | Baik |
| Upload LoA hanya ADMIN + wajib saat `DITERIMA` | `verifikasi/route.ts:21-24,76-94` | Baik |
| Upload sertifikat hanya ADMIN + gerbang masa magang selesai | `admin/sertifikat/route.ts:27-75` | Baik |
| Respon file memakai `X-Content-Type-Options: nosniff` + `Cache-Control: private` | `berkas/dokumen/route.ts:17-27` | Baik |
| `/uploads` masuk `.gitignore`, tidak ada di `public/` | `.gitignore` (`/uploads`) | Baik |

### AUD-08 — Validasi hanya "kepala" file: tidak ada pemeriksaan struktural PDF — **SEDANG**

**Lokasi:** `lib/security.ts:44-73` (hanya 16 byte pertama), dipakai `registrasi/route.ts:109-136`, `verifikasi/route.ts:81-87`, `admin/sertifikat/route.ts:54-57`, `peserta/izin/route.ts:91-95`

**Analisis risiko:**
- File dengan header `%PDF-` diterima apa pun isinya: PDF rusak, PDF berisi eksploit *parser* (CVE pemutar PDF di browser), file poligraf (PDF+HTML), atau file dengan *decompression bomb* (objek xref/raksasa yang memicu konsumsi memori/CPU saat dirender).
- Berkas dikirim ulang dengan `Content-Disposition: inline` (`berkas/dokumen/route.ts:17-27`, `berkas/cv/route.ts:33-43`) sehingga **langsung dirender di tab browser** — memperbesar dampak bila ada bug parser.
- Tidak ada lapisan pemindaian malware, tidak ada tanda tangan/integritas (checksum), tidak ada isolasi origin untuk penyajian file (semua endpoint berada di origin yang sama dengan aplikasi login).

**Rekomendasi tambalan:**
1. Validasi struktural wajib: parse file dengan `pdf-lib` (`PDFDocument.load(buf, { ignoreEncryption: false })`) dan tolak bila gagal/berjumlah halaman tak wajar; lakukan hal serupa via `sharp`/metadata JPEG untuk gambar.
2. Batasi ukuran berkas **setelah** dekode (cek panjang buffer hasil `arrayBuffer()`), bukan hanya `file.size` pelaporan browser.
3. Sajikan file sebagai `Content-Disposition: attachment` (kecuali bila perlu pratinjau), tambahkan header `Content-Security-Policy: sandbox; default-src 'none'` khusus pada respons file, dan pertimbangkan subdomain/origin terpisah untuk penyajian dokumen.
4. Pantau CVE pemutar PDF browser dan pertahankan `nosniff` (sudah ada).

### AUD-09 — Tidak ada kuota penyimpanan per akun (bloat/DoS basis data) — **SEDANG**

**Lokasi:** `registrasi/route.ts:99-136`, `peserta/izin/route.ts:88-96`, kolom `prisma/schema.prisma:108-114,162,218`

Semua berkas (CV, surat, KTP, transkrip, LoA, sertifikat, lampiran izin) disimpan sebagai *data URL base64* **di dalam row Postgres**. Tidak ada batas jumlah berkas per akun, tidak ada batas total penyimpanan, dan `/api/registrasi` hanya dibatasi 5 req/menit/IP. Konsekuensi: (a) pertumbuhan ukuran database & durasi backup tak terkontrol; (b) *base64* menambah ~33% ukuran; (c) row sangat besar memperlambat setiap `SELECT` yang tidak di-*exclude* (lihat AUD-14); (d) batas ukuran Postgres/Supabase per row dapat membuat insert gagal di tengah transaksi.

**Rekomendasi tambalan:** simpan berkas di object storage (Supabase Storage / S3) dan simpan hanya URL + SHA-256; atau minimal tetapkan kuota (mis. maks 5 file × 2MB per pendaftar) dan tolak bila terlampaui; gunakan kolom `bytesa`/tabel terpisah, jangan kolom teks biasa.

### AUD-10 — Riwayat legacy: file fisik masih tersedia & dua jalur penyajian — **RENDAH**

Direktori `uploads/` berisi 6 PDF legacy (`file-068d0ad886af.pdf`, dll.) dan masih dilayani oleh 4 endpoint berbeda dengan jalur kode masing-masing (`loa`, `sertifikat`, `berkas/cv`, `berkas/[filename]`). Dua jalur = dua peluang bug, dan file fisik di disk Vercel (read-only, hilang saat *redeploy*) bisa menimbulkan inkonsistensi data.

**Rekomendasi:** migrasi final legacy → object storage / data URL, hapus jalur pembacaan filesystem dan route `[filename]` (AUD-01), lalu bersihkan `uploads/`.

### AUD-11 — Tidak ada jejak audit untuk akses dokumen identitas — **RENDAH (kepatuhan)**

Pengunduhan KTP/KTM, CV, LoA, dan sertifikat tidak dicatat siapa, kapan, dan berapa kali diakses. Untuk data pribadi (jenis kelamin, no. HP, KTP, alamat instansi) yang tunduk pada UU PDP, minimnya *audit trail* menyulitkan investigasi bila terjadi kebocoran.

**Rekomendasi:** tulis baris `AccessLog` (actorId, targetId, jenisDokumen, waktu, IP) pada semua endpoint penyajian file; sediakan tampilan log untuk ADMIN.

### AUD-12 — Artefak publik tidak relevan di repo — **INFO**

`public/dummy-loa.pdf` (701 byte, berisi teks "Surat Balasan / LoA - LEMIGAS") ter-*track* di git dan dapat diakses publik tanpa autentikasi (`https://<domain>/dummy-loa.pdf`). Isinya hanya contoh, tetapi keberadaan template LoA publik memudahkan pemalsuan visual dan seharusnya tidak ada di `public/`.

**Rekomendasi:** pindahkan contoh ke direktori non-public atau hapus.

---

## 4. AREA 3 — Eksposur Data Sensitif Prisma → Client

### Kontrol yang sudah ada (positif)

- Tidak ditemukan `NEXT_PUBLIC_*` yang memuat rahasia (pemindaian: nol kecocokan).
- Tidak ada `dangerouslySetInnerHTML`/`innerHTML` di seluruh kode (nol kecocokan) — risiko XSS sinkronisasi DOM rendah.
- Halaman admin memilih kolom secara eksplisit dan **mengonversi *data URL* menjadi boolean** sebelum dikirim ke komponen klien:
  - `app/admin/pendaftar/page.tsx:46-65` (select) → `:162-166` (`cvTersedia: Boolean(...)` dsb.);
  - `app/admin/peserta/page.tsx:34-46` bahkan sengaja tidak memilih `sertifikatUrl`.
- `/api/cek-status` membuang `email` & `loaUrl` dari respons (`cek-status/route.ts:60-64`) dan hanya mengirim boolean `loaTersedia`.
- Laporan Excel/PDF hanya memilih kolom ringkas: `noPendaftaran, nama, asalInstansi, unit, status, tanggal` (`report/excel/route.ts:41-48`).
- `passwordHash` hanya dibaca di `lib/auth.ts:49` dan tidak pernah masuk objek `authorize()` yang disalin ke token (`lib/auth.ts:52-59`).

### AUD-14 — Admin memilih 5 kolom PDF penuh (*data URL*) per render — **SEDANG**

**Lokasi:** `app/admin/pendaftar/page.tsx:46-61`

```ts
select: { ..., cvUrl: true, suratPengantarUrl: true, ktpKtmUrl: true,
          transkripUrl: true, loaUrl: true, ... }
```

Baris dikonversi ke boolean di `:162-166`, sehingga **isi PDF tidak bocor ke RSC payload/klien** (sudah diperiksa — props yang diteruskan ke `VerifikasiActiva` hanya boolean). Namun demikian:
1. Setiap render halaman memuat hingga 10 × 5 PDF penuh (bisa puluhan MB) ke memori serverless → risiko *timeout*/*OOM* dan tagihan durasi eksekusi.
2. Risiko regresi keamanan berikutnya sangat tinggi: satu penambahan `...p` atau `JSON.stringify(p)` ke props klien akan langsung membocorkan KTP berisi NIK ke browser.
3. Bertentangan dengan pola yang sudah diterapkan benar di `admin/peserta/page.tsx:56-64` (query terpisah hanya untuk keberadaan).

**Rekomendasi tambalan:** ikuti pola `admin/peserta/page.tsx` — query kedua `where: { id: { in: [...] }, cvUrl: { not: null } } select: { id: true }` (per kolom) lalu hasilkan `Set<string>` boolean. **Tanpa** memilih kolom `*Url` sama sekali pada query tabel.

### AUD-15 — Cek Status membocorkan `catatan` internal admin — **RENDAH**

**Lokasi:** `app/api/cek-status/route.ts:33,60-64`

`catatan` (komentar internal admin yang juga dikirim via email ke pendaftar, `verifikasi/route.ts:167-173`) ikut dikembalikan ke klien. Nilai `catatan` berasal dari `z.string().max(1000)` — admin bisa menuliskan catatan internal (mis. catatan penilaian/kualifikasi) yang **tidak** dimaksudkan untuk publikasi. Diperparah oleh AUD-22 di mana "kunci" kedua efektif hanya email.

**Rekomendasi:** kembalikan hanya catatan yang memang bersifat notifikasi (atau sediakan kolom terpisah `catatanPublik` vs `catatanInternal`); jangan menyimpan catatan internal pada record yang dibaca endpoint publik.

### AUD-16 — *Data URL* PDF ditanam langsung ke dalam HTML halaman (`href`) — **RENDAH**

**Lokasi:** `app/mentor/izin/page.tsx:125-137` dan `app/peserta/izin/page.tsx:76,182-186`

`href={r.attachmentUrl}` menaruh seluruh berkas bukti (hingga 2MB, ter-*base64*) ke dalam HTML yang dirender. Dampak:
- Payload halaman meledak (8 record/halaman) → latensi & biaya serverless.
- Entri data pribadi mudah "terekstrak" dari *page source* (meski pemilik/mentor berhak atas datanya).
- Berfungsi hanya bila `attachmentUrl` adalah `data:` URL; navigasi top-frame ke `data:` diblokir browser modern (Chrome/Firefox) sehingga tautan "Lihat" kemungkinan tidak berfungsi → bug fungsional sekaligus.

**Rekomendasi:** ganti dengan endpoint terotorisasi, mis. `GET /api/berkas/attachment?id=<leaveRequestId>` (cek `LeaveRequest.userId === session.user.id` atau mentor pembimbing), dan kirimkan `Content-Disposition: inline` dengan header keamanan seperti endpoint file lain.

### AUD-17 — Query relasi berlebihan pada halaman mentor — **INFO**

`app/mentor/izin/page.tsx:33` memakai `include: { user: { select: { email } } }` terhadap `LeaveRequest` (tanpa `select` kolom) dan menyebar `...r` ke `requests` (`:39-45`). Saat ini hanya `IzinActions` yang menerima subset (`:145-152`), sehingga tidak ada kebocoran ke klien — tetapi pola "objek utuh + spread" rawan bocor bila komponen klien ditambahkan.

**Rekomendasi:** gunakan `select` eksplisit pada `leaveRequest.findMany` (guardrail §2.1).

### AUD-18 — Penanganan error tidak konsisten & berpotensi bocor metadata — **RENDAH**

- `app/api/peserta/izin/route.ts` dan `app/api/mentor/*` tidak dibungkus try/catch global (berbeda dengan `peserta/kehadiran/route.ts:36-183` yang dengan baik mengembalikan JSON 500 generik). Prisma error yang lolos akan memicu *error boundary* Next.js — di produksi Next menyembunyikan stack, tetapi di `NODE_ENV` yang salah terkonfigurasi isi error bisa terkirim.
- `app/api/verifikasi/route.ts:119-164` tanpa try/catch pada `$transaction` (lihat AUD-04).
- `console.error("[kehadiran] ...", err)` dan `console.error("Gagal mengirim email:", e)` mencetak objek error penuh ke log — pastikan tidak pernah menyertakan `DATABASE_URL`/kredensial (Prisma umumnya tidak, tapi verifikasi di panel log Vercel).

**Rekomendasi:** terapkan pola pembungkus try/catch seragam (contoh baik sudah ada di `peserta/kehadiran`), dan pastikan `NODE_ENV=production` di produksi.

### AUD-19 — Data yang terpapar ke klien dan SUDAH benar (verifikasi positif)

- `/api/peserta/izin` → `record` dikembalikan ke pemohonnya sendiri (`peserta/izin/route.ts:113-116`), termasuk `attachmentUrl` miliknya sendiri.
- `/api/peserta/kehadiran` → `record` (latitude/longitude) milik sendiri.
- `/api/mentor/izin` → `record` hanya untuk mentor pembimbing yang lolos scoping.
- Halaman `app/peserta/dashboard/page.tsx:134` hanya memilih boolean keberadaan sertifikat.
- JWT/session hanya membawa `id, name, email, role, unitId, unitNama` (`lib/auth.ts:184-202`).

---

## 5. AREA 4 — Kerentanan Brute-force pada Rute Publik

### AUD-20 — Login NextAuth tanpa pembatasan laju, tanpa lockout — **KRITIS**

**Lokasi:** `middleware.ts:51` (`if (!pathname.startsWith("/api") || pathname.startsWith("/api/auth")) return response;`) dan `components/forms/login-form.tsx:50-54`

```ts
const res = await signIn("credentials", { email, password, redirect: false });
```

**Analisis risiko:**
1. Middleware **secara eksplisit** tidak memproses `/api/auth/*`, sehingga `POST /api/auth/callback/credentials` tidak kena pemeriksaan apa pun.
2. `lib/rate-limit.ts` tidak pernah dipanggil di mana pun pada jalur login (dipakai hanya di `cek-status`, `lupa-kode`, `loa`, `registrasi`).
3. Tidak ada *lockout*, *exponential backoff*, CAPTCHA, *proof-of-work*, atau pencatatan kegagalan login.
4. Kebijakan kata sandi minimum hanya 6 karakter (`lib/validation/auth.ts:10`) dan akun admin memakai **satu default password bersama** (`DEFAULT_ADMIN_PASSWORD`, lihat AUD-28) dengan akun ber-email tetap dikenal publik (`admin@lemigas.example` — `admin/setup/route.ts:6`).
5. Tidak ada indikator komunikasi error yang merata (`"Email atau password salah."` — `login-form.tsx:58` sudah bagus, tetapi *timing* `bcrypt.compare` tidak disamakan karena `findUnique` gagal dini saat email tidak ada).

Dampak: *credential stuffing/password spraying* tanpa batas terhadap panel ADMIN/MENTOR, yang mengendalikan seluruh data pendaftar, dokumen identitas, dan LoA.

**Rekomendasi tambalan (berurutan prioritas):**
1. Terapkan rate limit pada `/api/auth/callback/credentials` dan `/api/signin/credentials`: kunci gabungan `ip` + `email`, mis. 5 percobaan/menit/IP dan 10 percobaan/15 menit/email, dengan 429 + `Retry-After`.
2. Tambahkan *lockout progresif* (mis. setelah 10 kegagalan berturut-turut per email → kunci 15 menit, exponential) dan reset counter saat sukses; catat ke tabel `LoginAttempt`.
3. Tambahkan CAPTCHA (Cloudflare Turnstile) pada form kredensial setelah ambang kegagalan.
4. Samakan waktu respons pada "email tidak ada" vs "password salah" (lakukan `bcrypt.compare` terhadap hash palsu agar timing seragam).
5. Pertimbangkan 2FA (TOTP) untuk role ADMIN, dan paksa rotasi password default (AUD-28).
6. Pantau peringatan Vercel/WAF untuk pola *spraying*.

### AUD-20b — Rate limiter tidak efektif di serverless + kebocoran memori — **TINGGI**

**Lokasi:** `lib/rate-limit.ts:16-64`, `:67-71`

Temuan teknis:
1. **State in-memory per instance lambdas** (`Map` per isolasi) — di Vercel Serverless ada banyak instance paralel dan *cold start* yang mengosongkan bucket. Serangan tersebar memperoleh kuota penuh per instance → limit 5/menit efektif menjadi `5 × jumlah_instance`.
2. **`cleanup()` tidak pernah dijalankan** — pemanggilannya dikomentari (`:60-64`), sehingga bucket kedaluwarsa yang kuncinya tidak lagi diakses menetap selama hidup instance → pertumbuhan memori lambat; memori instance yang membengkak mempercepat *eviction*/gangguan.
3. **Kunci IP dari `X-Forwarded-For` pertama** (`:67-71`). Di Vercel header ini biasanya ditulis platform, tetapi bila aplikasi pernah dijalankan di balik proxy yang meneruskan nilai klien (Docker/VPS/preview lokal), penyerang dapat **memutar IP semu** dalam header sehingga mendapatkan kuota tak terbatas sekaligus mempercepat pertumbuhan `Map` (DoS memori).
4. `getClientIp` mengembalikan `"unknown"` bila tidak ada header → seluruh klien tanpa IP berbagi **satu** bucket (risiko pemblokiran massal/*self-DoS* sekaligus celah bila pelacakan gagal).

**Rekomendasi tambalan:**
1. Gunakan penyimpanan terdistribusi (Upstash Redis / Vercel KV / Supabase) lewat interface `RateLimiter` yang sudah disediakan (`rate-limit.ts:7-9`) — interface-nya sudah siap, tinggal implementasi.
2. Aktifkan kembali `cleanup()` (atau gunakan `INCR`+`EXPIRE` Redis sehingga tidak perlu cleanup).
3. Ambil IP tepercaya dari header yang ditetapkan platform (mis. `x-real-ip`/`x-vercel-forwarded-for`) dan **abaikan** nilai klien bila berada di belakang proxy tepercaya; jangan memecah string `x-forwarded-for` mentah.
4. Terapkan limit berlapis: per-IP, per-`email`, dan per-`noPendaftaran`.

### AUD-22 — `lupa-kode` menurunkan faktor keamanan Cek Status & LoA menjadi satu faktor (email) — **TINGGI**

**Lokasi:** `app/api/cek-status/lupa-kode/route.ts:39-60`

```ts
const pendaftar = await prisma.pendaftar.findMany({ where: { email }, ... });
if (pendaftar.length === 0) return ... 404 "Email tidak ditemukan. ..."
return NextResponse.json({ pendaftar });   // → noPendaftaran, nama, status, createdAt, unit
```

**Analisis risiko:**
1. Endpoint publik ini menerima **hanya email** dan mengembalikan `noPendaftaran` + `status` + `nama` + `unitMinat` untuk setiap kecocokan.
2. Respons 404 khusus `:53-58` adalah **oracle enumerasi email** ("Email tidak ditemukan") — membedakan email terdaftar vs tidak.
3. Karena `/api/cek-status` dan `/api/loa` membutuhkan pasangan `noPendaftaran + email` (`cek-status/route.ts:49`, `loa/route.ts:64-73`), dan `lupa-kode` **memberikan bagian pertama dari pasangan itu hanya dengan email**, maka "dua faktor" itu efektif tinggal **satu faktor: mengetahui email korban**.

**Rantai eksploitasi konkret (tanpa autentikasi):**
`POST /api/cek-status/lupa-kode {email}` → dapat `noPendaftaran`
→ `POST /api/cek-status {no, email}` → dapat status, riwayat status, **catatan admin** (AUD-15), tanggal magang
→ `POST /api/loa {no, email}` → **mengunduh LoA resmi** (PDF bersegel LEMIGAS atas nama korban).

Rate limit 5/menit/IP memperlambat, tetapi tidak menghentikan: penyerang hanya butuh 3 request per target, dan limit bersifat per-instance (AUD-20b) — dengan rotasi IP/target, cakupan tetap luas.

**Catatan desain:** `noPendaftaran` memang sengaja dibuat "pengetahuan yang sama dengan Cek Status" (komentar `loa/route.ts:24-27`) — namun `lupa-kode` menghapus asumsi itu.

**Rekomendasi tambalan:**
1. **Jangan** kembalikan `noPendaftaran` dari `lupa-kode`. Ganti dengan alur pengiriman aman: kirim kode pemulihan ke **email terdaftar** (atau WhatsApp ke `noHp` yang tercatat) berumur pendek + sekali pakai, lalu tukar kode itu untuk membuka Cek Status.
2. Samakan respons (tidak membedakan "email tidak terdaftar") — balas generik "Jika email terdaftar, instruksi telah dikirim", dan pertahankan pengiriman email yang sama-sama terjadi agar tidak menjadi *timing oracle*.
3. Tambahkan CAPTCHA pada `lupa-kode` dan limit per-account (bukan hanya per-IP).
4. Pertimbangkan tanda tangan/HMAC pada `noPendaftaran` bila tetap ingin format terbaca.

### AUD-23 — `noPendaftaran` sekuensial dan mudah ditebak — **SEDANG**

**Lokasi:** `app/api/registrasi/route.ts:15-26`

```ts
const count = await prisma.pendaftar.count();
const seq = (count + 1).toString().padStart(4, "0");
let candidate = `LEMIGAS-${year}-${seq}`;
```

Format `LEMIGAS-<tahun>-<urutan 4 digit>` dapat disusuri linear (0001…9999) tanpa biaya berarti. Kombinasi dengan enumerasi email (AUD-22) membuat seluruh basis data pendaftar dapat dipetakan; tanpa `lupa-kode` pun, penyerang cukup menebak nomor untuk tiap email yang diketahui. Selain itu mekanisme `count()+1` rapuh terhadap penghapusan data (menyebabkan nomor ganda → loop acak 4 digit dengan risiko tumbukan).

**Rekomendasi tambalan:** gunakan identitas acak yang tidak dapat disusuri (mis. kode 8–10 karakter dari alphabet acak tanpa kemiripan visual, atau UUID) untuk konsumen publik, pertahankan nomor urut hanya sebagai kolom internal/arsip. Bila format korporat wajib, tautkan dengan token acak saat diberikan kepada pemohon.

### AUD-24 — Batas laju publik terlalu sederhana & berisiko menyasar pengguna sah — **SEDANG**

**Lokasi:** `lib/rate-limit.ts:52-57` (default `RATE_LIMIT_MAX=5` per 60 detik), dipakai di `cek-status`, `lupa-kode`, `loa`, `registrasi`

- Satu limit untuk semua entitas per IP → pengguna di NAT/kantor/HP yang sama dengan cepat terkena 429 selama 60 detik (masalah ketersediaan, bukan sekadar keamanan).
- Tidak ada limit per-account/per-target → penyerang dapat menyebar percobaan ke ribuan target berbeda dengan tetap berada di bawah limit per-IP.
- Tidak ada *backoff* bertingkat, tidak ada CAPTCHA, tidak ada penebusan limit via verifikasi.
- `POST /api/registrasi` juga membatasi 5/menit/IP, namun tidak membatasi per-email → pendaftaran ganda (lihat AUD-26).

**Rekomendasi:** limit berlapis (per-IP lembut + per-email keras), nilai berbeda per endpoint (mis. `lupa-kode` 3/jam/email), penambahan CAPTCHA untuk endpoint pemulihan, dan respons 429 selalu menyertakan `Retry-After` (sudah dihitung di `registrasi/route.ts:36`, namun belum ada di endpoint lain).

### AUD-26 — `Pendaftar.email` tidak unik → pendaftaran ganda & nomor ambigu — **RENDAH**

**Lokasi:** `prisma/schema.prisma:105,127` (hanya `@@index([email])`, tanpa `@@unique`), `registrasi/route.ts:140-165`

Satu email dapat membuat banyak record pendaftar (tiap record dengan `noPendaftaran` berbeda, status `MENUNGGU` masing-masing). Konsekuensi keamanan: (a) `lupa-kode` mengembalikan **array** semua record (`lupa-kode/route.ts:41-60`) → semakin banyak kode untuk satu email; (b) `/api/loa` mengambil satu record berdasarkan `noPendaftaran` saja — pasangan no+email tetap akurat, tetapi ambiguitas mempersulit penyelidikan; (c) memudahkan *spam* pendaftaran.

**Rekomendasi:** logika bisnis menentukan apakah email wajib unik; minimal tolak pendaftaran baru jika masih ada record `MENUNGGU`/`PESERTA_AKTIF` dengan email sama (pemeriksaan sudah ada di halaman `app/daftar/page.tsx:25-84`, tetapi **belum** ada di endpoint `POST /api/registrasi`) — pindahkan pemeriksaan itu ke server route dalam transaksi.

### AUD-27 — CSP terlalu longgar (`script-src https:` + `unsafe-inline`) — **SEDANG** (lintas area)

**Lokasi:** `middleware.ts:18-32`

```
script-src 'self' 'unsafe-inline' https:
```

Direktif `https:` mengizinkan **skrip dari origin HTTPS mana pun** dieksekusi. Jika terjadi injeksi konten (mis. melalui nama pendaftar yang dirender, alasan izin, atau *stored* input admin), penyerang dapat memuat `https://attacker.tld/x.js` dan CSP **tidak akan** memblokirnya — menghilangkan sebagian besar manfaat CSP. `frame-ancestors 'none'` + `X-Frame-Options: DENY` sudah benar (anti-clickjacking), begitu pula `HSTS` dengan `preload` (`:31`).

**Rekomendasi tambalan:** hilangkan `https:` dari `script-src` (semua aset dihasilkan sendiri oleh Next.js), pertahankan `'self'` dan `'unsafe-inline'` seperlunya atau migrasi ke nonce/hash agar `unsafe-inline` bisa dibuang; tambahkan `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`.

### AUD-28 — Endpoint reset password default bersama (backdoor operasional) — **KRITIS**

**Lokasi:** `app/api/admin/setup/route.ts:6,15-42` dan `app/api/admin/fix-credentials/route.ts:10-13,21-57`

```ts
const CREDENTIALS = [
  { email: "admin@lemigas.example", ... },
  { email: "mentor.lab@lemigas.example", ... },
];
const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
...
await prisma.user.update({ data: { passwordHash, role, isAktif: true, ... } });
```

**Analisis risiko:**
1. Kedua endpoint diproteksi hanya sesi ADMIN, tetapi **efeknya adalah pengaturan ulang kata sandi** akun admin & mentor ke satu nilai bersama `DEFAULT_ADMIN_PASSWORD` — kapan pun, tanpa konfirmasi ulang, tanpa audit trail.
2. Email akun bersifat **tetap dan dapat ditebak** (`admin@lemigas.example`, `mentor.lab@lemigas.example`) dan menjadi target pasti untuk AUD-20.
3. `fix-credentials` menimpa `nama`, `role`, dan `isAktif: true` untuk daftar tersebut — secara efektif dapat *mengaktifkan kembali* akun yang sudah dinonaktifkan (membalikkan kontrol `isAktif`), dan menetapkan ulang role.
4. bcrypt cost 10 dengan kata sandi default yang kemungkinan pendek → bila nilai default bocor/tertebak, brute-force tidak lagi diperlukan.
5. Tidak ada pembatasan bahwa endpoint ini hanya boleh dijalankan sekali saat *bootstrap* (mis. diblokir saat sudah ada admin lain aktif).

Dalam penilaian risiko, ini dianggap **KRITIS** karena mengubah kontrol autentikasi menjadi *revert-to-default* yang dapat dipicu dari dalam aplikasi, dan bersinergi langsung dengan tidak adanya rate limit login (AUD-20).

**Rekomendasi tambalan:**
1. **Hapus** kedua route setelah digunakan untuk *bootstrap* awal (atau pindahkan ke skrip CLI lokal yang dijalankan lewat terminal, bukan endpoint HTTP).
2. Jika harus dipertahankan: tambahkan *shared secret* header (`SETUP_TOKEN`) yang dibandingkan dengan `timingSafeEqual`, blokir saat sudah ada ADMIN aktif lain, wajibkan konfirmasi ulang kata sandi admin saat ini, dan tulis baris audit (`who, when, from IP`).
3. Wajibkan kata sandi unik & panjang per akun (minimal 12 karakter), hapus konsep `DEFAULT_ADMIN_PASSWORD` bersama, dan paksa rotasi pertama kali.
4. Gunakan email domain internal yang sesuai (bila `lemigas.example` masih dipakai di produksi, ganti).

### AUD-29 — Perlindungan CSRF hanya memvalidasi keberadaan `Origin` — **RENDAH**

**Lokasi:** `middleware.ts:58-74`

Pemeriksaan menolak hanya bila `Origin` **ada dan** host-nya berbeda; request tanpa header `Origin` lolos. Banyak kasus pengiriman lintas-situs modern tetap menyertakan `Origin`, dan `SameSite=Lax` pada cookie sesi NextAuth menjadi mitigasi utama untuk request `POST` lintas-situs — tetapi keduanya bukan jaminan penuh (mis. browser lama, subdomain yang disusupi, atau endpoint yang menerima request non-browser dengan cookie yang disalahgunakan).

**Rekomendasi:** untuk penulisan ke `/api/*`, tolak bila `Sec-Fetch-Site` bernilai `cross-site`, wajibkan `Origin` atau `Referer` yang cocok (bukan hanya "jika ada"), dan pertahankan SameSite=Lax/Strict. Token CSRF double-submit opsional untuk endpoint kritikal (`/api/verifikasi`, `/api/admin/*`).

### AUD-30 — Hygiene repo: log dev ter-commit — **INFO**

`dev-out.log` dan `dev-err.log` ter-*track* di git (diperiksa: isinya hanya log kompilasi Next, tidak memuat rahasia/kredensial/PII). Risikonya bersifat kebersihan — log berikutnya yang ditulis ulang (mis. berisi `DATABASE_URL` saat error Prisma, atau alamat peserta dari `console.log` debug) akan ikut ter-commit bila tidak dibersihkan.

**Rekomendasi:** tambahkan `*.log` ke `.gitignore` dan `git rm --cached` kedua berkas (jangan lakukan tanpa izin — di luar lingkup audit read-only ini).

### AUD-31 — `prisma/seed.ts` memuat `deleteMany()` — **INFO (patuh guardrail)**

`prisma/seed.ts:16` menjalankan `prisma.user.deleteMany()` (dan entitas lain). Guardrail melarang keras menjalankan `db seed`/`migrate reset` di lingkungan berdata nyata. Kondisi ini **tidak dieksekusi** dalam audit ini dan tidak diubah.

**Rekomendasi:** beri penanda eksplisit `if (process.env.NODE_ENV === "development" && process.env.ALLOW_SEED !== "true") throw` agar skrip tidak pernah bisa dijalankan terhadap kredensial produksi.

### AUD-32 — Konfigurasi NextAuth (`trustHost: true`, secret dari env) — **INFO**

`lib/auth.ts:21-23`: `trustHost: true` diperlukan di Vercel, tetapi berarti aplikasi mempercayai header `Host`/`X-Forwarded-Host` yang masuk. Pastikan `NEXTAUTH_SECRET` kuat (32+ byte acak) dan `NEXTAUTH_URL` diset eksplisit di produksi; pertimbangkan membatasi `redirect`/`callbackUrl` (client sudah membatasi ke path internal di `login-form.tsx:16-20` — sudah baik).

---

## 6. Matriks Risiko Lengkap

| ID | Temuan | Severity | Kerentanan | Dampak | Kemudahan eksploitasi | Area |
|---|---|---|---|---|---|---|
| AUD-20 | Tanpa rate limit/lockout login | **KRITIS** | AuthN | Kompromi panel ADMIN/MENTOR | Tinggi (otomatisasi) | Brute-force |
| AUD-28 | Reset password ke default bersama via API | **KRITIS** | AuthN/Kredensial | Kompromi akun admin berulang | Sedang (perlu sesi admin) | Otorisasi |
| AUD-22 | `lupa-kode` menurunkan Cek Status/LoA ke 1 faktor | **TINGGI** | IDOR/Info disc. | Kebocoran status + LoA resmi korban | Tinggi (3 request) | IDOR/Brute-force |
| AUD-20b | Rate limiter in-memory per-instance & cleanup mati | **TINGGI** | Kontrol lemah | Mem-bypass semua limit publik | Tinggi | Brute-force |
| AUD-01 | `/api/berkas/[filename]` tanpa cek kepemilikan | **TINGGI** | IDOR file | Kebocoran dokumen identitas | Sedang (perlu nama file) | IDOR |
| AUD-02 | Dokumen lintas-records untuk MENTOR | **SEDANG** | BOLA | Akses KTP/CV lintas unit | Tinggi (kredensial mentor) | IDOR |
| AUD-08 | Validasi hanya magic bytes, sajian `inline` | **SEDANG** | Input validation | Malware/polyglot tersimpan & dirender | Sedang | Unggahan |
| AUD-09 | Tanpa kuota penyimpanan berkas | **SEDANG** | Resourcing | Kebengkakan DB / DoS biaya | Tinggi | Unggahan |
| AUD-14 | Admin memuat 5 kolom PDF penuh per render | **SEDANG** | Info disc. (regresi) | Bocor KTP bila ada perubahan; OOM | Sedang | Eksposur Prisma |
| AUD-23 | `noPendaftaran` sekuensial | **SEDANG** | Enumerasi | Pemetaan seluruh pendaftar | Tinggi | Brute-force |
| AUD-24 | Limit publik 1-D per-IP | **SEDANG** | Kontrol lemah | Bypass + false positive | Tinggi | Brute-force |
| AUD-27 | CSP mengizinkan skrip `https:` asing | **SEDANG** | XSS containment | Eksekusi skrip penyerang bila ada celah | Sedang | Lintas-area |
| AUD-04 | `mentorId` tak divalidasi di `verifikasi` | RENDAH | Integrity | 500 / data mentor salah | Rendah (admin) | Otorisasi |
| AUD-05 | Tanpa deny-by-default di middleware | RENDAH* | Defense-in-depth | Regresi guard di masa depan | — | Otorisasi |
| AUD-06 | `isEmailTerdaftar` fail-open | RENDAH | Fail-open | Bypass guard saat gangguan DB | Rendah | Otorisasi |
| AUD-10 | Jalur legacy filesystem ganda | RENDAH | Attack surface | Bug/inkonsistensi | Rendah | Unggahan |
| AUD-11 | Tanpa audit trail akses dokumen | RENDAH | Kepatuhan | Deteksi insiden lambat | — | Unggahan |
| AUD-15 | `catatan` internal terkirim ke publik | RENDAH | Info disc. | Kebocoran komentar internal | Sedang | Eksposur Prisma |
| AUD-16 | *Data URL* ditanam di HTML | RENDAH | Perf/Info | Payload besar; link rusak | — | Eksposur Prisma |
| AUD-17 | `include` objek utuh di halaman mentor | INFO | Query shaping | Risiko regresi | — | Eksposur Prisma |
| AUD-18 | try/catch tidak seragam | RENDAH | Error handling | Kebocoran metadata | Rendah | Eksposur Prisma |
| AUD-26 | Email pendaftar tidak unik | RENDAH | Data integrity | Spam & ambigu | Sedang | Brute-force |
| AUD-29 | CSRF hanya cek `Origin` bila ada | RENDAH | CSRF | Serangan lintas-situs pada browser lama | Rendah | Lintas-area |
| AUD-12 | `public/dummy-loa.pdf` publik | INFO | Hygiene | Template LoA publik | — | Unggahan |
| AUD-30 | Log dev ter-commit | INFO | Hygiene | Risiko kebocoran log | — | Lintas-area |
| AUD-31 | `seed.ts` memuat `deleteMany` | INFO | Guardrail | Risiko human-error data | — | Lintas-area |
| AUD-32 | `trustHost: true` | INFO | Konfigurasi | Ketergantungan pada proxy tepercaya | — | Lintas-area |

---

## 7. Roadmap Tambalan (Prioritas, Tanpa Perubahan Dilakukan)

### P0 — Kerjakan segera
1. **AUD-20** — Rate limit + lockout + CAPTCHA pada `/api/auth/callback/credentials` (`middleware.ts:51` dan/atau *route wrapper*), kunci `ip` + `email`, catat `LoginAttempt`.
2. **AUD-28** — Hapus/pensiunkan `POST /api/admin/setup` dan `POST /api/admin/fix-credentials`; rotasi seluruh kata sandi default; kata sandi unik per akun + panjang.
3. **AUD-22** — Hentikan pengembalian `noPendaftaran` dari `/api/cek-status/lupa-kode`; ganti alur kode sekali-kirim ke email/WhatsApp; samakan respons 404 → generik.
4. **AUD-01** — Hapus route `app/api/berkas/[filename]/route.ts`, atau tambahkan wajib ADMIN + verifikasi kepemilikan via DB.

### P1 — Sprint berikutnya
5. **AUD-20b** — Implementasi `RateLimiter` berbasis Redis/Upstash; aktifkan `cleanup()`; perbaikan pembacaan IP tepercaya.
6. **AUD-02** — Scoping mentor/unit pada `/api/berkas/dokumen` & `/api/berkas/cv`; batasi berkas identitas hanya ADMIN.
7. **AUD-14** — Ganti pemilihan kolom `*Url` dengan query keberadaan boolean (pola `admin/peserta/page.tsx:56-64`).
8. **AUD-23** — `noPendaftaran` acak untuk konsumen publik; pindahkan pemeriksaan "sudah punya pendaftaran aktif" ke `POST /api/registrasi` (AUD-26).
9. **AUD-08/09** — Validasi struktural PDF, kuota penyimpanan, penyimpanan ke object storage.
10. **AUD-27** — Perketat CSP (`script-src 'self'`, tambah `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`).

### P2 — Perbaikan berkelanjutan
11. **AUD-05** — *Deny-by-default* middleware untuk `/api/*` dan panel.
12. **AUD-04/18** — Validasi `mentorId`; pembungkus try/catch seragam (ikuti pola `peserta/kehadiran`).
13. **AUD-15/16** — Pisahkan `catatanPublik` vs `catatanInternal`; sediakan endpoint terotorisasi untuk lampiran izin alih-alih `href` data URL.
14. **AUD-11** — Log audit akses dokumen.
15. **AUD-06** — Ubah `isEmailTerdaftar` menjadi fail-closed.
16. **AUD-29** — Verifikasi `Sec-Fetch-Site` untuk request penulisan.
17. **AUD-30/31/32** — Hygiene repo, pengaman skrip seed, verifikasi konfigurasi NextAuth.

### Verifikasi setiap tambalan (wajib, sesuai guardrail)
- `npx tsc --noEmit` dan `npx eslint` tanpa error.
- Tidak ada `prisma migrate reset` / `db push --force` / `db seed` terhadap data produksi.
- `middleware.ts`, `lib/auth.ts`, `lib/rbac.ts` tidak melemahkan proteksi (setiap perubahan harus **menambah** lapisan).
- Tidak ada `passwordHash` yang ter-select ke jalur klien.
- Setelah perubahan, ulangi pemindaian statis pada 4 area ini untuk memastikan tidak ada regresi.

---

## 8. Metodologi & Penafian

1. **Sifat kerja:** murni pembacaan. Tidak ada berkas `.ts`, `.tsx`, `.prisma`, atau konfigurasi yang diubah/dihapus; tidak ada perintah database yang dijalankan; tidak ada data yang disentuh. Satu-satunya artefak hasil audit adalah berkas `audit.md` ini.
2. **Teknik:** pembacaan seluruh route di `app/api/**`, seluruh modul `lib/**`, `middleware.ts`, seluruh halaman `app/**` yang berinteraksi dengan Prisma, komponen klien yang memanggil API (`components/**`), skema `prisma/schema.prisma`, `package.json`, `next.config.ts`, `.gitignore`, serta pemindaian pola lintas-repo (`passwordHash`, `NEXT_PUBLIC_`, `dangerouslySetInnerHTML`, `prisma.*.find*`, `fetch("/api/...")`, `include:`/`select:`).
3. **Bukan termasuk:** pengujian dinamis/eksploitasi, pemindaian CVE dependensi terhadap registry, pengujian terhadap data/instance produksi, dan penilaian keamanan infrastruktur (Vercel, Supabase, DNS, SMTP, Fonnte) di luar kode aplikasi.
4. **Klasifikasi risiko** memakai skala KRITIS / TINGGI / SEDANG / RENDAH / INFO dengan pertimbangan gabungan *dampak × kemudahan eksploitasi*, dan telah memperhitungkan kontrol yang sudah ada (mis. entropi nama file menurunkan kemudahan AUD-01, tetapi tidak menghapus kelemahan desainnya).
