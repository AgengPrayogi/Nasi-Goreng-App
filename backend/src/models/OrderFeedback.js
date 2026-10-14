const mongoose = require('mongoose');

const OrderFeedbackSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
  orderCode: { type: String, required: true, trim: true, uppercase: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, default: '', maxlength: 1000 }
}, { timestamps: true });

module.exports = mongoose.model('OrderFeedback', OrderFeedbackSchema);
