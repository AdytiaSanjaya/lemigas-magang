import ExcelJS from "exceljs";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { formatTanggal } from "@/lib/format";

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

// ---------------------------------------------------------------------------
// Export PDF (pdf-lib, server-side) — kop resmi + tabel berborder & wrapping.
// Data jumlah dibatasi lewat maxRows saat pemanggil agar halaman tetap wajar.
// ---------------------------------------------------------------------------

const PDF_PAGE_W = 595.28; // A4 portrait (pt)
const PDF_PAGE_H = 841.89;
const PDF_MARGIN = 36;

const PDF_COLS: { key: keyof ReportRow; title: string; ratio: number; align?: "center" }[] = [
  { key: "noPendaftaran", title: "No. Pendaftaran", ratio: 0.14 },
  { key: "nama", title: "Nama", ratio: 0.19 },
  { key: "asalInstansi", title: "Instansi", ratio: 0.28 },
  { key: "unit", title: "Unit", ratio: 0.19 },
  { key: "status", title: "Status", ratio: 0.09, align: "center" },
  { key: "tanggalDaftar", title: "Tgl. Daftar", ratio: 0.11, align: "center" },
];

// Buang karakter di luar WinAnsi agar drawText pdf-lib tidak melempar error.
function sanitizePdfText(input: string): string {
  const winAnsiExtras = new Set([
    "\u2013", "\u2014", "\u2018", "\u2019", "\u201C", "\u201D",
    "\u2020", "\u2021", "\u2022", "\u2026", "\u2122",
  ]);
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    if ((code >= 32 && code < 256) || winAnsiExtras.has(ch)) out += ch;
  }
  return out;
}

// Bungkus teks ke beberapa baris sesuai lebar kolom; potong dengan "..." bila melebihi maxLines.
function wrapCellText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = sanitizePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let truncated = false;

  const flush = () => {
    if (current) {
      lines.push(current);
      current = "";
    }
  };

  for (const rawWord of words) {
    let word = rawWord;
    // Pecah kata yang lebih lebar dari kolom (tanpa spasi).
    while (font.widthOfTextAtSize(word, fontSize) > maxWidth && word.length > 1) {
      let cut = word.length - 1;
      for (let k = 1; k <= word.length; k++) {
        if (font.widthOfTextAtSize(word.slice(0, k), fontSize) > maxWidth) {
          cut = Math.max(1, k - 1);
          break;
        }
      }
      flush();
      if (lines.length >= maxLines) {
        truncated = true;
        word = "";
        break;
      }
      lines.push(word.slice(0, cut));
      word = word.slice(cut);
    }
    if (truncated) break;
    if (!word) continue;

    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      flush();
      if (lines.length >= maxLines) {
        truncated = true;
        break;
      }
      current = word;
    }
  }
  if (!truncated) flush();

  if (truncated && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && font.widthOfTextAtSize(`${last}...`, fontSize) > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last}...`;
  }

  return lines.slice(0, maxLines);
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PDF_PAGE_W - w) / 2, y, size, font, color });
}

export async function buildPdfBuffer(rows: ReportRow[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = PDF_MARGIN;
  const contentW = PDF_PAGE_W - margin * 2;

  // Lebar kolom proporsional (total = tepat selebar konten).
  const colWidths = PDF_COLS.map((c) => contentW * c.ratio);
  colWidths[colWidths.length - 1] += contentW - colWidths.reduce((s, w) => s + w, 0);

  const padX = 4;
  const padY = 4;
  const bodySize = 8;
  const headSize = 8;
  const lineHeight = 10;
  const maxBodyLines = 3;
  const minRowH = 16;
  const headRowH = 20;
  const borderColor = rgb(0.55, 0.55, 0.55);
  const headBg = rgb(0.9, 0.9, 0.92); // abu-abu muda untuk header tabel

  const drawKop = (page: PDFPage, yStart: number): number => {
    let y = yStart;
    drawCenteredText(page, "LAPORAN REKAPITULASI PENDAFTARAN MAGANG/PKL", y, 13, fontBold, rgb(0.08, 0.08, 0.08));
    y -= 18;
    drawCenteredText(page, "Balai Besar Pengujian Minyak dan Gas Bumi (LEMIGAS)", y, 11, fontBold, rgb(0.08, 0.08, 0.08));
    y -= 16;
    drawCenteredText(
      page,
      `Dicetak: ${formatTanggal(new Date())}  |  Total data: ${rows.length}`,
      y, 9, font, rgb(0.4, 0.4, 0.4)
    );
    y -= 10;
    page.drawLine({
      start: { x: margin, y },
      end: { x: PDF_PAGE_W - margin, y },
      thickness: 1,
      color: rgb(0.25, 0.25, 0.25),
    });
    return y - 16;
  };

  const drawTableHeader = (page: PDFPage, yTop: number): number => {
    const yBottom = yTop - headRowH;
    page.drawRectangle({
      x: margin,
      y: yBottom,
      width: contentW,
      height: headRowH,
      color: headBg,
      borderColor,
      borderWidth: 0.6,
    });
    let x = margin;
    PDF_COLS.forEach((c, i) => {
      const lines = wrapCellText(c.title, fontBold, headSize, colWidths[i] - padX * 2, 2);
      lines.forEach((ln, li) => {
        const tw = fontBold.widthOfTextAtSize(ln, headSize);
        const tx = c.align === "center"
          ? x + Math.max(padX, (colWidths[i] - tw) / 2)
          : x + padX;
        page.drawText(ln, {
          x: tx,
          y: yTop - padY - headSize * 0.8 - li * lineHeight,
          size: headSize,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });
      });
      x += colWidths[i];
      if (i < PDF_COLS.length - 1) {
        page.drawLine({ start: { x, y: yTop }, end: { x, y: yBottom }, thickness: 0.6, color: borderColor });
      }
    });
    return yBottom;
  };

  const drawRow = (page: PDFPage, yTop: number, h: number, cells: string[][]): number => {
    const yBottom = yTop - h;
    page.drawRectangle({
      x: margin,
      y: yBottom,
      width: contentW,
      height: h,
      borderColor,
      borderWidth: 0.6,
    });
    let x = margin;
    cells.forEach((lines, i) => {
      lines.forEach((ln, li) => {
        const tw = font.widthOfTextAtSize(ln, bodySize);
        const tx = PDF_COLS[i].align === "center"
          ? x + Math.max(padX, (colWidths[i] - tw) / 2)
          : x + padX;
        page.drawText(ln, {
          x: tx,
          y: yTop - padY - bodySize * 0.8 - li * lineHeight,
          size: bodySize,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
      });
      x += colWidths[i];
      if (i < cells.length - 1) {
        page.drawLine({ start: { x, y: yTop }, end: { x, y: yBottom }, thickness: 0.6, color: borderColor });
      }
    });
    return yBottom;
  };

  const bottomLimit = margin;
  let page = doc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
  let y = drawKop(page, PDF_PAGE_H - margin);
  y = drawTableHeader(page, y);

  if (rows.length === 0) {
    const yBottom = y - minRowH;
    page.drawRectangle({
      x: margin, y: yBottom, width: contentW, height: minRowH,
      borderColor, borderWidth: 0.6,
    });
    const msg = "Tidak ada data untuk ditampilkan.";
    const mw = font.widthOfTextAtSize(msg, bodySize);
    page.drawText(msg, {
      x: margin + (contentW - mw) / 2,
      y: y - padY - bodySize * 0.8,
      size: bodySize, font, color: rgb(0.45, 0.45, 0.45),
    });
  }

  for (const r of rows) {
    const cells = PDF_COLS.map((c, i) =>
      wrapCellText(String(r[c.key] ?? ""), font, bodySize, colWidths[i] - padX * 2, maxBodyLines)
    );
    const rowH = Math.max(minRowH, Math.max(1, ...cells.map((l) => l.length)) * lineHeight + padY * 2);

    if (y - rowH < bottomLimit) {
      // Halaman baru: judul lanjutan + header tabel diulang.
      page = doc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
      y = PDF_PAGE_H - margin;
      drawCenteredText(
        page,
        "LAPORAN REKAPITULASI PENDAFTARAN MAGANG/PKL (lanjutan)",
        y, 10, fontBold, rgb(0.2, 0.2, 0.2)
      );
      y -= 18;
      y = drawTableHeader(page, y);
    }

    y = drawRow(page, y, rowH, cells);
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export const STATUS_TEXT: Record<string, string> = {
  MENUNGGU: "Menunggu",
  DITERIMA: "Diterima",
  DITOLAK: "Ditolak",
};