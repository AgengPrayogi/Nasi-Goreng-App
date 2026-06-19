const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
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
    address: {
      type: String,
      default: '',
      trim: true
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold'],
      default: 'bronze'
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    totalQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    lastOrderDate: {
      type: Date,
      required: false
    },
    preferredItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu'
      }
    ],
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

// Auto-calculate tier before saving
CustomerSchema.pre('save', function(next) {
  if (this.totalOrders >= 20) {
    this.tier = 'gold';
  } else if (this.totalOrders >= 5) {
    this.tier = 'silver';
  } else {
    this.tier = 'bronze';
  }
  next();
});

// Indexes for common queries
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ tier: 1 });
CustomerSchema.index({ totalSpent: -1 });
CustomerSchema.index({ lastOrderDate: -1 });
CustomerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Customer', CustomerSchema);
