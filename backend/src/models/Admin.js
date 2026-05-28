const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: '' },
    verificationTokenExpiry: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
    resetToken: { type: String, default: '' },
    resetTokenExpiry: { type: Date },
    passwordChangedAt: { type: Date },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String }
  },
  { timestamps: true }
);

// Indexes for common queries
AdminSchema.index({ isActive: 1 });
AdminSchema.index({ isVerified: 1 });
AdminSchema.index({ verificationToken: 1 });
AdminSchema.index({ resetToken: 1 });

module.exports = mongoose.model('Admin', AdminSchema);
