const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  number: { type: String, required: true, trim: true },
  area: { type: String, default: 'indoor', trim: true },
  capacity: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['available', 'occupied', 'reserved', 'cleaning', 'inactive'], default: 'available' },
  activeOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  notes: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

TableSchema.index({ number: 1, area: 1 }, { unique: true });
TableSchema.index({ status: 1, isActive: 1 });

module.exports = mongoose.model('Table', TableSchema);