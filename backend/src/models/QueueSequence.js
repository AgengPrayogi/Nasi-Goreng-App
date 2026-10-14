const mongoose = require('mongoose');

const QueueSequenceSchema = new mongoose.Schema({
  queueDate: { type: String, required: true, unique: true },
  value: { type: Number, required: true, min: 0, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('QueueSequence', QueueSequenceSchema);
