import { NextRequest, NextResponse } from "next/server";
import type { StatusPendaftar } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// Rekap satu entri: dipakai untuk total keseluruhan (persis seperti kartu
// ringkasan) dan untuk bucket per bulan — sehingga total tiap seri grafik
// dijamin sama dengan angka kartu ketika dijumlahkan lintas bulan.
type Rekap = { menunggu: number; diterima: number; ditolak: number; pesertaAktif: number };

const rekapKosong = (): Rekap => ({ menunggu: 0, diterima: 0, ditolak: 0, pesertaAktif: 0 });

const kunciBulan = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

// Status MUTLAK pendaftar dihitung apa adanya — TIDAK pernah dikurangi dengan
// metrik "Peserta Aktif". Seorang peserta aktif tetap berstatus DITERIMA
// (kartu "Diterima" juga menghitungnya), jadi tidak ada penghitungan ganda dan
// tidak ada status yang "dipindah" antar seri.
function tambahStatus(rekap: Rekap, status: StatusPendaftar) {
  if (status === "MENUNGGU") rekap.menunggu += 1;
  else if (status === "DITERIMA") rekap.diterima += 1;
  else if (status === "DITOLAK") rekap.ditolak += 1;
  // PESERTA_AKTIF (nilai legacy) tidak dihitung ulang sebagai DITERIMA — kartu
  // ringkasan juga tidak; pemiliknya tetap muncul di seri "Peserta Aktif".
}

// Data grafik dashboard: pendaftar per bulan (berdasarkan bulan pendaftaran
// createdAt dengan status TERKINI), per unit, dan per status. Semua seri
// diturunkan dari SATU kumpulan baris pendaftar yang sama agar konsisten
// dengan kartu ringkasan di app/admin/dashboard/page.tsx.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const unitId = new URL(req.url).searchParams.get("unitId") ?? "";

  // Satu query untuk semua agregasi. Select dipilih (shaped): hanya kolom
  // ringan — kolom berkas Base64 tidak pernah ikut dimuat (guardrail AUD-14).
  // Relasi `peserta` hanya diambil id-nya: keberadaan baris 1:1 dengan
  // pendaftar = penanda "Peserta Aktif" (sama dengan prisma.peserta.count()).
  const [pendaftar, units] = await Promise.all([
    prisma.pendaftar.findMany({
      where: unitId ? { unitMinatId: unitId } : {},
      select: {
        createdAt: true,
        status: true,
        unitMinatId: true,
        peserta: { select: { id: true } },
      },
    }),
    prisma.unit.findMany({ select: { id: true, nama: true } }),
  ]);

  const now = new Date();
  // Rentang grafik default: 6 bulan terakhir. Jika ada pendaftaran lebih lama,
  // rentang diperpanjang sampai bulan pendaftaran pertama sehingga total seri
  // = kartu ringkasan (yang menghitung seluruh data).
  let bulanAwal = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  let bulanAkhir = new Date(now.getFullYear(), now.getMonth(), 1);

  const total = rekapKosong();
  const perUnitMap = new Map<string, number>();

  for (const p of pendaftar) {
    tambahStatus(total, p.status);
    if (p.peserta) total.pesertaAktif += 1;
    perUnitMap.set(p.unitMinatId, (perUnitMap.get(p.unitMinatId) ?? 0) + 1);

    const bulanDaftar = new Date(p.createdAt.getFullYear(), p.createdAt.getMonth(), 1);
    if (bulanDaftar < bulanAwal) bulanAwal = bulanDaftar;
    if (bulanDaftar > bulanAkhir) bulanAkhir = bulanDaftar;
  }

  // --- Per unit: ringkasan dari baris yang sama (jumlahnya = total pendaftar).
  const perUnit = [...perUnitMap.entries()]
    .map(([id, jumlah]) => ({ unit: units.find((u) => u.id === id)?.nama ?? "-", jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah || a.unit.localeCompare(b.unit));

  // --- Per bulan: siapkan bucket kontinu dari bulan pendaftaran pertama
  // s.d. bulan berjalan (bulan tanpa pendaftar tetap muncul dengan nilai 0).
  const bucketPerBulan = new Map<string, Rekap>();
  const daftarBulan: Array<{ key: string; label: string }> = [];
  for (let b = new Date(bulanAwal); b <= bulanAkhir; b = new Date(b.getFullYear(), b.getMonth() + 1, 1)) {
    const key = kunciBulan(b);
    bucketPerBulan.set(key, rekapKosong());
    daftarBulan.push({ key, label: `${BULAN[b.getMonth()]}-${String(b.getFullYear()).slice(2)}` });
  }

  // Kelompokkan per bulan pendaftaran (createdAt) lalu hitung status terkini
  // pendaftar di bulan tersebut — termasuk penanda "Peserta Aktif"-nya.
  for (const p of pendaftar) {
    const bucket = bucketPerBulan.get(kunciBulan(p.createdAt));
    if (!bucket) continue;
    tambahStatus(bucket, p.status);
    if (p.peserta) bucket.pesertaAktif += 1;
  }

  const perBulan = daftarBulan.map(({ key, label }) => {
    const r = bucketPerBulan.get(key)!;
    return {
      bulan: label,
      menunggu: r.menunggu,
      diterima: r.diterima,
      ditolak: r.ditolak,
      pesertaAktif: r.pesertaAktif,
    };
  });

  // --- Per status: identik dengan kartu ringkasan (tanpa pengurangan ganda).
  // Catatan: "Peserta Aktif" adalah metrik turunan yang memang tumpang tindih
  // dengan "Diterima" (subset), sama seperti kartu — bukan hasil pengurangan.
  const perStatus = [
    { status: "MENUNGGU", jumlah: total.menunggu },
    { status: "DITERIMA", jumlah: total.diterima },
    { status: "DITOLAK", jumlah: total.ditolak },
    { status: "PESERTA_AKTIF", jumlah: total.pesertaAktif },
  ];

  return NextResponse.json({ perBulan, perUnit, perStatus });
}
