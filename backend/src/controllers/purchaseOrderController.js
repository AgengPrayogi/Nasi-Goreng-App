const {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  updatePOStatus,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getPendingPurchaseOrders,
  getOverduePurchaseOrders
} = require('../services/purchaseOrderService');

/**
 * Create purchase order
 * POST /api/purchase-orders
 */
async function createPOHandler(req, res, next) {
  try {
    const { supplierId, items, notes, expectedDate } = req.body;

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier ID and items are required',
        code: 'VALIDATION_ERROR'
      });
    }

    const po = await createPurchaseOrder(
      { supplierId, items, notes, expectedDate },
      req.user?.id
    );

    res.status(201).json({
      success: true,
      data: po,
      message: 'Purchase order created successfully'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all purchase orders
 * GET /api/purchase-orders?status=pending&page=1&limit=20
 */
async function getAllPOHandler(req, res, next) {
  try {
    const { status, supplierId, poNumber, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (supplierId) filters.supplierId = supplierId;
    if (poNumber) filters.poNumber = poNumber;

    const result = await getAllPurchaseOrders(filters, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get purchase order by ID
 * GET /api/purchase-orders/:id
 */
async function getPOHandler(req, res, next) {
  try {
    const { id } = req.params;
    const po = await getPurchaseOrderById(id);

    res.json({
      success: true,
      data: po
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update purchase order status
 * PATCH /api/purchase-orders/:id/status
 */
async function updatePOStatusHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const po = await updatePOStatus(id, status);

    res.json({
      success: true,
      data: po,
      message: 'Purchase order status updated'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Receive purchase order (mark as received and update stock)
 * PATCH /api/purchase-orders/:id/receive
 */
async function receivePOHandler(req, res, next) {
  try {
    const { id } = req.params;
    const po = await receivePurchaseOrder(id, req.user?.id);

    res.json({
      success: true,
      data: po,
      message: 'Purchase order received and stock updated'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Cancel purchase order
 * PATCH /api/purchase-orders/:id/cancel
 */
async function cancelPOHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const po = await cancelPurchaseOrder(id, reason);

    res.json({
      success: true,
      data: po,
      message: 'Purchase order cancelled'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get pending purchase orders
 * GET /api/purchase-orders/analytics/pending
 */
async function getPendingPOHandler(req, res, next) {
  try {
    const pos = await getPendingPurchaseOrders();

    res.json({
      success: true,
      data: pos
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get overdue purchase orders
 * GET /api/purchase-orders/analytics/overdue
 */
async function getOverduePOHandler(req, res, next) {
  try {
    const pos = await getOverduePurchaseOrders();

    res.json({
      success: true,
      data: pos
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPOHandler,
  getAllPOHandler,
  getPOHandler,
  updatePOStatusHandler,
  receivePOHandler,
  cancelPOHandler,
  getPendingPOHandler,
  getOverduePOHandler
};
