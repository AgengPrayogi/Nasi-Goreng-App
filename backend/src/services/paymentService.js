const crypto = require('crypto');

const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { AppError, BusinessError, NotFoundError } = require('../errors/AppError');

function generateExternalPaymentId() {
  const rand = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `PAY-${rand}`;
}

async function createPayment({ orderId, method, amount, minutesToExpire = 1440 }) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order');
  }

  if (order.status === 'completed' || order.status === 'cancelled') {
    throw new BusinessError('Cannot create payment for completed or cancelled order', 'INVALID_ORDER_STATUS');
  }

  const existing = await Payment.findOne({ order: orderId });
  if (existing) {
    throw new BusinessError('Payment already exists for this order', 'PAYMENT_ALREADY_EXISTS');
  }

  if (amount == null || Number(amount) < 0) {
    throw new BusinessError('Amount must be a non-negative number', 'INVALID_AMOUNT');
  }

  if (method !== 'cash' && method !== 'transfer' && method !== 'qris_static') {
    throw new BusinessError('Invalid payment method', 'INVALID_PAYMENT_METHOD');
  }

  const externalPaymentId = generateExternalPaymentId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + minutesToExpire * 60 * 1000);

  const payment = new Payment({
    order: order._id,
    externalPaymentId,
    amount,
    method,
    status: 'pending',
    expiresAt
  });

  await payment.save();
  await payment.populate('order', 'orderCode totalAmount status customerName customerPhone items');

  return payment;
}

async function getPaymentById(paymentId) {
  const payment = await Payment.findById(paymentId).populate('order', 'orderCode totalAmount status');
  if (!payment) {
    throw new NotFoundError('Payment');
  }
  return payment;
}

async function getPaymentByOrderCode(orderCode) {
  const code = String(orderCode || '').trim().toUpperCase();
  if (!/^NGP-\d{8}-[A-F0-9]{6}$/.test(code)) {
    throw new BusinessError('Invalid order code format', 'INVALID_ORDER_CODE');
  }

  const order = await Order.findOne({ orderCode: code });
  if (!order) {
    throw new NotFoundError('Order');
  }

  const payment = await Payment.findOne({ order: order._id }).populate('order', 'orderCode totalAmount status');
  if (!payment) {
    throw new NotFoundError('Payment for this order');
  }

  return payment;
}

async function handleWebhookUpdate({ orderCode, paymentStatus, paymentMethod, externalPaymentId, paymentReference }) {
  const code = String(orderCode || '').trim().toUpperCase();
  if (!/^NGP-\d{8}-[A-F0-9]{6}$/.test(code)) {
    throw new BusinessError('Invalid order code format', 'INVALID_ORDER_CODE');
  }

  const order = await Order.findOne({ orderCode: code });
  if (!order) {
    throw new NotFoundError('Order');
  }

  const allowedStatuses = ['pending', 'paid', 'failed', 'expired', 'cancelled'];
  if (!allowedStatuses.includes(paymentStatus)) {
    throw new BusinessError('Invalid paymentStatus', 'INVALID_PAYMENT_STATUS');
  }

  const payment = await Payment.findOne({ order: order._id });
  if (!payment) {
    throw new NotFoundError('Payment for this order');
  }

  if (paymentMethod) {
    payment.method = paymentMethod;
  }
  payment.status = paymentStatus;

  if (externalPaymentId) {
    payment.externalPaymentId = externalPaymentId;
  }
  if (paymentReference) {
    payment.paymentReference = paymentReference;
  }

  if (paymentStatus === 'paid') {
    payment.paidAt = new Date();
    order.paymentStatus = 'paid';
    order.paymentMethod = payment.method;
    order.externalPaymentId = payment.externalPaymentId;
    order.paymentReference = payment.paymentReference;
    order.paidAt = payment.paidAt;
    await order.save();
  } else if (paymentStatus === 'failed' || paymentStatus === 'expired' || paymentStatus === 'cancelled') {
    order.paymentStatus = 'unpaid';
    order.paymentMethod = undefined;
    order.externalPaymentId = undefined;
    order.paymentReference = undefined;
    order.paidAt = undefined;
    await order.save();
  }

  await payment.save();
  await payment.populate('order', 'orderCode totalAmount status customerName customerPhone');

  return payment;
}

async function listPayments(filters = {}) {
  const query = {};

  if (filters.status && String(filters.status).trim()) {
    query.status = filters.status;
  }
  if (filters.method && String(filters.method).trim()) {
    query.method = filters.method;
  }
  if (filters.orderCode && String(filters.orderCode).trim()) {
    const code = String(filters.orderCode).trim().toUpperCase();
    const order = await Order.findOne({ orderCode: code }).select('_id');
    if (order) {
      query.order = order._id;
    } else {
      query.order = null;
    }
  }

  const page = Number(filters.page) >= 1 ? Number(filters.page) : 1;
  const limit = Number(filters.limit) >= 1 ? Number(filters.limit) : 20;
  const total = await Payment.countDocuments(query);
  const payments = await Payment.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('order', 'orderCode totalAmount status');

  return {
    payments,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
}

module.exports = {
  createPayment,
  getPaymentById,
  getPaymentByOrderCode,
  handleWebhookUpdate,
  listPayments
};