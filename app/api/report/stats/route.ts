import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// Data untuk grafik dashboard: pendaftar per bulan (6 bulan terakhir),
// per unit, dan per status.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const unitId = url.searchParams.get("unitId") ?? "";

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // 1) Per status (groupBy Prisma — tanpa SQL mentah).
  const statusGroup = await prisma.pendaftar.groupBy({
    by: ["status"],
    _count: { _all: true },
    // where unit jika difilter
    ...(unitId ? { where: { unitMinatId: unitId } } : {}),
  });

  // 2) Per unit.
  const unitCounts = await prisma.pendaftar.groupBy({
    by: ["unitMinatId"],
    _count: { _all: true },
    ...(unitId ? { where: { unitMinatId: unitId } } : {}),
  });
  const unitNames = await prisma.unit.findMany({ select: { id: true, nama: true } });
  const perUnit = unitCounts
    .map((u) => ({
      unit: unitNames.find((n) => n.id === u.unitMinatId)?.nama ?? "-",
      jumlah: u._count._all,
    }))
    .sort((a, b) => b.jumlah - a.jumlah);

  // 3) Per bulan (6 bulan terakhir). Ambil hanya createdAt+status dalam rentang
  // lalu diagregasi di memori (bounded window, cukup ringan).
  const recent = await prisma.pendaftar.findMany({
    where: {
      createdAt: { gte: sixMonthsAgo },
      ...(unitId ? { unitMinatId: unitId } : {}),
    },
    select: { createdAt: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const monthBuckets: Record<
    string,
    { MENUNGGU: number; DITERIMA: number; DITOLAK: number; PESERTA_AKTIF: number }
  > = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthBuckets[key] = { MENUNGGU: 0, DITERIMA: 0, DITOLAK: 0, PESERTA_AKTIF: 0 };
  }
  for (const r of recent) {
    const key = `${r.createdAt.getFullYear()}-${r.createdAt.getMonth()}`;
    if (monthBuckets[key]) monthBuckets[key][r.status] += 1;
  }

  const perBulan = Object.keys(monthBuckets).map((key) => {
    const [y, m] = key.split("-").map(Number);
    const b = monthBuckets[key];
    return {
      bulan: `${BULAN[m]}-${String(y).slice(2)}`,
      menunggu: b.MENUNGGU,
      diterima: b.DITERIMA,
      ditolak: b.DITOLAK,
      pesertaAktif: b.PESERTA_AKTIF,
    };
  });

  const perStatus = ["MENUNGGU", "DITERIMA", "DITOLAK", "PESERTA_AKTIF"].map((s) => ({
    status: s,
    jumlah: statusGroup.find((g) => g.status === s)?._count._all ?? 0,
  }));

  return NextResponse.json({ perBulan, perUnit, perStatus });
}