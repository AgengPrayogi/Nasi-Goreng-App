const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema(
  {
    email: { 
      type: String, 
      required: true, 
      trim: true, 
      lowercase: true, 
      unique: true 
    },
    passwordHash: { 
      type: String, 
      required: true 
    },
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    phone: { 
      type: String, 
      default: '', 
      trim: true 
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'cashier', 'chef', 'waiter'],
      default: 'waiter',
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    joinDate: { 
      type: Date, 
      default: Date.now 
    },
    lastLoginAt: { 
      type: Date 
    },
    lastLoginIp: { 
      type: String, 
      default: '' 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  { timestamps: true }
);

// Indexes for common queries
StaffSchema.index({ email: 1 });
StaffSchema.index({ role: 1, status: 1 });
StaffSchema.index({ status: 1 });
StaffSchema.index({ lastLoginAt: -1 });

module.exports = mongoose.model('Staff', StaffSchema);
