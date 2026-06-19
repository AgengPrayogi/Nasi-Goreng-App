const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');
const AuditLog = require('../models/AuditLog');
const { AppError, BusinessError } = require('../errors/AppError');

/**
 * Create new staff member
 */
async function createStaff(data, createdByAdminId, createdByAdminName, ipAddress) {
  const { email, password, name, phone, role, notes } = data;

  // Check if staff with email already exists
  const existing = await Staff.findOne({ email });
  if (existing) {
    throw new BusinessError('Staff with this email already exists', 'STAFF_EXISTS');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create staff
  const staff = await Staff.create({
    email,
    passwordHash,
    name,
    phone: phone || '',
    role: role || 'waiter',
    status: 'active',
    notes: notes || '',
    joinDate: new Date()
  });

  // Log audit
  await logStaffAction(
    createdByAdminId,
    createdByAdminName,
    'create',
    'Staff',
    staff._id,
    `Created staff: ${name} (${email}) with role ${role}`,
    { name, email, role },
    ipAddress
  );

  return staff.toObject();
}

/**
 * Get staff by ID
 */
async function getStaffById(staffId) {
  const staff = await Staff.findById(staffId).select('-passwordHash');
  if (!staff) {
    throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');
  }
  return staff.toObject();
}

/**
 * Get all staff with filters and pagination
 */
async function getAllStaff(filters = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const query = {};
  if (filters.role) query.role = filters.role;
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const [staff, total] = await Promise.all([
    Staff.find(query)
      .select('-passwordHash')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    Staff.countDocuments(query)
  ]);

  return {
    data: staff,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Update staff member
 */
async function updateStaff(staffId, data, updatedByAdminId, updatedByAdminName, ipAddress) {
  const staff = await Staff.findById(staffId);
  if (!staff) {
    throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');
  }

  const updates = {};
  const changes = {};

  if (data.name !== undefined && data.name !== staff.name) {
    updates.name = data.name;
    changes.name = { from: staff.name, to: data.name };
  }
  if (data.phone !== undefined && data.phone !== staff.phone) {
    updates.phone = data.phone;
    changes.phone = { from: staff.phone, to: data.phone };
  }
  if (data.role !== undefined && data.role !== staff.role) {
    updates.role = data.role;
    changes.role = { from: staff.role, to: data.role };
  }
  if (data.status !== undefined && data.status !== staff.status) {
    updates.status = data.status;
    changes.status = { from: staff.status, to: data.status };
  }
  if (data.notes !== undefined && data.notes !== staff.notes) {
    updates.notes = data.notes;
    changes.notes = { from: staff.notes, to: data.notes };
  }

  if (Object.keys(updates).length === 0) {
    return staff.toObject();
  }

  const updatedStaff = await Staff.findByIdAndUpdate(staffId, updates, { new: true });

  // Log audit
  await logStaffAction(
    updatedByAdminId,
    updatedByAdminName,
    'update',
    'Staff',
    staffId,
    `Updated staff: ${staff.name}`,
    changes,
    ipAddress
  );

  return updatedStaff.toObject();
}

/**
 * Delete (soft delete / deactivate) staff member
 */
async function deleteStaff(staffId, deletedByAdminId, deletedByAdminName, ipAddress) {
  const staff = await Staff.findById(staffId);
  if (!staff) {
    throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');
  }

  staff.status = 'inactive';
  staff.isActive = false;
  await staff.save();

  // Log audit
  await logStaffAction(
    deletedByAdminId,
    deletedByAdminName,
    'delete',
    'Staff',
    staffId,
    `Deactivated staff: ${staff.name}`,
    {},
    ipAddress
  );

  return staff.toObject();
}

/**
 * Staff login (similar to admin, but simpler)
 */
async function staffLogin(email, password, ipAddress, userAgent) {
  const staff = await Staff.findOne({ email });
  if (!staff) {
    throw new BusinessError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!staff.isActive || staff.status !== 'active') {
    throw new AppError('Staff account is inactive or suspended', 403, 'STAFF_INACTIVE');
  }

  const isPasswordValid = await bcrypt.compare(password, staff.passwordHash);
  if (!isPasswordValid) {
    throw new BusinessError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Generate JWT
  const token = generateStaffJWT(staff._id, staff.email, staff.role);

  // Update last login
  staff.lastLoginAt = new Date();
  staff.lastLoginIp = ipAddress;
  await staff.save();

  return {
    token,
    staff: {
      id: staff._id,
      email: staff.email,
      name: staff.name,
      role: staff.role
    }
  };
}

/**
 * Verify JWT token for staff
 */
function verifyStaffJWT(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET is not configured', 500, 'CONFIG_ERROR');
  }

  try {
    const payload = jwt.verify(token, secret);
    return payload;
  } catch (err) {
    throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
  }
}

/**
 * Generate JWT for staff (same as admin for now)
 */
function generateStaffJWT(staffId, email, role) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET is not configured', 500, 'CONFIG_ERROR');
  }

  const token = jwt.sign(
    {
      sub: staffId.toString(),
      email,
      role,
      type: 'staff'
    },
    secret,
    { expiresIn: '12h' }
  );

  return token;
}

/**
 * Get staff performance metrics
 */
async function getStaffPerformance(staffId, from, to) {
  const Order = require('../models/Order');

  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateFilter.$lte = toDate;
  }

  const matchStage = { createdAt: dateFilter };

  const [confirmStats, completeStats] = await Promise.all([
    Order.aggregate([
      { $match: { ...matchStage, confirmedBy: staffId } },
      {
        $group: {
          _id: null,
          totalConfirmed: { $sum: 1 }
        }
      }
    ]),
    Order.aggregate([
      { $match: { ...matchStage, completedBy: staffId } },
      {
        $group: {
          _id: null,
          totalCompleted: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ])
  ]);

  return {
    period: { from, to },
    confirmed: confirmStats[0]?.totalConfirmed || 0,
    completed: completeStats[0]?.totalCompleted || 0,
    revenue: completeStats[0]?.totalRevenue || 0
  };
}

/**
 * Log staff action to audit log
 */
async function logStaffAction(adminId, adminName, action, resource, resourceId, description, metadata = {}, ipAddress = '') {
  try {
    await AuditLog.create({
      adminId,
      adminName,
      action,
      resource,
      resourceId: resourceId || null,
      description,
      metadata,
      ipAddress,
      userAgent: ''
    });
  } catch (err) {
    console.error('Failed to log staff action:', err);
  }
}

module.exports = {
  createStaff,
  getStaffById,
  getAllStaff,
  updateStaff,
  deleteStaff,
  staffLogin,
  verifyStaffJWT,
  generateStaffJWT,
  getStaffPerformance
};
