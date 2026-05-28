const {
  registerAdmin,
  verifyAdminEmail,
  resendVerificationEmail,
  loginAdmin,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  changePassword
} = require('../services/authService');

function getClientIp(req) {
  return req.ip || req.connection.remoteAddress || '0.0.0.0';
}

async function registerAdminHandler(req, res, next) {
  try {
    const admin = await registerAdmin(req.body, getClientIp(req));
    res.status(201).json({
      data: {
        id: admin._id,
        email: admin.email,
        message: 'Registration successful. Please check your email for verification link.',
        verificationTokenExpiry: admin.verificationTokenExpiry
      }
    });
  } catch (err) {
    next(err);
  }
}

async function verifyEmailHandler(req, res, next) {
  try {
    const { token } = req.params;
    const admin = await verifyAdminEmail(token);
    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      data: {
        id: admin._id,
        email: admin.email
      }
    });
  } catch (err) {
    next(err);
  }
}

async function resendVerificationEmailHandler(req, res, next) {
  try {
    const result = await resendVerificationEmail(req.body.email);
    res.json({
      success: true,
      message: 'Verification email sent successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function loginHandler(req, res, next) {
  try {
    const result = await loginAdmin(req.body, getClientIp(req), req.get('user-agent'));
    res.json({
      data: {
        token: result.token,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        admin: {
          id: result.admin._id,
          email: result.admin.email,
          isVerified: result.admin.isVerified
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

async function refreshTokenHandler(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await refreshAccessToken(refreshToken);
    res.json({
      data: {
        token: result.token,
        expiresIn: result.expiresIn
      }
    });
  } catch (err) {
    next(err);
  }
}

async function forgotPasswordHandler(req, res, next) {
  try {
    const result = await requestPasswordReset(req.body.email, getClientIp(req));
    res.json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
}

async function resetPasswordHandler(req, res, next) {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const result = await resetPassword(token, password);
    res.json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
}

async function changePasswordHandler(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await changePassword(req.user.id, currentPassword, newPassword, getClientIp(req));
    res.json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerAdminHandler,
  verifyEmailHandler,
  resendVerificationEmailHandler,
  loginHandler,
  refreshTokenHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler
};
