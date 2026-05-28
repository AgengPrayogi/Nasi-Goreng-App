const {
  completeOrder,
  createOrder,
  confirmOrder,
  cancelOrder,
  listOrders,
  listKitchenQueue,
  getOrderById,
  getOrderPublicByCode,
  updateKitchenStatus,
  updatePayment
} = require('../services/orderService');

async function createOrderHandler(req, res, next) {
  try {
    const order = await createOrder(req.body);
    res.status(201).json({ data: order });
  } catch (err) {
    next(err);
  }
}

async function confirmOrderHandler(req, res, next) {
  try {
    const { id } = req.params;
    const order = await confirmOrder(id);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
}

async function completeOrderHandler(req, res, next) {
  try {
    const { id } = req.params;
    const order = await completeOrder(id);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
}

async function listOrdersHandler(req, res, next) {
  try {
    const { status, orderCode, channel, kitchenStatus, paymentStatus, queueDate, page, limit, search } = req.query;
    const result = await listOrders({
      status,
      orderCode,
      channel,
      kitchenStatus,
      paymentStatus,
      queueDate,
      page,
      limit,
      search
    });
    res.json({
      data: result.orders,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (err) {
    next(err);
  }
}

async function listKitchenQueueHandler(req, res, next) {
  try {
    const { queueDate } = req.query;
    const orders = await listKitchenQueue(queueDate);
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
}

async function trackOrderHandler(req, res, next) {
  try {
    const { orderCode } = req.params;
    const order = await getOrderPublicByCode(orderCode);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
}

async function getOrderHandler(req, res, next) {
  try {
    const { id } = req.params;
    const order = await getOrderById(id);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
}

async function cancelOrderHandler(req, res, next) {
  try {
    const { id } = req.params;
    const order = await cancelOrder(id);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
}

async function updateKitchenStatusHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { kitchenStatus } = req.body;
    const order = await updateKitchenStatus(id, kitchenStatus);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
}

async function updatePaymentHandler(req, res, next) {
  try {
    const { id } = req.params;
    const order = await updatePayment(id, req.body);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrderHandler,
  confirmOrderHandler,
  completeOrderHandler,
  cancelOrderHandler,
  listOrdersHandler,
  listKitchenQueueHandler,
  getOrderHandler,
  trackOrderHandler,
  updateKitchenStatusHandler,
  updatePaymentHandler
};
