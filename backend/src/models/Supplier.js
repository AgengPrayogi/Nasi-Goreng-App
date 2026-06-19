const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    contact: {
      type: String,
      default: '',
      trim: true
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    address: {
      type: String,
      default: '',
      trim: true
    },
    leadTime: {
      type: Number,
      default: 1,
      description: 'Days to deliver'
    },
    paymentTerms: {
      type: String,
      default: '',
      trim: true,
      description: 'e.g., NET30, COD'
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Indexes for common queries
SupplierSchema.index({ name: 1 });
SupplierSchema.index({ isActive: 1 });
SupplierSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Supplier', SupplierSchema);
