import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface ReportRow {
  noPendaftaran: string;
  nama: string;
  asalInstansi: string;
  unit: string;
  status: string;
  tanggalDaftar: string;
}

export async function buildExcelBuffer(rows: ReportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Rekap Pendaftaran");

  ws.columns = [
    { header: "No. Pendaftaran", key: "noPendaftaran", width: 22 },
    { header: "Nama", key: "nama", width: 30 },
    { header: "Asal Instansi", key: "asalInstansi", width: 32 },
    { header: "Unit", key: "unit", width: 30 },
    { header: "Status", key: "status", width: 14 },
    { header: "Tanggal Daftar", key: "tanggalDaftar", width: 16 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDBEAFE" },
  };

  rows.forEach((r) => ws.addRow(r));

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// Buat PDF sederhana (tabel) menggunakan pdf-lib. Data jumlah dibatasi agar
// halaman tetap wajar; ditangani lewat maxRows saat pemanggil.
export async function buildPdfBuffer(rows: ReportRow[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const rowH = 18;
  let y = page.getHeight() - margin;

  page.drawText("Rekapitulasi Pendaftaran Magang/PKL LEMIGAS", {
    x: margin, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  });
  y -= 24;
  page.drawText(`Total data: ${rows.length}`, { x: margin, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= rowH;

  const cols = [
    { key: "noPendaftaran" as const, w: 110, title: "No. Pendaftaran" },
    { key: "nama" as const, w: 120, title: "Nama" },
    { key: "asalInstansi" as const, w: 120, title: "Instansi" },
    { key: "unit" as const, w: 120, title: "Unit" },
    { key: "status" as const, w: 70, title: "Status" },
    { key: "tanggalDaftar" as const, w: 90, title: "Tgl. Daftar" },
  ];

  // header row
  let x = margin;
  for (const c of cols) {
    page.drawText(c.title, { x, y: y + 4, size: 8, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
    x += c.w;
  }
  y -= rowH;
  page.drawLine({
    start: { x: margin, y: y + 8 },
    end: { x: margin + cols.reduce((s, c) => s + c.w, 0), y: y + 8 },
    thickness: 0.6, color: rgb(0.6, 0.6, 0.6),
  });

  for (const r of rows) {
    if (y < 40) {
      // halaman baru bila penuh
      const p2 = doc.addPage([595.28, 841.89]);
      y = p2.getHeight() - margin;
      x = margin;
      for (const c of cols) {
        p2.drawText(c.title, { x, y: y + 4, size: 8, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
        x += c.w;
      }
      y -= rowH;
      p2.drawLine({
        start: { x: margin, y: y + 8 },
        end: { x: margin + cols.reduce((s, c) => s + c.w, 0), y: y + 8 },
        thickness: 0.6, color: rgb(0.6, 0.6, 0.6),
      });
    }
    let cx = margin;
    for (const c of cols) {
      const text = String(r[c.key] ?? "").slice(0, 18);
      page.drawText(text, { x: cx, y: y + 4, size: 7, font, color: rgb(0.2, 0.2, 0.2) });
      cx += c.w;
    }
    y -= rowH;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export const STATUS_TEXT: Record<string, string> = {
  MENUNGGU: "Menunggu",
  DITERIMA: "Diterima",
  DITOLAK: "Ditolak",
};