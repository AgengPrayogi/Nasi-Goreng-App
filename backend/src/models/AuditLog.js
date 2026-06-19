const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  adminName: { type: String, required: true, trim: true },
  action: { type: String, enum: ['create','update','delete','confirm','cancel','complete','payment','kitchen','login','logout','bulk_action','stock_movement','menu_change','ingredient_change','finance_change','other'], required: true },
  resource: { type: String, required: true, trim: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: false },
  description: { type: String, required: true, trim: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: '', trim: true },
  userAgent: { type: String, default: '', trim: true }
}, { timestamps: true });

AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
