import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildExcelBuffer, STATUS_TEXT, type ReportRow } from "@/lib/report";
import { formatTanggal } from "@/lib/format";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const unitId = url.searchParams.get("unitId") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  const where = {
    ...(unitId ? { unitMinatId: unitId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          },
        }
      : {}),
  };

  const data = await prisma.pendaftar.findMany({
    where,
    include: { unitMinat: { select: { nama: true } } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const rows: ReportRow[] = data.map((p) => ({
    noPendaftaran: p.noPendaftaran,
    nama: p.nama,
    asalInstansi: p.asalInstansi,
    unit: p.unitMinat.nama,
    status: STATUS_TEXT[p.status] ?? p.status,
    tanggalDaftar: formatTanggal(p.createdAt),
  }));

  const buf = await buildExcelBuffer(rows);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rekap-pendaftaran-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Content-Length": String(buf.length),
    },
  });
}