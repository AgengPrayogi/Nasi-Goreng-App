const {
  getCustomerById,
  getAllCustomers,
  updateCustomer,
  getCustomerOrderHistory,
  getTopCustomers,
  getCustomerSegments,
  getRepeatCustomerRate,
  getChurnRiskCustomers,
  getCustomerLifetimeValue
} = require('../services/customerService');

/**
 * Get all customers with filters
 * GET /api/customers?tier=gold&page=1&limit=20&search=john
 */
async function getAllCustomersHandler(req, res, next) {
  try {
    const { tier, search, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (tier) filters.tier = tier;
    if (search) filters.search = search;

    const result = await getAllCustomers(filters, parseInt(page), parseInt(limit));

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
 * Get customer by ID with details
 * GET /api/customers/:id
 */
async function getCustomerHandler(req, res, next) {
  try {
    const { id } = req.params;
    const customer = await getCustomerById(id);

    res.json({
      success: true,
      data: customer
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update customer information
 * PATCH /api/customers/:id
 */
async function updateCustomerHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, address, notes } = req.body;

    const customer = await updateCustomer(id, { name, email, address, notes });

    res.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get customer order history
 * GET /api/customers/:id/orders?limit=50
 */
async function getCustomerOrdersHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const orders = await getCustomerOrderHistory(id, parseInt(limit));

    res.json({
      success: true,
      data: orders
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get top customers by spending
 * GET /api/customers/analytics/top?limit=20&from=2024-01-01&to=2024-01-31
 */
async function getTopCustomersHandler(req, res, next) {
  try {
    const { limit = 20, from, to } = req.query;

    const customers = await getTopCustomers(parseInt(limit), from, to);

    res.json({
      success: true,
      data: customers,
      message: `Top ${limit} customers`
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get customer segments (by tier)
 * GET /api/customers/analytics/segments
 */
async function getCustomerSegmentsHandler(req, res, next) {
  try {
    const segments = await getCustomerSegments();

    res.json({
      success: true,
      data: segments
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get repeat customer rate
 * GET /api/customers/analytics/repeat-rate?from=2024-01-01&to=2024-01-31
 */
async function getRepeatCustomerRateHandler(req, res, next) {
  try {
    const { from, to } = req.query;

    const data = await getRepeatCustomerRate(from, to);

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get churn risk customers
 * GET /api/customers/analytics/churn-risk?days=30&limit=20
 */
async function getChurnRiskHandler(req, res, next) {
  try {
    const { days = 30, limit = 20 } = req.query;

    const customers = await getChurnRiskCustomers(parseInt(days), parseInt(limit));

    res.json({
      success: true,
      data: customers,
      message: `Customers inactive for ${days}+ days`
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get customer lifetime value
 * GET /api/customers/:id/lifetime-value
 */
async function getCustomerLifetimeValueHandler(req, res, next) {
  try {
    const { id } = req.params;

    const clv = await getCustomerLifetimeValue(id);

    res.json({
      success: true,
      data: clv
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllCustomersHandler,
  getCustomerHandler,
  updateCustomerHandler,
  getCustomerOrdersHandler,
  getTopCustomersHandler,
  getCustomerSegmentsHandler,
  getRepeatCustomerRateHandler,
  getChurnRiskHandler,
  getCustomerLifetimeValueHandler
};
