import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

export interface RequisitionPdfData {
  id: string;
  rhuName: string;
  barangay: string;
  municipalityName: string;
  province: string;
  mhoName: string | null;
  approvedAt: Date;
  items: Array<{
    genericName: string;
    unit: string;
    currentStock: number;
    quantityRequested: number;
    projectedZeroDate: Date | null;
  }>;
}

function formatDate(date: Date): string {
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatDateShort(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2,'0')}, ${date.getFullYear()}`;
}

export function generateRequisitionPdf(data: RequisitionPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks: Buffer[] = [];
    const stream = new PassThrough();

    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    doc.pipe(stream);

    const pageWidth = doc.page.width - 100; // accounting for margins
    const left = 50;

    // ── Header ────────────────────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
      .text('REPUBLIC OF THE PHILIPPINES', left, 50, { align: 'center', width: pageWidth });
    doc.fontSize(10)
      .text(`Department of Health — ${data.municipalityName}, ${data.province}`, left, 65, { align: 'center', width: pageWidth });
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
      .text('MEDICINE REQUISITION FORM', left, 90, { align: 'center', width: pageWidth });

    doc.moveTo(left, 115).lineTo(left + pageWidth, 115).strokeColor('#CCCCCC').lineWidth(1).stroke();

    // ── Meta block ────────────────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica').fillColor('#000000');
    const metaTop = 128;
    const labelX = left;
    const valueX = left + 100;

    const metaRows = [
      ['Date:', formatDateShort(data.approvedAt)],
      ['RHU:', data.rhuName],
      ['Barangay:', data.barangay],
      ['Approved by:', data.mhoName ?? 'MHO'],
    ];

    metaRows.forEach(([label, value], i) => {
      const y = metaTop + i * 18;
      doc.font('Helvetica-Bold').text(label, labelX, y);
      doc.font('Helvetica').text(value, valueX, y);
    });

    // ── Section: Requested Medicines ─────────────────────────────────────────
    const tableTop = metaTop + metaRows.length * 18 + 20;

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
      .text('REQUESTED MEDICINES:', left, tableTop);

    const tY = tableTop + 18;
    const col = {
      medicine: { x: left,       w: 200 },
      stock:    { x: left + 205, w: 75  },
      qty:      { x: left + 285, w: 75  },
      unit:     { x: left + 365, w: 90  },
    };
    const rowH = 20;

    // Header row fill
    doc.rect(left, tY, pageWidth, rowH).fillColor('#F0F0F0').fill();
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
    doc.text('Medicine',       col.medicine.x + 4, tY + 6);
    doc.text('Current Stock',  col.stock.x + 4,    tY + 6);
    doc.text('Requested Qty',  col.qty.x + 4,      tY + 6);
    doc.text('Unit',           col.unit.x + 4,     tY + 6);

    // Header border
    doc.rect(left, tY, pageWidth, rowH).strokeColor('#AAAAAA').lineWidth(0.5).stroke();

    // Data rows
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    data.items.forEach((item, i) => {
      const rowY = tY + rowH + i * rowH;
      if (i % 2 === 1) {
        doc.rect(left, rowY, pageWidth, rowH).fillColor('#FAFAFA').fill();
      }
      doc.fillColor('#000000')
        .text(item.genericName,                  col.medicine.x + 4, rowY + 6, { width: col.medicine.w - 8, ellipsis: true })
        .text(String(item.currentStock),         col.stock.x + 4,    rowY + 6)
        .text(String(item.quantityRequested),    col.qty.x + 4,      rowY + 6)
        .text(item.unit,                         col.unit.x + 4,     rowY + 6);
      doc.rect(left, rowY, pageWidth, rowH).strokeColor('#DDDDDD').lineWidth(0.5).stroke();
    });

    const tableBottom = tY + rowH + data.items.length * rowH;

    // Outer table border
    doc.rect(left, tY, pageWidth, rowH + data.items.length * rowH)
      .strokeColor('#AAAAAA').lineWidth(0.5).stroke();

    // ── Projected Stockout Dates ──────────────────────────────────────────────
    const itemsWithDate = data.items.filter(i => i.projectedZeroDate);
    if (itemsWithDate.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000')
        .text('Projected stockout dates:', left, tableBottom + 16);
      itemsWithDate.forEach((item, i) => {
        doc.font('Helvetica').fontSize(9).fillColor('#CC3333')
          .text(
            `• ${item.genericName}: ${formatDate(item.projectedZeroDate!)}`,
            left + 10,
            tableBottom + 32 + i * 14,
          );
      });
    }

    const footerY = Math.max(
      tableBottom + 32 + itemsWithDate.length * 14 + 20,
      doc.page.height - 120,
    );

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.moveTo(left, footerY).lineTo(left + pageWidth, footerY)
      .strokeColor('#CCCCCC').lineWidth(0.5).stroke();

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.fontSize(8).font('Helvetica').fillColor('#888888')
      .text(
        'This requisition was auto-generated by Agap Medicine Stock Intelligence System.',
        left, footerY + 8, { align: 'center', width: pageWidth },
      )
      .text(
        `Approved: ${data.approvedAt.toISOString()}`,
        left, footerY + 20, { align: 'center', width: pageWidth },
      );

    doc.end();
  });
}
