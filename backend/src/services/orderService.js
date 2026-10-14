const crypto = require('crypto');
const mongoose = require('mongoose');

const Menu = require('../models/Menu');
const Order = require('../models/Order');
const QueueSequence = require('../models/QueueSequence');
const Campaign = require('../models/Campaign');
const Table = require('../models/Table');
const Ingredient = require('../models/Ingredient');
const StockMovement = require('../models/StockMovement');
const { attachOrderToCustomer, recordCompletedOrder } = require('./customerService');
const { AppError, BusinessError, NotFoundError } = require('../errors/AppError');
const { getQueueBusinessDate, getEtaMinutes } = require('../config/orderFlow');
const { calculateDiscount, recordPromoCodeUsage } = require('./promotionService');
const { assertWalkInTableAvailable } = require('./reservationService');
const { createTransactionIfMissing } = require('./financeService');
const { recordCustomerConsent } = require('./whatsappConsentService');
const { enqueueWhatsAppEvent } = require('./whatsappEventService');

function buildOrderCode() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `NGP-${ymd}-${rand}`;
}

function totalItemQuantity(order) {
  if (!order.items || !order.items.length) return 0;
  return order.items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
}

async function allocateQueueNumber(queueDate) {
  // Seed from existing orders on first use so this remains safe during rollout.
  const current = await QueueSequence.findOneAndUpdate(
    { queueDate },
    { $inc: { value: 1 } },
    { new: true }
  );
  if (current) return current.value;

  const existing = await Order.findOne({ queueDate }).sort({ queueNumber: -1 }).select('queueNumber').lean();
  const initialValue = Number(existing?.queueNumber || 0) + 1;
  try {
    const seeded = await QueueSequence.create({ queueDate, value: initialValue });
    return seeded.value;
  } catch (error) {
    if (error.code !== 11000) throw error;
    // A concurrent first confirmer won the insert. Increment its sequence.
    const incremented = await QueueSequence.findOneAndUpdate(
      { queueDate },
      { $inc: { value: 1 } },
      { new: true }
    );
    return incremented.value;
  }
}

/**
 * Create a new order (walk-in or online).
 */
async function createOrder(data) {
  const {
    items = [],
    notes = '',
    channel = 'dine_in',
    customerName = '',
    customerPhone = '',
    promoCodeUsed = '',
    campaignId = '',
    fulfillmentType = 'takeaway',
    tableId = '',
    deliveryAddress = '',
    deliveryNotes = '',
    whatsappConsent = {}
  } = data;

  const name = String(customerName || '').trim();
  const phone = String(customerPhone || '').trim();
  if (!name) {
    throw new BusinessError('Customer name is required', 'CUSTOMER_NAME_REQUIRED');
  }
  if (!phone && (whatsappConsent.utility === true || whatsappConsent.marketing === true)) {
    throw new BusinessError('A phone number is required for WhatsApp consent', 'PHONE_REQUIRED_FOR_WHATSAPP_CONSENT');
  }
  if (fulfillmentType === 'delivery' && !String(deliveryAddress || '').trim()) {
    throw new BusinessError('Delivery address is required', 'DELIVERY_ADDRESS_REQUIRED');
  }

  let table;

  const orderItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const { menuId, quantity } = item;

    const menu = await Menu.findById(menuId);
    if (!menu) {
      throw new NotFoundError(`Menu with id ${menuId}`);
    }

    if (!menu.isAvailable) {
      throw new BusinessError(`Menu "${menu.name}" is not available`, 'MENU_UNAVAILABLE');
    }

    const priceAtOrder = menu.price;
    const itemTotal = priceAtOrder * quantity;
    totalAmount += itemTotal;

    orderItems.push({
      menu: menuId,
      quantity,
      priceAtOrder
    });
  }

  const discount = promoCodeUsed
    ? await calculateDiscount(promoCodeUsed, totalAmount, orderItems)
    : { discountAmount: 0, discountPercentage: 0, finalAmount: totalAmount };

  if (fulfillmentType === 'dine_in') {
    if (!tableId) throw new BusinessError('Table is required for dine-in orders', 'TABLE_REQUIRED');
    await assertWalkInTableAvailable(tableId);
    table = await Table.findOneAndUpdate(
      { _id: tableId, isActive: true, status: 'available' },
      { status: 'occupied' },
      { new: true }
    );
    if (!table) throw new BusinessError('Selected table is unavailable', 'TABLE_UNAVAILABLE');
  }

  const maxAttempts = 8;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const orderCode = buildOrderCode();
    const order = new Order({
      orderCode,
      channel,
      fulfillmentType,
      tableId: table?._id,
      tableNumber: table?.number || '',
      deliveryAddress: String(deliveryAddress || '').trim(),
      deliveryNotes: String(deliveryNotes || '').trim(),
      customerName: String(customerName || '').trim(),
      customerPhone: String(customerPhone || '').trim(),
      items: orderItems,
      totalAmount,
      status: 'pending',
      notes: typeof notes === 'string' ? notes : '',
      kitchenStatus: 'none',
      paymentStatus: 'unpaid',
      promoCodeUsed: typeof promoCodeUsed === 'string' ? promoCodeUsed.trim() : '',
      campaignId: campaignId || undefined,
      discountAmount: discount.discountAmount,
      discountPercentage: Number(discount.discountPercentage),
      amountAfterDiscount: discount.finalAmount,
      queueNumber: 0,
      queueDate: ''
    });

    try {
      await order.save();
      if (phone) {
        const customer = await attachOrderToCustomer({ phone, name, orderId: order._id });
        order.customerId = customer._id;
        order.promoAudienceSegment = customer.audienceSegment;
        if (whatsappConsent.utility === true || whatsappConsent.marketing === true) {
          await recordCustomerConsent({
            customerId: customer._id,
            consent: whatsappConsent,
            source: 'order_checkout',
            textVersion: process.env.WHATSAPP_CONSENT_TEXT_VERSION || 'wa-consent-v1'
          });
        }
      }
      if (table) {
        table.activeOrderId = order._id;
        await table.save();
      }
      await order.save();
      return order;
    } catch (err) {
      if (err.code === 11000 && err.keyPattern && err.keyPattern.orderCode) {
        continue;
      }
      throw err;
    }
  }

  throw new AppError('Could not allocate a unique order code', 500, 'ORDER_CODE_COLLISION');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listOrders(filters = {}) {
  const query = {};
  if (filters.status && String(filters.status).trim()) {
    query.status = filters.status;
  }
  if (filters.orderCode && String(filters.orderCode).trim()) {
    query.orderCode = String(filters.orderCode).trim().toUpperCase();
  }
  if (filters.channel && String(filters.channel).trim()) {
    query.channel = filters.channel;
  }
  if (filters.kitchenStatus && String(filters.kitchenStatus).trim()) {
    query.kitchenStatus = filters.kitchenStatus;
  }
  if (filters.paymentStatus && String(filters.paymentStatus).trim()) {
    query.paymentStatus = filters.paymentStatus;
  }
  if (filters.queueDate && String(filters.queueDate).trim()) {
    query.queueDate = String(filters.queueDate).trim();
  }
  if (filters.search && String(filters.search).trim()) {
    const regex = new RegExp(escapeRegex(String(filters.search).trim()), 'i');
    query.$or = [
      { orderCode: { $regex: regex } },
      { customerName: { $regex: regex } },
      { customerPhone: { $regex: regex } }
    ];
  }

  const page = Number(filters.page) >= 1 ? Number(filters.page) : 1;
  const limit = Number(filters.limit) >= 1 ? Number(filters.limit) : 20;
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('items.menu', 'name price');

  return {
    orders,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
}

/**
 * Active kitchen board: confirmed orders not yet handed off (kitchen line).
 */
async function listKitchenQueue(queueDate) {
  const date = queueDate && String(queueDate).trim() ? String(queueDate).trim() : getQueueBusinessDate();
  const now = Date.now();
  const orders = await Order.find({
    queueDate: date,
    status: 'confirmed',
    kitchenStatus: { $in: ['queued', 'preparing', 'ready'] }
  })
    .sort({ queueNumber: 1, createdAt: 1 })
    .populate('items.menu', 'name price')
    .lean();

  return orders.map((order) => {
    const timeToReady = order.estimatedReadyAt
      ? Math.max(0, Math.round((new Date(order.estimatedReadyAt).getTime() - now) / 60000))
      : null;
    return {
      ...order,
      timeToReady
    };
  });
}

async function getOrderById(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order');
  }
  return order;
}

const PUBLIC_ORDER_SELECT =
  'orderCode status totalAmount amountAfterDiscount discountAmount notes createdAt updatedAt items channel fulfillmentType customerName customerPhone queueDate queueNumber kitchenStatus estimatedReadyAt readyAt paymentStatus paymentMethod externalPaymentId paymentReference';

async function getOrderPublicByCode(orderCode) {
  const code = String(orderCode || '').trim().toUpperCase();
  if (!/^NGP-\d{8}-[A-F0-9]{6}$/.test(code)) {
    throw new BusinessError('Invalid order code format', 'INVALID_ORDER_CODE');
  }

  const order = await Order.findOne({ orderCode: code })
    .populate('items.menu', 'name price')
    .select(PUBLIC_ORDER_SELECT);

  if (!order) {
    throw new NotFoundError('Order');
  }

  return order;
}

async function updateOrder(orderId, payload) {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order');

  const canEdit = order.status === 'pending' ||
    (order.status === 'confirmed' && order.kitchenStatus === 'queued');
  if (!canEdit) {
    throw new BusinessError('Order can only be edited before kitchen preparation starts', 'ORDER_NOT_EDITABLE');
  }

  const updates = {};
  if (Object.hasOwn(payload, 'items')) {
    if (order.paymentStatus === 'paid') {
      throw new BusinessError('Paid order items cannot be changed', 'PAID_ORDER_ITEMS_LOCKED');
    }

    const items = [];
    let totalAmount = 0;
    for (const item of payload.items) {
      const menu = await Menu.findById(item.menuId);
      if (!menu) throw new NotFoundError(`Menu with id ${item.menuId}`);
      if (!menu.isAvailable) {
        throw new BusinessError(`Menu "${menu.name}" is not available`, 'MENU_UNAVAILABLE');
      }
      items.push({ menu: menu._id, quantity: item.quantity, priceAtOrder: menu.price });
      totalAmount += menu.price * item.quantity;
    }

    const discount = order.promoCodeUsed
      ? await calculateDiscount(order.promoCodeUsed, totalAmount, items)
      : { discountAmount: 0, discountPercentage: 0, finalAmount: totalAmount };

    updates.items = items;
    updates.totalAmount = totalAmount;
    updates.discountAmount = discount.discountAmount;
    updates.discountPercentage = Number(discount.discountPercentage);
    updates.amountAfterDiscount = discount.finalAmount;

    if (order.status === 'confirmed' && order.kitchenStatus === 'queued') {
      const aheadCount = await Order.countDocuments({
        queueDate: order.queueDate,
        status: 'confirmed',
        kitchenStatus: { $in: ['queued', 'preparing'] },
        queueNumber: { $lt: order.queueNumber }
      });
      const estimatedMinutes = getEtaMinutes({
        totalItemQty: items.reduce((sum, item) => sum + item.quantity, 0),
        aheadCount
      });
      updates.estimatedReadyAt = new Date(Date.now() + estimatedMinutes * 60000);
    }
  }
  if (Object.hasOwn(payload, 'notes')) updates.notes = payload.notes;

  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: order.status,
      kitchenStatus: order.kitchenStatus,
      paymentStatus: order.paymentStatus
    },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updatedOrder) {
    throw new BusinessError('Order changed while being edited; reload and try again', 'ORDER_CHANGED');
  }
  return updatedOrder;
}

async function confirmOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order');
  }

  if (!order.items || order.items.length === 0) {
    throw new BusinessError('Cannot confirm empty order', 'EMPTY_ORDER');
  }

  if (order.status !== 'pending') {
    throw new BusinessError(
      `Order status must be "pending" to confirm. Current status: ${order.status}`,
      'INVALID_ORDER_STATUS'
    );
  }

  const queueDate = getQueueBusinessDate();
  const nextQueueNumber = await allocateQueueNumber(queueDate);

  const aheadCount = await Order.countDocuments({
    queueDate,
    status: 'confirmed',
    kitchenStatus: { $in: ['queued', 'preparing'] },
    queueNumber: { $gte: 1 }
  });

  const totalQty = totalItemQuantity(order);
  const minutes = getEtaMinutes({ totalItemQty: totalQty, aheadCount });
  const estimatedReadyAt = new Date(Date.now() + minutes * 60 * 1000);

  order.status = 'confirmed';
  order.queueDate = queueDate;
  order.queueNumber = nextQueueNumber;
  order.kitchenStatus = 'queued';
  order.estimatedReadyAt = estimatedReadyAt;
  order.readyAt = undefined;

  await order.save();
  await enqueueWhatsAppEvent({
    customerId: order.customerId,
    templateKey: 'order_confirmed',
    variables: { customer_name: order.customerName || 'Pelanggan', order_code: order.orderCode },
    source: 'order.confirmed',
    sourceId: String(order._id)
  });
  return order;
}

const KITCHEN_TRANSITIONS = {
  queued: 'preparing',
  preparing: 'ready'
};

async function updateKitchenStatus(orderId, nextStatus) {
  if (!Object.values(KITCHEN_TRANSITIONS).includes(nextStatus)) {
    throw new BusinessError('Invalid kitchen status', 'INVALID_KITCHEN_STATUS');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order');
  }

  if (order.status !== 'confirmed') {
    throw new BusinessError('Kitchen updates only apply to confirmed orders', 'INVALID_ORDER_STATUS');
  }

  if (KITCHEN_TRANSITIONS[order.kitchenStatus] !== nextStatus) {
    throw new BusinessError(
      `Kitchen status can only advance from ${order.kitchenStatus} to ${KITCHEN_TRANSITIONS[order.kitchenStatus] || 'completed'}`,
      'INVALID_KITCHEN_TRANSITION'
    );
  }

  const updates = { kitchenStatus: nextStatus };
  if (nextStatus === 'ready') {
    updates.readyAt = new Date();
  }

  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, status: 'confirmed', kitchenStatus: order.kitchenStatus },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!updatedOrder) {
    throw new BusinessError('Order status changed; reload the kitchen queue and try again', 'ORDER_CHANGED');
  }
  if (nextStatus === 'ready') {
    await enqueueWhatsAppEvent({
      customerId: updatedOrder.customerId,
      templateKey: 'order_ready',
      variables: { customer_name: updatedOrder.customerName || 'Pelanggan', order_code: updatedOrder.orderCode },
      source: 'order.ready',
      sourceId: String(updatedOrder._id)
    });
  }
  return updatedOrder;
}

async function updatePayment(orderId, payload) {
  const { paymentMethod, paymentStatus, externalPaymentId, paymentReference } = payload;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order');
  }

  if (order.status === 'completed' || order.status === 'cancelled') {
    throw new BusinessError('Cannot change payment on completed or cancelled orders', 'INVALID_ORDER_STATUS');
  }

  if (paymentStatus === 'paid') {
    if (!paymentMethod) {
      throw new BusinessError('paymentMethod is required when marking paid', 'PAYMENT_METHOD_REQUIRED');
    }
    order.paymentMethod = paymentMethod;
    order.paymentStatus = 'paid';
    order.externalPaymentId = externalPaymentId || order.externalPaymentId;
    order.paymentReference = paymentReference || order.paymentReference;
    order.paidAt = new Date();
  } else if (paymentStatus === 'pending') {
    order.paymentStatus = 'pending';
    if (paymentMethod) {
      order.paymentMethod = paymentMethod;
    }
    if (externalPaymentId) {
      order.externalPaymentId = externalPaymentId;
    }
    if (paymentReference) {
      order.paymentReference = paymentReference;
    }
    order.paidAt = undefined;
  } else if (paymentStatus === 'refunded') {
    order.paymentStatus = 'refunded';
    if (paymentMethod) {
      order.paymentMethod = paymentMethod;
    }
    order.externalPaymentId = externalPaymentId || order.externalPaymentId;
    order.paymentReference = paymentReference || order.paymentReference;
    order.paidAt = undefined;
  } else if (paymentStatus === 'unpaid') {
    order.paymentStatus = 'unpaid';
    order.paymentMethod = undefined;
    order.paidAt = undefined;
  } else {
    throw new BusinessError('Invalid paymentStatus', 'INVALID_PAYMENT_STATUS');
  }

  await order.save();
  return order;
}

async function updatePaymentByOrderCode(orderCode, payload) {
  const code = String(orderCode || '').trim().toUpperCase();
  if (!/^NGP-\d{8}-[A-F0-9]{6}$/.test(code)) {
    throw new BusinessError('Invalid order code format', 'INVALID_ORDER_CODE');
  }

  const order = await Order.findOne({ orderCode: code });
  if (!order) {
    throw new NotFoundError('Order');
  }

  return updatePayment(order._id, payload);
}

function requirePaidBeforeComplete() {
  return process.env.REQUIRE_PAID_BEFORE_COMPLETE === 'true';
}

async function completeOrder(orderId) {
  const session = await mongoose.startSession();
  let feedbackToken;

  try {
    session.startTransaction();

    const order = await Order.findById(orderId).session(session);
    if (!order) throw new NotFoundError('Order');

    if (order.status === 'completed') {
      await createTransactionIfMissing({
        type: 'income',
        amount: Number(order.amountAfterDiscount || order.totalAmount || 0),
        description: `Order completed: ${order.orderCode}`,
        category: 'order_payment',
        reference: `ORDER-${order._id.toString()}`,
        date: order.updatedAt || new Date(),
        relatedOrder: order._id,
        createdBy: order.completedBy || undefined
      });
      await session.commitTransaction();
      return order;
    }

    if (order.status !== 'confirmed') {
      throw new BusinessError(
        'Order must be confirmed before it can be completed',
        'INVALID_ORDER_STATUS'
      );
    }

    if (order.kitchenStatus !== 'ready') {
      throw new BusinessError('Order must be ready before it can be completed', 'ORDER_NOT_READY');
    }

    if (requirePaidBeforeComplete() && order.paymentStatus !== 'paid') {
      throw new BusinessError(
        'Payment must be marked paid before completing (or set REQUIRE_PAID_BEFORE_COMPLETE=false)',
        'PAYMENT_REQUIRED'
      );
    }

    const movements = [];

    for (const item of order.items) {
      const menu = await Menu.findById(item.menu)
        .select('ingredients')
        .session(session);

      if (!menu) {
        throw new BusinessError(
          'Order contains a menu item that no longer exists',
          'MENU_NOT_FOUND'
        );
      }

      for (const req of menu.ingredients) {
        const perMenuQty = Number(req.quantity || 0);
        const orderQty = Number(item.quantity || 0);
        const deduction = perMenuQty * orderQty;

        if (!deduction) continue;
        if (deduction < 0) {
          throw new BusinessError('Invalid ingredient quantity on menu', 'INVALID_INGREDIENT_QTY');
        }

        const updatedIngredient = await Ingredient.findOneAndUpdate(
          { _id: req.ingredient, currentStock: { $gte: deduction } },
          { $inc: { currentStock: -deduction } },
          { new: true, session }
        );

        if (!updatedIngredient) {
          throw new BusinessError(
            'Insufficient stock to complete this order',
            'INSUFFICIENT_STOCK'
          );
        }

        movements.push({
          ingredient: req.ingredient,
          changeAmount: -deduction,
          reason: 'order',
          order: order._id
        });
      }
    }

    if (movements.length > 0) {
      await StockMovement.insertMany(movements, { session });
    }

    if (order.status === 'completed') {
      await createTransactionIfMissing({
        type: 'income',
        amount: Number(order.amountAfterDiscount || order.totalAmount || 0),
        description: `Order completed: ${order.orderCode}`,
        category: 'order_payment',
        reference: `ORDER-${order._id.toString()}`,
        date: order.updatedAt || new Date(),
        relatedOrder: order._id,
        createdBy: order.completedBy || undefined
      });
      await session.commitTransaction();
      return order;
    }

    order.status = 'completed';
    order.kitchenStatus = 'served';
    feedbackToken = crypto.randomBytes(32).toString('hex');
    order.feedbackTokenHash = crypto.createHash('sha256').update(feedbackToken).digest('hex');
    await order.save({ session });
    if (order.customerId) await recordCompletedOrder(order, session);
    if (order.promoCodeUsed) await recordPromoCodeUsage(order.promoCodeUsed);
    await createTransactionIfMissing({
      type: 'income',
      amount: Number(order.amountAfterDiscount || order.totalAmount || 0),
      description: `Order completed: ${order.orderCode}`,
      category: 'order_payment',
      reference: `ORDER-${order._id.toString()}`,
      date: new Date(),
      relatedOrder: order._id,
      createdBy: order.completedBy || undefined
    });
    if (order.tableId) {
      await Table.findOneAndUpdate(
        { _id: order.tableId, activeOrderId: order._id },
        { status: 'cleaning', $unset: { activeOrderId: 1 } },
        { session }
      );
    }
    if (order.campaignId) {
      await Campaign.findByIdAndUpdate(order.campaignId, {
        $inc: {
          'metrics.redemptions': 1,
          'metrics.revenueGenerated': Number(order.amountAfterDiscount || order.totalAmount || 0),
          'metrics.attributedOrders': 1,
          'metrics.attributedDiscount': Number(order.discountAmount || 0),
          'metrics.attributedRevenue': Number(order.amountAfterDiscount || order.totalAmount || 0)
        }
      }, { session });
    }

    await session.commitTransaction();
    await enqueueWhatsAppEvent({
      customerId: order.customerId,
      templateKey: 'feedback_request',
      variables: {
        customer_name: order.customerName || 'Pelanggan',
        order_code: order.orderCode,
        feedback_url: `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/feedback/${encodeURIComponent(order.orderCode)}?token=${encodeURIComponent(feedbackToken)}`
      },
      source: 'order.completed.feedback',
      sourceId: String(order._id)
    });
    return order;
  } catch (err) {
    await session.abortTransaction();
    const msg = String(err?.message || err);
    if (/replica set|mongos|transaction numbers|does not support transactions|multi-document transactions/i.test(msg)) {
      throw new AppError(
        'MongoDB is not configured for multi-document transactions. Use a replica set (local Docker compose or Atlas). See docs/API.md.',
        503,
        'TRANSACTIONS_UNAVAILABLE'
      );
    }
    throw err;
  } finally {
    session.endSession();
  }
}

async function cancelOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order');
  }

  if (order.status === 'completed') {
    throw new BusinessError(
      'Cannot cancel completed order',
      'CANNOT_CANCEL_COMPLETED'
    );
  }

  order.status = 'cancelled';
  await order.save();
  // A cancelled dine-in order must not leave the table looking occupied.
  // Keep it in cleaning until staff explicitly makes it available again.
  if (order.tableId) {
    await Table.findOneAndUpdate(
      { _id: order.tableId, activeOrderId: order._id },
      { status: 'cleaning', $unset: { activeOrderId: 1 } }
    );
  }
  return order;
}

module.exports = {
  completeOrder,
  createOrder,
  confirmOrder,
  cancelOrder,
  listOrders,
  listKitchenQueue,
  getOrderById,
  getOrderPublicByCode,
  updateOrder,
  updateKitchenStatus,
  updatePayment,
  updatePaymentByOrderCode
};
