const express = require('express');
const {
  registerAdminHandler,
  verifyEmailHandler,
  resendVerificationEmailHandler,
  loginHandler,
  refreshTokenHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler
} = require('../controllers/authController');
const { validate } = require('../middlewares/validation');
const {
  registerAdminSchema,
  loginSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema
} = require('../validators/authValidator');
const { authenticate } = require('../middlewares/auth');
const {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  resendEmailLimiter
} = require('../middlewares/rateLimiter');

const router = express.Router();

// Public auth endpoints
router.post('/register-admin', registerLimiter, validate(registerAdminSchema), registerAdminHandler);
router.get('/verify-email/:token', verifyEmailHandler);
router.post('/resend-verification', resendEmailLimiter, validate(resendVerificationSchema), resendVerificationEmailHandler);
router.post('/login', loginLimiter, validate(loginSchema), loginHandler);
router.post('/refresh', validate(refreshTokenSchema), refreshTokenHandler);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPasswordHandler);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPasswordHandler);

// Protected endpoints (require authentication)
router.patch('/change-password', authenticate, validate(changePasswordSchema), changePasswordHandler);

module.exports = router;
