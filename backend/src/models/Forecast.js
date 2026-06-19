const mongoose = require('mongoose');

const ForecastSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['demand', 'revenue', 'inventory', 'customer_churn']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    default: null
  },
  targetName: { type: String, default: '' },
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    granularity: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    }
  },
  data: [{
    date: { type: Date, required: true },
    predictedValue: { type: Number, required: true },
    lowerBound: { type: Number, default: null },
    upperBound: { type: Number, default: null },
    confidenceScore: { type: Number, default: 0, min: 0, max: 100 }
  }],
  metadata: {
    modelVersion: { type: String, default: 'v1' },
    accuracy: { type: Number, default: 0 },
    trainingDataRange: {
      from: { type: Date },
      to: { type: Date }
    },
    features: [{ type: String }],
    notes: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['training', 'ready', 'expired', 'failed'],
    default: 'ready'
  },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: false }
}, { timestamps: true });

ForecastSchema.index({ type: 1, status: 1 });
ForecastSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
ForecastSchema.index({ targetId: 1, type: 1 });

module.exports = mongoose.model('Forecast', ForecastSchema);