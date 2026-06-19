const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true
    },
    externalPaymentId: {
      type: String,
      trim: true,
      required: true,
      unique: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    method: {
      type: String,
      enum: ['cash', 'transfer', 'qris_static'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'expired', 'cancelled'],
      default: 'pending'
    },
    paymentReference: { type: String, trim: true, required: false },
    paidAt: { type: Date, required: false },
    expiresAt: { type: Date, required: false }
  },
  { timestamps: true }
);

PaymentSchema.index({ externalPaymentId: 1 });
PaymentSchema.index({ order: 1 });
PaymentSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);