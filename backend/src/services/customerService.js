const Customer = require('../models/Customer');
const CustomerTier = require('../models/CustomerTier');
const CustomerTierHistory = require('../models/CustomerTierHistory');
const Order = require('../models/Order');
const { AppError, BusinessError } = require('../errors/AppError');

async function ensureDefaultCustomerTiers(session) {
  // Seed or migrate only outside order-completion transactions. This avoids
  // locking the configuration collection while stock is being committed.
  await CustomerTier.ensureDefaults();
  const query = CustomerTier.find({ isActive: true })
    .sort({ minTotalSpent: -1, minTotalOrders: -1 });
  if (session) query.session(session);
  return query;
}

function tierRank(tierCode, tiers) {
  const index = tiers.findIndex((tier) => tier.code === tierCode);
  return index === -1 ? -1 : tiers.length - index;
}

async function evaluateCustomerTier(customerId, options = {}) {
  const { session, reason = 'order_completed', now = new Date() } = options;
  const customerQuery = Customer.findById(customerId);
  if (session) customerQuery.session(session);
  const customer = await customerQuery;
  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

  if (customer.customerType === 'corporate') {
    const previousTier = customer.tier;
    customer.tier = 'corporate';
    customer.periodSpent = 0;
    customer.periodOrders = 0;
    customer.tierEvaluationFailures = 0;
    customer.tierUpdatedAt = now;
    if (previousTier !== 'corporate') {
      const history = new CustomerTierHistory({
        customerId,
        previousTier,
        newTier: 'corporate',
        evaluatedAt: now,
        reason,
        periodSpent: 0,
        periodOrders: 0
      });
      if (session) await history.save({ session });
      else await history.save();
    }
    if (session) await customer.save({ session });
    else await customer.save();
    return customer;
  }

  const tiers = await ensureDefaultCustomerTiers(session);
  const periodDays = tiers[0]?.periodDays || 60;
  const periodStartDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const ordersQuery = Order.find({
    customerId,
    status: 'completed',
    createdAt: { $gte: periodStartDate, $lte: now }
  }).select('totalAmount amountAfterDiscount');
  if (session) ordersQuery.session(session);
  const orders = await ordersQuery.lean();
  const periodSpent = orders.reduce((sum, order) => sum + Number(
    order.amountAfterDiscount > 0 ? order.amountAfterDiscount : order.totalAmount || 0
  ), 0);
  const periodOrders = orders.length;
  const eligibleTier = tiers.find((tier) =>
    periodSpent >= tier.minTotalSpent && periodOrders >= tier.minTotalOrders
  ) || null;
  const currentRank = tierRank(customer.tier, tiers);
  const eligibleRank = eligibleTier ? tierRank(eligibleTier.code, tiers) : -1;
  const isDowngrade = currentRank >= 0 && eligibleRank < currentRank;
  const shouldDelayDowngrade = isDowngrade && customer.tierEvaluationFailures < 1;
  const nextTier = shouldDelayDowngrade ? customer.tier : eligibleTier?.code || null;
  const previousTier = customer.tier;

  customer.periodSpent = periodSpent;
  customer.periodOrders = periodOrders;
  customer.periodStartDate = periodStartDate;
  customer.tierEvaluationFailures = isDowngrade
    ? customer.tierEvaluationFailures + 1
    : 0;
  customer.tierUpdatedAt = now;
  customer.tier = nextTier;
  if (eligibleTier) customer.customerTier = eligibleTier._id;
  else customer.customerTier = null;

  const saveOptions = session ? { session } : undefined;
  if (previousTier !== nextTier) {
    const history = new CustomerTierHistory({
      customerId,
      previousTier,
      newTier: nextTier,
      evaluatedAt: now,
      reason: shouldDelayDowngrade ? `${reason}:grace_period` : reason,
      periodSpent,
      periodOrders
    });
    if (session) await history.save({ session });
    else await history.save();
  }
  await customer.save(saveOptions);
  return customer;
}

async function evaluateAllCustomerTiers(options = {}) {
  const query = Customer.find({ isActive: true, customerType: 'individual' }).select('_id');
  if (options.session) query.session(options.session);
  const customers = await query.lean();
  for (const customer of customers) {
    await evaluateCustomerTier(customer._id, options);
  }
  return customers.length;
}

async function resolveCustomerTier(totalSpent, totalOrders, session) {
  const tiers = await ensureDefaultCustomerTiers(session);
  return tiers.find((tier) =>
    totalSpent >= tier.minTotalSpent && totalOrders >= tier.minTotalOrders
  ) || null;
}

/**
 * Find or create customer from online order
 */
async function createCustomer(payload = {}) {
  const { phone, name = '', email = '' } = payload;
  const normalizedPhone = String(phone || '').trim();

  if (!normalizedPhone) {
    throw new BusinessError('Customer phone is required', 'INVALID_CUSTOMER_PHONE');
  }

  const existing = await Customer.findOne({ phone: normalizedPhone });
  if (existing) {
    return existing;
  }

  const customer = await Customer.create({
    phone: normalizedPhone,
    name: String(name || '').trim() || `Customer-${normalizedPhone}`,
    email: String(email || '').trim().toLowerCase(),
    tier: null,
    totalOrders: 0,
    totalSpent: 0
  });

  return customer;
}

async function findOrCreateCustomer(phone, name = '', email = '') {
  const normalizedPhone = String(phone || '').trim();
  let customer = await Customer.findOne({ phone: normalizedPhone });

  if (customer) {
    if (name && !customer.name) {
      customer.name = name;
      await customer.save();
    }
    return customer;
  }

  // Create new customer
  customer = await Customer.create({
    phone: normalizedPhone,
    name: name || `Customer-${phone}`,
    email: email || '',
    tier: null,
    totalOrders: 0,
    totalSpent: 0
  });

  return customer;
}

async function attachOrderToCustomer({ customerId, phone, name, email, orderId }) {
  const customer = customerId
    ? await Customer.findById(customerId)
    : await findOrCreateCustomer(phone, name, email);

  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  if (!customer.orderIds.some((id) => String(id) === String(orderId))) {
    customer.orderIds.push(orderId);
    await customer.save();
  }
  return customer;
}

async function recordCompletedOrder(order, session) {
  const customer = await Customer.findOneAndUpdate(
    { _id: order.customerId },
    {
      $inc: {
        totalOrders: 1,
        totalSpent: Number(
          order.amountAfterDiscount > 0
            ? order.amountAfterDiscount
            : order.totalAmount || 0
        ),
        totalQuantity: order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      },
      $max: { lastOrderDate: order.updatedAt || new Date() }
    },
    { new: true, session }
  );

  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

  return evaluateCustomerTier(customer._id, {
    session,
    reason: 'order_completed'
  });
}

/**
 * Get customer by ID
 */
async function getCustomerById(customerId) {
  const customer = await Customer.findById(customerId)
    .populate('preferredItems', 'name price')
    .populate('customerTier', 'code name minTotalSpent minTotalOrders benefits');

  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  return customer.toObject();
}

/**
 * Get all customers with filters and pagination
 */
async function getAllCustomers(filters = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const query = { isActive: true };
  if (filters.tier) query.tier = filters.tier;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { phone: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ totalSpent: -1 })
      .lean(),
    Customer.countDocuments(query)
  ]);

  return {
    data: customers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

async function getCustomerTiers() {
  return ensureDefaultCustomerTiers();
}

/**
 * Update customer information
 */
async function updateCustomer(customerId, data) {
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const updates = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.email !== undefined) updates.email = data.email;
  if (data.address !== undefined) updates.address = data.address;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.audienceSegment !== undefined) updates.audienceSegment = data.audienceSegment;
  if (data.householdSize !== undefined) updates.householdSize = data.householdSize;
  if (data.organizationName !== undefined) updates.organizationName = data.organizationName;

  if (Object.keys(updates).length > 0) {
    Object.assign(customer, updates);
    await customer.save();
  }

  return customer.toObject();
}

async function updateCustomerType(customerId, customerType) {
  if (!['individual', 'corporate'].includes(customerType)) {
    throw new BusinessError('Invalid customer type', 'INVALID_CUSTOMER_TYPE');
  }

  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const previousTier = customer.tier;
  customer.customerType = customerType;
  if (customerType === 'corporate') {
    customer.tier = 'corporate';
    customer.customerTier = null;
    customer.tierEvaluationFailures = 0;
  }
  await customer.save();
  if (customerType === 'corporate' && previousTier !== 'corporate') {
    await CustomerTierHistory.create({
      customerId: customer._id,
      previousTier,
      newTier: 'corporate',
      evaluatedAt: new Date(),
      reason: 'customer_type_changed',
      periodSpent: customer.periodSpent,
      periodOrders: customer.periodOrders
    });
  }
  if (customerType === 'individual') {
    return evaluateCustomerTier(customer._id, { reason: 'customer_type_changed' });
  }
  return customer;
}

/**
 * Get customer order history
 */
async function getCustomerOrderHistory(customerId, limit = 50) {
  const orders = await Order.find({ customerId })
    .select('orderCode totalAmount amountAfterDiscount status kitchenStatus paymentStatus createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return orders;
}

/**
 * Get top customers by spending
 */
async function getTopCustomers(limit = 20, from = null, to = null) {
  const query = { isActive: true };

  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateFilter.$lte = toDate;
  }

  let aggregation = [
    { $match: query }
  ];

  // If date filter, join with orders
  if (Object.keys(dateFilter).length > 0) {
    aggregation.push({
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'customerId',
        as: 'orders'
      }
    });
    aggregation.push({
      $addFields: {
        orders: {
          $filter: {
            input: '$orders',
            as: 'order',
            cond: {
              $and: [
                { $gte: ['$$order.createdAt', dateFilter.$gte || new Date(0)] },
                { $lte: ['$$order.createdAt', dateFilter.$lte || new Date()] }
              ]
            }
          }
        }
      }
    });
    aggregation.push({
      $addFields: {
        periodSpent: { $sum: '$orders.totalAmount' },
        periodOrders: { $size: '$orders' }
      }
    });
    aggregation.push({ $sort: { periodSpent: -1 } });
  } else {
    aggregation.push({ $sort: { totalSpent: -1 } });
  }

  aggregation.push({ $limit: limit });

  const customers = await Customer.aggregate(aggregation);
  return customers;
}

/**
 * Get customer segments (by tier)
 */
async function getCustomerSegments() {
  const segments = await Customer.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$tier',
        count: { $sum: 1 },
        avgSpent: { $avg: '$totalSpent' },
        totalSpent: { $sum: '$totalSpent' },
        avgOrders: { $avg: '$totalOrders' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return segments;
}

/**
 * Get repeat customer rate
 */
async function getRepeatCustomerRate(from = null, to = null) {
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateFilter.$lte = toDate;
  }

  const matchStage = { status: 'completed' };
  if (Object.keys(dateFilter).length > 0) {
    matchStage.createdAt = dateFilter;
  }

  const result = await Order.aggregate([
    { $match: matchStage },
    { $match: { customerId: { $ne: null } } },
    {
      $group: {
        _id: '$customerId',
        orderCount: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        repeatCustomers: {
          $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] }
        },
        singleOrderCustomers: {
          $sum: { $cond: [{ $eq: ['$orderCount', 1] }, 1, 0] }
        },
        avgOrdersPerCustomer: { $avg: '$orderCount' }
      }
    }
  ]);

  const data = result[0] || {
    totalCustomers: 0,
    repeatCustomers: 0,
    singleOrderCustomers: 0,
    avgOrdersPerCustomer: 0
  };

  return {
    ...data,
    repeatRate: data.totalCustomers > 0
      ? ((data.repeatCustomers / data.totalCustomers) * 100).toFixed(2)
      : 0
  };
}

/**
 * Get churn risk customers (inactive > days)
 */
async function getChurnRiskCustomers(inactiveDays = 30, limit = 20) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

  const customers = await Customer.find({
    isActive: true,
    lastOrderDate: { $lt: cutoffDate }
  })
    .select('name phone email lastOrderDate totalOrders totalSpent tier')
    .sort({ lastOrderDate: -1 })
    .limit(limit)
    .lean();

  return customers;
}

/**
 * Get customer lifetime value
 */
async function getCustomerLifetimeValue(customerId) {
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  return {
    customerId,
    name: customer.name,
    phone: customer.phone,
    tier: customer.tier,
    totalOrders: customer.totalOrders,
    totalSpent: customer.totalSpent,
    avgOrderValue: customer.totalOrders > 0 ? (customer.totalSpent / customer.totalOrders).toFixed(2) : 0,
    lastOrderDate: customer.lastOrderDate
  };
}

async function getCrmDashboard() {
  const [summary, segments, support, atRisk, activeCampaigns] = await Promise.all([
    Customer.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, customers: { $sum: 1 }, totalSpent: { $sum: '$totalSpent' }, totalOrders: { $sum: '$totalOrders' }, averageValue: { $avg: '$totalSpent' } } }
    ]),
    Customer.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$audienceSegment', customers: { $sum: 1 }, spent: { $sum: '$totalSpent' }, orders: { $sum: '$totalOrders' } } },
      { $sort: { customers: -1 } }
    ]),
    require('../models/CustomerSupportTicket').aggregate([
      { $match: { status: { $in: ['open', 'in_progress'] } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]),
    getChurnRiskCustomers(30, 5),
    require('../models/Campaign').countDocuments({ status: 'active', 'automation.enabled': true })
  ]);

  return {
    summary: summary[0] || { customers: 0, totalSpent: 0, totalOrders: 0, averageValue: 0 },
    segments,
    supportOpen: support.reduce((total, row) => total + row.count, 0),
    supportByPriority: support,
    atRiskCustomers: atRisk,
    activeAutomations: activeCampaigns,
    generatedAt: new Date()
  };
}

module.exports = {
  createCustomer,
  findOrCreateCustomer,
  getCustomerById,
  getAllCustomers,
  getCustomerTiers,
  updateCustomerType,
  updateCustomer,
  getCustomerOrderHistory,
  getTopCustomers,
  getCustomerSegments,
  getRepeatCustomerRate,
  getChurnRiskCustomers,
  getCustomerLifetimeValue,
  getCrmDashboard,
  attachOrderToCustomer,
  recordCompletedOrder,
  ensureDefaultCustomerTiers,
  evaluateCustomerTier,
  evaluateAllCustomerTiers
};
