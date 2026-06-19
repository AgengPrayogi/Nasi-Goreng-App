const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { AppError, BusinessError } = require('../errors/AppError');

/**
 * Find or create customer from online order
 */
async function findOrCreateCustomer(phone, name = '', email = '') {
  let customer = await Customer.findOne({ phone });

  if (customer) {
    return customer;
  }

  // Create new customer
  customer = await Customer.create({
    phone,
    name: name || `Customer-${phone}`,
    email: email || '',
    tier: 'bronze',
    totalOrders: 0,
    totalSpent: 0
  });

  return customer;
}

/**
 * Get customer by ID
 */
async function getCustomerById(customerId) {
  const customer = await Customer.findById(customerId)
    .populate('preferredItems', 'name price');

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

  if (Object.keys(updates).length > 0) {
    Object.assign(customer, updates);
    await customer.save();
  }

  return customer.toObject();
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

module.exports = {
  findOrCreateCustomer,
  getCustomerById,
  getAllCustomers,
  updateCustomer,
  getCustomerOrderHistory,
  getTopCustomers,
  getCustomerSegments,
  getRepeatCustomerRate,
  getChurnRiskCustomers,
  getCustomerLifetimeValue
};
