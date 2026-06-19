const mongoose = require('mongoose');

const SavedReportSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  reportType: {
    type: String,
    required: true,
    enum: ['sales', 'menu_performance', 'customer_analysis', 'staff_performance',
           'inventory', 'financial', 'supplier', 'profitability', 'custom']
  },
  filters: {
    dateFrom: { type: Date, default: null },
    dateTo: { type: Date, default: null },
    menuIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Menu' }],
    categoryId: { type: String, default: null },
    staffIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }],
    customerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
    paymentMethods: [{ type: String }],
    supplierIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' }],
    customFilters: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  grouping: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'by_category', 'by_product', 'by_staff'],
    default: 'daily'
  },
  schedule: {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    recipients: [{ type: String, trim: true }],
    lastSent: { type: Date, default: null },
    nextSend: { type: Date, default: null }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  isFavorite: { type: Boolean, default: false }
}, { timestamps: true });

SavedReportSchema.index({ createdBy: 1 });
SavedReportSchema.index({ reportType: 1 });
SavedReportSchema.index({ isFavorite: 1 });

module.exports = mongoose.model('SavedReport', SavedReportSchema);