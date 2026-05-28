const mongoose = require('mongoose');

const AuthLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    email: { type: String },
    action: { type: String, enum: ['REGISTER', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'EMAIL_VERIFIED', 'LOGOUT'], required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
    reason: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

AuthLogSchema.index({ adminId: 1, createdAt: -1 });
AuthLogSchema.index({ email: 1, createdAt: -1 });
AuthLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuthLog', AuthLogSchema);
