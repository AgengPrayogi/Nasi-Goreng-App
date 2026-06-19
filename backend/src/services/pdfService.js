const PDFDocument = require('pdfkit');

function formatRupiah(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function mapPaymentMethodLabel(method) {
  switch (method) {
    case 'cash':
      return 'Tunai';
    case 'transfer':
      return 'Transfer Bank';
    case 'qris_static':
      return 'QRIS (Static)';
    default:
      return method || '-';
  }
}

async function buildInvoicePdf({ order, payment }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const headerColor = '#1a1a1a';
    const accentColor = '#c0392b';
    const lightGray = '#f5f5f5';
    const borderGray = '#dddddd';

    // --- Header ---
    doc
      .fillColor(headerColor)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('NASI GORENG POLONIA', { align: 'center' })
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#555555')
      .text('Bukti Pembayaran / Faktur', { align: 'center' })
      .moveDown(1.2);

    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor(accentColor)
      .lineWidth(2)
      .stroke();

    doc.moveDown(0.8);

    // --- Order info box ---
    const boxY = doc.y;
    doc
      .rect(50, boxY, 495, 78)
      .fill(lightGray)
      .stroke(borderGray);

    doc.y = boxY + 8;
    doc
      .fillColor(headerColor)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('INFORMASI PESANAN', 64, doc.y);

    doc.moveDown(0.4);
    doc.fillColor('#333333').font('Helvetica').fontSize(10);

    const row1 = `Kode Pesanan : ${order.orderCode || '-'}`;
    const row2 = `Tanggal      : ${formatDateTime(order.createdAt)}`;
    const row3 = `Pelanggan    : ${order.customerName || 'Walk-in'}`;
    const row4 = `Telepon      : ${order.customerPhone || '-'}`;
    const row5 = `Channel      : ${order.channel === 'online' ? 'Online' : 'Walk-in'}`;

    doc.text(row1, 64, doc.y).text(row2, 64, doc.y + 14).text(row3, 64, doc.y + 14);
    doc.text(row4, 64, doc.y + 14).text(row5, 64, doc.y + 14);

    doc.y = boxY + 90;

    // --- Items ---
    const items = Array.isArray(order.items) ? order.items : [];

    doc
      .fillColor(headerColor)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('DETAIL PESANAN', 50, doc.y);

    doc.moveDown(0.4);

    // table header
    const tableTop = doc.y + 4;
    doc
      .rect(50, tableTop, 495, 20)
      .fill(accentColor);

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('No', 58, tableTop + 5)
      .text('Item', 90, tableTop + 5)
      .text('Qty', 300, tableTop + 5)
      .text('Harga Satuan', 340, tableTop + 5)
      .text('Subtotal', 450, tableTop + 5);

    doc.y = tableTop + 22;

    items.forEach((item, idx) => {
      const label = item.menuName || item.menu?.name || 'Item';
      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || item.price || 0);
      const subtotal = Number(item.subtotal || qty * price);

      if (idx % 2 === 0) {
        doc.rect(50, doc.y, 495, 18).fill('#fafafa');
      }

      doc
        .fillColor('#333333')
        .font('Helvetica')
        .fontSize(9)
        .text(String(idx + 1), 58, doc.y + 4)
        .text(String(label).substring(0, 40), 90, doc.y + 4)
        .text(String(qty), 300, doc.y + 4)
        .text(formatRupiah(price), 340, doc.y + 4)
        .text(formatRupiah(subtotal), 450, doc.y + 4);

      doc.y += 18;
    });

    doc.y += 4;

    // --- Totals ---
    const subtotalVal = Number(order.subtotal || order.totalAmount || 0);
    const taxVal = Number(order.tax || 0);
    const discountVal = Number(order.discount || 0);
    const totalVal = Number(order.totalAmount || 0);

    const totalsStartY = doc.y;
    const boxX = 290;
    const boxW = 255;
    const boxH = 4 + 18 * 5;

    doc
      .rect(boxX, totalsStartY, boxW, boxH)
      .fill(lightGray)
      .stroke(borderGray);

    let ty = totalsStartY + 6;
    const tx = boxX + 12;

    const drawTotalLine = (label, value, bold = false) => {
      doc
        .fillColor('#333333')
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(10)
        .text(label, tx, ty)
        .text(value, boxX + boxW - 12, ty, { width: 110, align: 'right' });
      ty += 18;
    };

    drawTotalLine('Subtotal', formatRupiah(subtotalVal));
    drawTotalLine('Pajak', formatRupiah(taxVal));
    drawTotalLine('Diskon', formatRupiah(discountVal));
    drawTotalLine('Total', formatRupiah(totalVal), true);

    doc.y = totalsStartY + boxH + 8;

    // --- Payment info ---
    doc
      .fillColor(headerColor)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('PEMBAYARAN', 50, doc.y);

    doc.moveDown(0.4);
    doc.fillColor('#333333').font('Helvetica').fontSize(10);

    const paymentStatusLabel =
      payment?.status === 'paid'
        ? 'Lunas'
        : payment?.status || (order.paymentStatus === 'paid' ? 'Lunas' : 'Belum Bayar');

    const payMethod =
      payment?.method ||
      order.paymentMethod ||
      '-';

    const paidAtLabel =
      payment?.paidAt || order.paidAt
        ? formatDateTime(payment?.paidAt || order.paidAt)
        : '-';

    const refLabel =
      payment?.paymentReference ||
      order.paymentReference ||
      (payment?.externalPaymentId || '-');

    const payInfo = [
      `Status        : ${paymentStatusLabel}`,
      `Metode        : ${mapPaymentMethodLabel(payMethod)}`,
      `Dibayar pada  : ${paidAtLabel}`,
      `Referensi     : ${refLabel}`
    ];

    payInfo.forEach((line) => {
      const parts = line.split(':');
      doc.text(parts[0] + ':', 50, doc.y);
      doc.text((parts[1] || '').trim(), 150, doc.y);
      doc.y += 16;
    });

    doc.y += 10;

    // --- Footer ---
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor(borderGray)
      .stroke();

    doc.moveDown(0.6);
    doc
      .fillColor('#777777')
      .font('Helvetica')
      .fontSize(9)
      .text(
        'Ini adalah bukti pembayaran elektronik yang sah. Terima kasih telah memesan di Nasi Goreng Polonia.',
        { align: 'center' }
      )
      .text(`Dicetak: ${formatDateTime(new Date())}`, { align: 'center' });

    doc.end();

    return new Promise((res, rej) => {
      doc.on('end', () => res());
      doc.on('error', rej);
    });
  });
}

module.exports = {
  formatRupiah,
  formatDateTime,
  buildInvoicePdf
};