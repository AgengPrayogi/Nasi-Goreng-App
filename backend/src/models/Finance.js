const mongoose = require('mongoose');

const FinanceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense'],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'order_payment',
        'restock',
        'operational',
        'salary',
        'utilities',
        'maintenance',
        'marketing',
        'withdraw',
        'other',
      ],
    },
    reference: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

FinanceSchema.index({ type: 1, date: -1 });
FinanceSchema.index({ category: 1 });
FinanceSchema.index({ date: -1 });

module.exports = mongoose.model('Finance', FinanceSchema);