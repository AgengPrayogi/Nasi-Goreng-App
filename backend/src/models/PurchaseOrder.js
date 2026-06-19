const mongoose = require('mongoose');

const PurchaseOrderItemSchema = new mongoose.Schema(
  {
    ingredientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      default: 'kg',
      trim: true
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const PurchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true
    },
    items: {
      type: [PurchaseOrderItemSchema],
      default: []
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'received', 'cancelled'],
      default: 'pending'
    },
    totalCost: {
      type: Number,
      default: 0,
      min: 0
    },
    orderDate: {
      type: Date,
      default: Date.now
    },
    expectedDate: {
      type: Date,
      required: false
    },
    receivedDate: {
      type: Date,
      required: false
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: false
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  { timestamps: true }
);

// Auto-generate PO number if not provided
PurchaseOrderSchema.pre('save', async function(next) {
  if (!this.poNumber) {
    // Generate PO number: PO-YYYYMMDD-XXXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const lastPO = await mongoose.model('PurchaseOrder').findOne({}).sort({ createdAt: -1 });
    const lastNum = lastPO && lastPO.poNumber ? parseInt(lastPO.poNumber.split('-')[2]) || 0 : 0;
    const nextNum = String(lastNum + 1).padStart(5, '0');
    this.poNumber = `PO-${dateStr}-${nextNum}`;
  }
  next();
});

// Indexes for common queries
PurchaseOrderSchema.index({ supplierId: 1, status: 1 });
PurchaseOrderSchema.index({ status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ poNumber: 1 });
PurchaseOrderSchema.index({ orderDate: -1 });
PurchaseOrderSchema.index({ expectedDate: 1 });

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
