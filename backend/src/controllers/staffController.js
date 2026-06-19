const {
  createStaff,
  getStaffById,
  getAllStaff,
  updateStaff,
  deleteStaff,
  staffLogin,
  getStaffPerformance
} = require('../services/staffService');
const { validate } = require('../middlewares/validation');
const {
  createStaffSchema,
  updateStaffSchema,
  staffLoginSchema,
  staffPasswordChangeSchema
} = require('../validators/staffValidator');

function getClientIp(req) {
  return req.ip || req.connection.remoteAddress || '0.0.0.0';
}

/**
 * Create new staff member
 * POST /api/staff
 */
async function createStaffHandler(req, res, next) {
  try {
    // Validate request body
    const { error, value } = createStaffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    // Get admin info from JWT
    const adminId = req.user.id;
    const adminName = req.user.email; // Could also have name in token if needed

    const staff = await createStaff(value, adminId, adminName, getClientIp(req));

    res.status(201).json({
      success: true,
      data: staff,
      message: 'Staff created successfully'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all staff with filters
 * GET /api/staff?role=cashier&status=active&page=1&limit=20&search=john
 */
async function getAllStaffHandler(req, res, next) {
  try {
    const {
      role,
      status,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {};
    if (role) filters.role = role;
    if (status) filters.status = status;
    if (search) filters.search = search;

    const result = await getAllStaff(filters, parseInt(page), parseInt(limit));

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
 * Get staff by ID
 * GET /api/staff/:id
 */
async function getStaffHandler(req, res, next) {
  try {
    const { id } = req.params;
    const staff = await getStaffById(id);

    res.json({
      success: true,
      data: staff
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update staff member
 * PATCH /api/staff/:id
 */
async function updateStaffHandler(req, res, next) {
  try {
    // Validate request body
    const { error, value } = updateStaffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.email;

    const staff = await updateStaff(id, value, adminId, adminName, getClientIp(req));

    res.json({
      success: true,
      data: staff,
      message: 'Staff updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete (deactivate) staff member
 * DELETE /api/staff/:id
 */
async function deleteStaffHandler(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.email;

    const staff = await deleteStaff(id, adminId, adminName, getClientIp(req));

    res.json({
      success: true,
      data: staff,
      message: 'Staff deactivated successfully'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff login
 * POST /api/staff/login
 */
async function staffLoginHandler(req, res, next) {
  try {
    // Validate request body
    const { error, value } = staffLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const { email, password } = value;
    const result = await staffLogin(email, password, getClientIp(req), req.get('user-agent'));

    res.json({
      success: true,
      data: {
        token: result.token,
        expiresIn: 43200, // 12 hours in seconds
        staff: result.staff
      },
      message: 'Login successful'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get staff performance metrics
 * GET /api/staff/:id/performance?from=2024-01-01&to=2024-01-31
 */
async function getStaffPerformanceHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const performance = await getStaffPerformance(id, from, to);

    res.json({
      success: true,
      data: performance
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createStaffHandler,
  getAllStaffHandler,
  getStaffHandler,
  updateStaffHandler,
  deleteStaffHandler,
  staffLoginHandler,
  getStaffPerformanceHandler
};
