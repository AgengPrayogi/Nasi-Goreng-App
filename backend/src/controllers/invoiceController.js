const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { buildInvoicePdf } = require('../services/pdfService');
const { AppError, NotFoundError, BusinessError } = require('../errors/AppError');

async function getInvoiceByOrderCode(req, res, next) {
  try {
    const { orderCode } = req.params;
    const code = String(orderCode || '').trim().toUpperCase();

    const order = await Order.findOne({ orderCode: code }).populate('items.menu', 'name');
    if (!order) {
      throw new NotFoundError('Order');
    }

    const payment = await Payment.findOne({ order: order._id });

    const pdfBuffer = await buildInvoicePdf({ order, payment: payment || {} });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="faktur-${order.orderCode}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    return next(err);
  }
}

async function getInvoiceByOrderId(req, res, next) {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('items.menu', 'name');
    if (!order) {
      throw new NotFoundError('Order');
    }

    const payment = await Payment.findOne({ order: order._id });

    const pdfBuffer = await buildInvoicePdf({ order, payment: payment || {} });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="faktur-${order.orderCode}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    return next(err);
  }
}

async function getInvoiceHtmlByOrderCode(req, res, next) {
  try {
    const { orderCode } = req.params;
    const code = String(orderCode || '').trim().toUpperCase();

    const order = await Order.findOne({ orderCode: code });
    if (!order) {
      throw new NotFoundError('Order');
    }

    const payment = await Payment.findOne({ order: order._id });

    const pdfBuffer = await buildInvoicePdf({ order, payment: payment || {} });

    const base64 = pdfBuffer.toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64}`;

    return res.json({ success: true, data: { dataUrl, orderCode: order.orderCode } });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getInvoiceByOrderCode,
  getInvoiceByOrderId,
  getInvoiceHtmlByOrderCode
};