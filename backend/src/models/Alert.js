const mongoose = require('mongoose');

const AlertConfigSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['low_stock', 'overstock', 'sales_spike', 'sales_drop', 'high_wait_time',
           'reconciliation_discrepancy', 'budget_variance', 'payment_failure',
           'staff_performance', 'expiry_approaching', 'dead_stock']
  },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  thresholds: {
    warning: { type: mongoose.Schema.Types.Mixed, default: null },
    critical: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  channels: {
    dashboard: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  },
  frequency: {
    type: String,
    enum: ['realtime', 'hourly', 'daily', 'weekly'],
    default: 'realtime'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: false }
}, { timestamps: true });

const AlertInstanceSchema = new mongoose.Schema({
  configId: { type: mongoose.Schema.Types.ObjectId, ref: 'AlertConfig', required: true },
  type: { type: String, required: true },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: false },
  acknowledgedAt: { type: Date, required: false },
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date, required: false }
}, { timestamps: true });

AlertConfigSchema.index({ type: 1, enabled: 1 });
AlertConfigSchema.index({ enabled: 1 });
AlertInstanceSchema.index({ createdAt: -1 });
AlertInstanceSchema.index({ type: 1, createdAt: -1 });
AlertInstanceSchema.index({ acknowledged: 1, resolved: 1 });
AlertInstanceSchema.index({ severity: 1, resolved: 1 });

const AlertConfig = mongoose.model('AlertConfig', AlertConfigSchema);
const Alert = mongoose.model('Alert', AlertInstanceSchema);

module.exports = { AlertConfig, Alert };