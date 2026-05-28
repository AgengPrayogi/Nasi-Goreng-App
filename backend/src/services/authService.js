const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const RefreshToken = require('../models/RefreshToken');
const AuthLog = require('../models/AuthLog');
const { AppError, BusinessError } = require('../errors/AppError');
const { sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail, initializeEmailService } = require('./emailService');

// Initialize email service on load
initializeEmailService();

async function assertCanRegisterAdmin() {
  const count = await Admin.countDocuments();
  if (count === 0) {
    return;
  }
  if (process.env.ALLOW_ADMIN_REGISTER === 'true') {
    return;
  }
  throw new AppError(
    'Admin registration is closed. Only the first bootstrap account may be created publicly. Set ALLOW_ADMIN_REGISTER=true only in a trusted environment to add more admins.',
    403,
    'ADMIN_REGISTER_DISABLED'
  );
}

async function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function registerAdmin({ email, password }, ipAddress) {
  await assertCanRegisterAdmin();

  const existing = await Admin.findOne({ email });
  if (existing) {
    await logAuthEvent('REGISTER', email, 'FAILED', 'Admin with this email already exists', ipAddress);
    throw new BusinessError('Admin with this email already exists', 'ADMIN_EXISTS');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const verificationToken = await generateVerificationToken();

  const admin = await Admin.create({
    email,
    passwordHash,
    isVerified: false,
    verificationToken,
    verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  // Send verification email
  try {
    await sendVerificationEmail(email, verificationToken);
  } catch (err) {
    console.error('Failed to send verification email:', err);
    // Don't throw - allow registration even if email fails
  }

  await logAuthEvent('REGISTER', email, 'SUCCESS', null, ipAddress, admin._id.toString());

  return { ...admin.toObject(), verificationToken };
}

async function verifyAdminEmail(token) {
  const admin = await Admin.findOne({ 
    verificationToken: token, 
    isVerified: false,
    verificationTokenExpiry: { $gt: new Date() }
  });

  if (!admin) {
    throw new AppError('Invalid or expired verification token', 400, 'INVALID_VERIFICATION_TOKEN');
  }

  admin.isVerified = true;
  admin.verificationToken = '';
  admin.verificationTokenExpiry = null;
  await admin.save();

  await logAuthEvent('EMAIL_VERIFIED', admin.email, 'SUCCESS', null, null, admin._id.toString());

  return admin;
}

async function resendVerificationEmail(email) {
  const admin = await Admin.findOne({ email });
  
  if (!admin) {
    throw new AppError('Admin not found', 404, 'ADMIN_NOT_FOUND');
  }

  if (admin.isVerified) {
    throw new AppError('Email is already verified', 400, 'ALREADY_VERIFIED');
  }

  const verificationToken = await generateVerificationToken();
  admin.verificationToken = verificationToken;
  admin.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await admin.save();

  try {
    await sendVerificationEmail(email, verificationToken);
  } catch (err) {
    console.error('Failed to send verification email:', err);
    throw new AppError('Failed to send verification email', 500, 'EMAIL_SEND_FAILED');
  }

  return { message: 'Verification email sent', email };
}

async function loginAdmin({ email, password }, ipAddress, userAgent) {
  const admin = await Admin.findOne({ email });
  
  if (!admin || !admin.isActive) {
    await logAuthEvent('LOGIN_FAILED', email, 'FAILED', 'Invalid email or password', ipAddress);
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!admin.isVerified) {
    await logAuthEvent('LOGIN_FAILED', email, 'FAILED', 'Email not verified', ipAddress, admin._id.toString());
    throw new AppError('Please verify your email before logging in', 403, 'EMAIL_NOT_VERIFIED');
  }

  const isMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!isMatch) {
    await logAuthEvent('LOGIN_FAILED', email, 'FAILED', 'Invalid password', ipAddress, admin._id.toString());
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET is not configured', 500, 'CONFIG_ERROR');
  }

  const token = jwt.sign(
    {
      sub: admin._id.toString(),
      email: admin.email
    },
    secret,
    { expiresIn: '12h' }
  );

  // Generate refresh token
  const refreshTokenValue = crypto.randomBytes(32).toString('hex');
  const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  await RefreshToken.create({
    token: refreshTokenValue,
    adminId: admin._id,
    expiresAt: refreshTokenExpiry,
    ipAddress,
    userAgent
  });

  // Update login tracking
  admin.lastLoginAt = new Date();
  admin.lastLoginIp = ipAddress;
  await admin.save();

  await logAuthEvent('LOGIN_SUCCESS', email, 'SUCCESS', null, ipAddress, admin._id.toString());

  return {
    admin,
    token,
    refreshToken: refreshTokenValue,
    expiresIn: '12h'
  };
}

async function refreshAccessToken(refreshTokenValue) {
  const refreshToken = await RefreshToken.findOne({
    token: refreshTokenValue,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  });

  if (!refreshToken) {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const admin = await Admin.findById(refreshToken.adminId);
  if (!admin || !admin.isActive || !admin.isVerified) {
    throw new AppError('Admin not found or inactive', 401, 'UNAUTHORIZED');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET is not configured', 500, 'CONFIG_ERROR');
  }

  const newToken = jwt.sign(
    {
      sub: admin._id.toString(),
      email: admin.email
    },
    secret,
    { expiresIn: '12h' }
  );

  return {
    token: newToken,
    expiresIn: '12h'
  };
}

async function requestPasswordReset(email, ipAddress) {
  const admin = await Admin.findOne({ email });
  
  if (!admin) {
    // Don't reveal if email exists (security best practice)
    return { message: 'If the email exists, a password reset link has been sent' };
  }

  const resetToken = await generateResetToken();
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  admin.resetToken = resetToken;
  admin.resetTokenExpiry = resetTokenExpiry;
  await admin.save();

  try {
    await sendPasswordResetEmail(email, resetToken);
  } catch (err) {
    console.error('Failed to send password reset email:', err);
    // Still return success to prevent email enumeration
  }

  await logAuthEvent('PASSWORD_RESET', email, 'SUCCESS', 'Reset link sent', ipAddress, admin._id.toString());

  return { message: 'If the email exists, a password reset link has been sent' };
}

async function resetPassword(token, newPassword) {
  const admin = await Admin.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() }
  });

  if (!admin) {
    throw new AppError('Invalid or expired password reset token', 400, 'INVALID_RESET_TOKEN');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  admin.passwordHash = passwordHash;
  admin.passwordChangedAt = new Date();
  admin.resetToken = '';
  admin.resetTokenExpiry = null;
  await admin.save();

  try {
    await sendPasswordChangedEmail(admin.email);
  } catch (err) {
    console.error('Failed to send password changed email:', err);
  }

  await logAuthEvent('PASSWORD_RESET', admin.email, 'SUCCESS', 'Password changed', null, admin._id.toString());

  return { message: 'Password reset successfully' };
}

async function changePassword(adminId, currentPassword, newPassword, ipAddress) {
  const admin = await Admin.findById(adminId);
  
  if (!admin) {
    throw new AppError('Admin not found', 404, 'ADMIN_NOT_FOUND');
  }

  const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!isMatch) {
    await logAuthEvent('PASSWORD_CHANGED', admin.email, 'FAILED', 'Invalid current password', ipAddress, adminId);
    throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  admin.passwordHash = passwordHash;
  admin.passwordChangedAt = new Date();
  await admin.save();

  try {
    await sendPasswordChangedEmail(admin.email);
  } catch (err) {
    console.error('Failed to send password changed email:', err);
  }

  await logAuthEvent('PASSWORD_CHANGED', admin.email, 'SUCCESS', null, ipAddress, adminId);

  return { message: 'Password changed successfully' };
}

async function logAuthEvent(action, email, status = 'SUCCESS', reason = null, ipAddress = null, adminId = null) {
  try {
    await AuthLog.create({
      adminId,
      email,
      action,
      status,
      reason,
      ipAddress,
      userAgent: null
    });
  } catch (err) {
    console.error('Failed to log auth event:', err);
  }
}

module.exports = {
  registerAdmin,
  verifyAdminEmail,
  resendVerificationEmail,
  loginAdmin,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  changePassword,
  logAuthEvent
};
