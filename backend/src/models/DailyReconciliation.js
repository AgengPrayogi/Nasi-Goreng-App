const mongoose = require('mongoose');

const DailyReconciliationSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentBreakdown: {
      cash: {
        type: Number,
        default: 0,
        min: 0
      },
      transfer: {
        type: Number,
        default: 0,
        min: 0
      },
      qris: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    discountApplied: {
      type: Number,
      default: 0,
      min: 0
    },
    expectedTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    actualTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    discrepancy: {
      type: Number,
      default: 0,
      description: 'actualTotal - expectedTotal'
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'review', 'finalized'],
      default: 'open'
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: false
    },
    closedAt: {
      type: Date,
      required: false
    }
  },
  { timestamps: true }
);

// Indexes for common queries
DailyReconciliationSchema.index({ date: -1 });
DailyReconciliationSchema.index({ status: 1 });
DailyReconciliationSchema.index({ closedAt: -1 });

module.exports = mongoose.model('DailyReconciliation', DailyReconciliationSchema);
