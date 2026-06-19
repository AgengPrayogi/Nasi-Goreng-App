const PurchaseOrder = require('../models/PurchaseOrder');
const Ingredient = require('../models/Ingredient');
const Supplier = require('../models/Supplier');
const { AppError, BusinessError } = require('../errors/AppError');

/**
 * Create purchase order
 */
async function createPurchaseOrder(data, createdByStaffId = null) {
  const { supplierId, items, notes, expectedDate } = data;

  // Verify supplier exists
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
  }

  if (!items || items.length === 0) {
    throw new BusinessError('Purchase order must contain at least 1 item', 'NO_ITEMS');
  }

  // Calculate total cost and verify ingredients
  let totalCost = 0;
  const validItems = [];

  for (const item of items) {
    const ingredient = await Ingredient.findById(item.ingredientId);
    if (!ingredient) {
      throw new AppError(
        `Ingredient ${item.ingredientId} not found`,
        404,
        'INGREDIENT_NOT_FOUND'
      );
    }

    const subtotal = item.quantity * item.unitPrice;
    totalCost += subtotal;

    validItems.push({
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit || ingredient.unit || 'kg',
      unitPrice: item.unitPrice,
      subtotal
    });
  }

  // Calculate expected date
  let calcExpectedDate = expectedDate ? new Date(expectedDate) : null;
  if (!calcExpectedDate) {
    calcExpectedDate = new Date();
    calcExpectedDate.setDate(calcExpectedDate.getDate() + (supplier.leadTime || 1));
  }

  const po = await PurchaseOrder.create({
    supplierId,
    items: validItems,
    totalCost,
    expectedDate: calcExpectedDate,
    status: 'pending',
    notes: notes || ''
  });

  return po.toObject();
}

/**
 * Get all purchase orders
 */
async function getAllPurchaseOrders(filters = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.supplierId) query.supplierId = filters.supplierId;
  if (filters.poNumber) query.poNumber = { $regex: filters.poNumber, $options: 'i' };

  const [orders, total] = await Promise.all([
    PurchaseOrder.find(query)
      .populate('supplierId', 'name contact phone')
      .populate('items.ingredientId', 'name unit')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    PurchaseOrder.countDocuments(query)
  ]);

  return {
    data: orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };
}

/**
 * Get purchase order by ID
 */
async function getPurchaseOrderById(poId) {
  const po = await PurchaseOrder.findById(poId)
    .populate('supplierId')
    .populate('items.ingredientId')
    .populate('receivedBy', 'name');

  if (!po) {
    throw new AppError('Purchase order not found', 404, 'PO_NOT_FOUND');
  }

  return po.toObject();
}

/**
 * Update purchase order status
 */
async function updatePOStatus(poId, status) {
  const po = await PurchaseOrder.findById(poId);
  if (!po) {
    throw new AppError('Purchase order not found', 404, 'PO_NOT_FOUND');
  }

  const validStatuses = ['pending', 'confirmed', 'received', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new BusinessError(
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      'INVALID_STATUS'
    );
  }

  po.status = status;

  if (status === 'received') {
    po.receivedDate = new Date();
  }

  await po.save();
  return po.toObject();
}

/**
 * Receive purchase order items (mark as received and update stock)
 */
async function receivePurchaseOrder(poId, staffId = null) {
  const po = await PurchaseOrder.findById(poId);
  if (!po) {
    throw new AppError('Purchase order not found', 404, 'PO_NOT_FOUND');
  }

  if (po.status === 'received') {
    throw new BusinessError('Purchase order already received', 'ALREADY_RECEIVED');
  }

  // Update ingredient stock for each item
  for (const item of po.items) {
    const ingredient = await Ingredient.findById(item.ingredientId);
    if (ingredient) {
      ingredient.currentStock += item.quantity;
      ingredient.lastRestockDate = new Date();
      ingredient.lastRestockQty = item.quantity;
      await ingredient.save();
    }
  }

  // Mark PO as received
  po.status = 'received';
  po.receivedDate = new Date();
  po.receivedBy = staffId;
  await po.save();

  return po.toObject();
}

/**
 * Cancel purchase order
 */
async function cancelPurchaseOrder(poId, reason = '') {
  const po = await PurchaseOrder.findById(poId);
  if (!po) {
    throw new AppError('Purchase order not found', 404, 'PO_NOT_FOUND');
  }

  if (po.status === 'received') {
    throw new BusinessError('Cannot cancel received purchase order', 'INVALID_OPERATION');
  }

  po.status = 'cancelled';
  if (reason) po.notes = `Cancelled: ${reason}\n${po.notes}`;
  await po.save();

  return po.toObject();
}

/**
 * Get pending purchase orders (not yet received)
 */
async function getPendingPurchaseOrders() {
  const pos = await PurchaseOrder.find({ status: { $in: ['pending', 'confirmed'] } })
    .populate('supplierId', 'name')
    .populate('items.ingredientId', 'name')
    .sort({ expectedDate: 1 })
    .lean();

  return pos;
}

/**
 * Get overdue purchase orders
 */
async function getOverduePurchaseOrders() {
  const now = new Date();
  const pos = await PurchaseOrder.find({
    status: { $in: ['pending', 'confirmed'] },
    expectedDate: { $lt: now }
  })
    .populate('supplierId', 'name contact phone')
    .populate('items.ingredientId', 'name')
    .sort({ expectedDate: 1 })
    .lean();

  return pos;
}

module.exports = {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  updatePOStatus,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getPendingPurchaseOrders,
  getOverduePurchaseOrders
};
