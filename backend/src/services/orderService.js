const crypto = require('crypto');
const mongoose = require('mongoose');

const Menu = require('../models/Menu');
const Order = require('../models/Order');
const Ingredient = require('../models/Ingredient');
const StockMovement = require('../models/StockMovement');
const { AppError, BusinessError, NotFoundError } = require('../errors/AppError');
const { getQueueBusinessDate, getEtaMinutes } = require('../config/orderFlow');

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

/**
 * Create a new order (walk-in or online).
 */
async function createOrder(data) {
  const {
    items = [],
    notes = '',
    channel = 'walk_in',
    customerName = '',
    customerPhone = ''
  } = data;

  if (channel === 'online') {
    const name = String(customerName || '').trim();
    const phone = String(customerPhone || '').trim();
    if (!name) {
      throw new BusinessError('Customer name is required for online orders', 'ONLINE_CUSTOMER_REQUIRED');
    }
    if (!phone) {
      throw new BusinessError('Customer phone is required for online orders', 'ONLINE_CUSTOMER_REQUIRED');
    }
  }

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

  const maxAttempts = 8;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const orderCode = buildOrderCode();
    const order = new Order({
      orderCode,
      channel,
      customerName: String(customerName || '').trim(),
      customerPhone: String(customerPhone || '').trim(),
      items: orderItems,
      totalAmount,
      status: 'pending',
      notes: typeof notes === 'string' ? notes : '',
      kitchenStatus: 'none',
      paymentStatus: 'unpaid',
      queueNumber: 0,
      queueDate: ''
    });

    try {
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
  'orderCode status totalAmount notes createdAt updatedAt items channel customerName customerPhone queueDate queueNumber kitchenStatus estimatedReadyAt readyAt paymentStatus paymentMethod externalPaymentId paymentReference';

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
  const agg = await Order.aggregate([
    { $match: { queueDate, queueNumber: { $gte: 1 } } },
    { $group: { _id: null, maxNum: { $max: '$queueNumber' } } }
  ]);
  const nextQueueNumber = (agg[0] && agg[0].maxNum ? agg[0].maxNum : 0) + 1;

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
  return order;
}

const KITCHEN_STATES = ['queued', 'preparing', 'ready', 'served'];

async function updateKitchenStatus(orderId, nextStatus) {
  if (!KITCHEN_STATES.includes(nextStatus)) {
    throw new BusinessError('Invalid kitchen status', 'INVALID_KITCHEN_STATUS');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order');
  }

  if (order.status !== 'confirmed') {
    throw new BusinessError('Kitchen updates only apply to confirmed orders', 'INVALID_ORDER_STATUS');
  }

  if (order.kitchenStatus === 'none') {
    throw new BusinessError('Order must be confirmed (queued) before kitchen updates', 'KITCHEN_NOT_QUEUED');
  }

  order.kitchenStatus = nextStatus;
  if (nextStatus === 'ready' && !order.readyAt) {
    order.readyAt = new Date();
  }

  await order.save();
  return order;
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

  try {
    session.startTransaction();

    const order = await Order.findById(orderId).session(session);
    if (!order) throw new NotFoundError('Order');

    if (order.status !== 'confirmed') {
      throw new BusinessError(
        'Order must be confirmed before it can be completed',
        'INVALID_ORDER_STATUS'
      );
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

    order.status = 'completed';
    order.kitchenStatus = 'served';
    await order.save({ session });

    await session.commitTransaction();
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
  updateKitchenStatus,
  updatePayment,
  updatePaymentByOrderCode
};
