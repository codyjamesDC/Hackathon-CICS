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
    const doc = new PDFDocument({ margin: 0, size: 'LETTER' });
    const chunks: Buffer[] = [];
    const stream = new PassThrough();

    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    doc.pipe(stream);

    const pageW  = doc.page.width;
    const pageH  = doc.page.height;
    const margin = 60;
    const contentW = pageW - margin * 2;

    // ── Letterhead ────────────────────────────────────────────────────────────
    doc.fontSize(9).font('Helvetica').fillColor('#000000')
      .text('Republic of the Philippines', margin, 50, { align: 'center', width: contentW })
      .text('Department of Health', margin, 63, { align: 'center', width: contentW })
      .text(`Office of the Municipal Health Officer — ${data.municipalityName}, ${data.province}`, margin, 76, { align: 'center', width: contentW });

    // Thick top rule
    doc.rect(margin, 98, contentW, 2).fill('#000000');

    // Document title
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
      .text('MEDICINE REQUISITION FORM', margin, 108, { align: 'center', width: contentW });

    // Thin rule below title
    doc.moveTo(margin, 128)
      .lineTo(margin + contentW, 128)
      .strokeColor('#000000').lineWidth(0.5).stroke();

    // Reference number right-aligned
    doc.fontSize(8).font('Helvetica').fillColor('#000000')
      .text(`Ref. No.: AGAP-${data.id.slice(0, 8).toUpperCase()}`, margin, 133, { align: 'right', width: contentW });

    // ── Meta block ────────────────────────────────────────────────────────────
    const metaTop = 152;
    const labelW  = 110;

    const metaRows: [string, string][] = [
      ['Date:',        formatDateShort(data.approvedAt)],
      ['RHU:',         data.rhuName],
      ['Barangay:',    `Barangay ${data.barangay}`],
      ['Municipality:', `${data.municipalityName}, ${data.province}`],
      ['Approved by:', data.mhoName ?? 'Municipal Health Officer'],
    ];

    metaRows.forEach(([label, value], i) => {
      const y = metaTop + i * 17;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
        .text(label, margin, y, { width: labelW, continued: false });
      doc.fontSize(9).font('Helvetica').fillColor('#000000')
        .text(value, margin + labelW, y);
    });

    // ── Divider ───────────────────────────────────────────────────────────────
    const dividerY = metaTop + metaRows.length * 17 + 12;
    doc.moveTo(margin, dividerY)
      .lineTo(margin + contentW, dividerY)
      .strokeColor('#000000').lineWidth(0.5).stroke();

    // ── Requested Medicines Table ─────────────────────────────────────────────
    const sectionY = dividerY + 14;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
      .text('REQUESTED MEDICINES', margin, sectionY);

    const tY   = sectionY + 16;
    const rowH = 20;

    const cols = {
      no:       { x: margin,           w: 28  },
      medicine: { x: margin + 30,      w: 198 },
      unit:     { x: margin + 232,     w: 65  },
      stock:    { x: margin + 300,     w: 75  },
      qty:      { x: margin + 378,     w: 82  },
    };

    // Header row — black background white text
    doc.rect(margin, tY, contentW, rowH).fill('#000000');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('#',              cols.no.x + 4,       tY + 6);
    doc.text('Generic Name',  cols.medicine.x + 4,  tY + 6);
    doc.text('Unit',          cols.unit.x + 4,      tY + 6);
    doc.text('Current Stock', cols.stock.x + 4,     tY + 6);
    doc.text('Qty Requested', cols.qty.x + 4,       tY + 6);

    // Data rows
    data.items.forEach((item, i) => {
      const rowY = tY + rowH + i * rowH;

      // Alternating very light gray
      if (i % 2 === 1) {
        doc.rect(margin, rowY, contentW, rowH).fill('#f5f5f5');
      } else {
        doc.rect(margin, rowY, contentW, rowH).fill('#ffffff');
      }

      doc.fontSize(8.5).font('Helvetica').fillColor('#000000')
        .text(String(i + 1),            cols.no.x + 4,       rowY + 6)
        .text(item.genericName,          cols.medicine.x + 4, rowY + 6, { width: cols.medicine.w - 8, ellipsis: true })
        .text(item.unit,                 cols.unit.x + 4,     rowY + 6)
        .text(String(item.currentStock), cols.stock.x + 4,    rowY + 6);

      // Requested qty — bold
      doc.font('Helvetica-Bold')
        .text(String(item.quantityRequested), cols.qty.x + 4, rowY + 6);

      // Row bottom border
      doc.moveTo(margin, rowY + rowH)
        .lineTo(margin + contentW, rowY + rowH)
        .strokeColor('#cccccc').lineWidth(0.3).stroke();
    });

    // Outer table border
    const tableH = rowH * (1 + data.items.length);
    doc.rect(margin, tY, contentW, tableH)
      .strokeColor('#000000').lineWidth(0.75).stroke();

    // Vertical column dividers
    [cols.medicine.x, cols.unit.x, cols.stock.x, cols.qty.x].forEach(x => {
      doc.moveTo(x - 2, tY)
        .lineTo(x - 2, tY + tableH)
        .strokeColor('#000000').lineWidth(0.3).stroke();
    });

    const tableBottom = tY + tableH;

    // ── Projected Stockout Dates ──────────────────────────────────────────────
    const itemsWithDate = data.items.filter(i => i.projectedZeroDate);
    let currentY = tableBottom + 18;

    if (itemsWithDate.length > 0) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
        .text('PROJECTED STOCKOUT DATES:', margin, currentY);

      itemsWithDate.forEach((item, i) => {
        doc.fontSize(8.5).font('Helvetica').fillColor('#000000')
          .text(
            `${String(i + 1).padStart(2, ' ')}.  ${item.genericName}  —  ${formatDate(item.projectedZeroDate!)}`,
            margin + 12,
            currentY + 14 + i * 13,
          );
      });

      currentY += 14 + itemsWithDate.length * 13 + 16;
    }

    // ── Certification block ───────────────────────────────────────────────────
    currentY += 10;

    doc.fontSize(8.5).font('Helvetica').fillColor('#000000')
      .text(
        'I hereby certify that the above medicines are urgently needed for the continued operation of the Rural Health Unit and that the quantities requested are accurate based on current stock levels and projected consumption rates.',
        margin,
        currentY,
        { width: contentW, align: 'justify' },
      );

    currentY += 46;

    // Signature lines — two columns
    const sigCol1 = margin;
    const sigCol2 = margin + contentW / 2 + 10;
    const sigW    = contentW / 2 - 20;
    const sigLineY = currentY + 36;

    // Left sig — MHO
    doc.moveTo(sigCol1, sigLineY)
      .lineTo(sigCol1 + sigW, sigLineY)
      .strokeColor('#000000').lineWidth(0.5).stroke();
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
      .text(data.mhoName ?? 'Municipal Health Officer', sigCol1, sigLineY + 5, { width: sigW, align: 'center' });
    doc.fontSize(8).font('Helvetica')
      .text('Municipal Health Officer', sigCol1, sigLineY + 17, { width: sigW, align: 'center' });
    doc.text(`Date: ${formatDateShort(data.approvedAt)}`, sigCol1, sigLineY + 29, { width: sigW, align: 'center' });

    // Right sig — blank for pharmacy
    doc.moveTo(sigCol2, sigLineY)
      .lineTo(sigCol2 + sigW, sigLineY)
      .strokeColor('#000000').lineWidth(0.5).stroke();
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
      .text('Received by:', sigCol2, sigLineY + 5, { width: sigW, align: 'center' });
    doc.fontSize(8).font('Helvetica')
      .text('Provincial Pharmacist / Authorized Representative', sigCol2, sigLineY + 17, { width: sigW, align: 'center' });
    doc.text('Date: ___________________', sigCol2, sigLineY + 29, { width: sigW, align: 'center' });

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = pageH - 36;

    doc.moveTo(margin, footerY)
      .lineTo(margin + contentW, footerY)
      .strokeColor('#000000').lineWidth(0.5).stroke();

    doc.fontSize(7).font('Helvetica').fillColor('#555555')
      .text(
        `Auto-generated by Agap Medicine Stock Intelligence System  ·  Generated: ${data.approvedAt.toISOString()}`,
        margin, footerY + 6,
        { align: 'center', width: contentW },
      );

    doc.end();
  });
}