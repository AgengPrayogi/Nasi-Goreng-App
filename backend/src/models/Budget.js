const mongoose = require('mongoose');

const BudgetItemSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['revenue', 'cost_of_goods', 'labor', 'operational', 'marketing',
           'utilities', 'rent', 'maintenance', 'other']
  },
  name: { type: String, required: true, trim: true },
  budgetedAmount: { type: Number, required: true, min: 0 },
  actualAmount: { type: Number, default: 0, min: 0 },
  notes: { type: String, default: '' }
}, { _id: false });

const BudgetSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  period: {
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 }
  },
  type: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  items: { type: [BudgetItemSchema], default: [] },
  totalBudgeted: { type: Number, default: 0, min: 0 },
  totalActual: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

BudgetSchema.index({ 'period.year': 1, 'period.month': 1 });
BudgetSchema.index({ status: 1 });
BudgetSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Budget', BudgetSchema);