const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');
const { AppError } = require('../errors/AppError');

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;
  return token;
}

async function authenticate(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      throw new AppError('Authentication token missing', 401, 'UNAUTHORIZED');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT_SECRET is not configured', 500, 'CONFIG_ERROR');
    }

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }

    let userEntity;
    let authType = 'admin';

    if (payload.type === 'staff') {
      authType = 'staff';
      userEntity = await Staff.findById(payload.sub);
      if (!userEntity || !userEntity.isActive || userEntity.status !== 'active') {
        throw new AppError('Staff not found or inactive', 401, 'UNAUTHORIZED');
      }
    } else {
      userEntity = await Admin.findById(payload.sub);
      if (!userEntity || !userEntity.isActive) {
        throw new AppError('Admin not found or inactive', 401, 'UNAUTHORIZED');
      }
    }

    req.user = {
      id: userEntity._id.toString(),
      email: userEntity.email,
      role: payload.role || userEntity.role || 'admin',
      type: authType
    };

    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(allowedRoles = []) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 403, 'FORBIDDEN'));
    }

    const userRole = req.user.role || 'admin';
    if (!roles.includes(userRole)) {
      return next(new AppError('Insufficient permissions for this action', 403, 'FORBIDDEN'));
    }

    return next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return next(new AppError('Admin authentication required', 403, 'FORBIDDEN'));
  }
  if (req.user.role !== 'admin' && req.user.type !== 'admin') {
    return next(new AppError('Admin authentication required', 403, 'FORBIDDEN'));
  }
  return next();
}

const requirePIC = requireRole(['admin', 'manager', 'pic']);

module.exports = {
  authenticate,
  requireAdmin,
  requireRole,
  requirePIC
};

