const mongoose = require('mongoose');

const CustomerSupportTicketSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  subject: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, enum: ['order', 'payment', 'delivery', 'product', 'complaint', 'feedback', 'other'], default: 'other' },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open', index: true },
  resolution: { type: String, default: '', trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  resolvedAt: { type: Date }
}, { timestamps: true });

CustomerSupportTicketSchema.index({ status: 1, priority: 1, updatedAt: -1 });

module.exports = mongoose.model('CustomerSupportTicket', CustomerSupportTicketSchema);