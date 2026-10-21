const mongoose = require('mongoose');

const OpeningSessionSchema = new mongoose.Schema({
  open: { type: String, required: true },
  close: { type: String, required: true },
}, { _id: false });

const StoreSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'main' },
  openingHours: {
    type: [OpeningSessionSchema],
    default: [{ open: '11:00', close: '14:00' }, { open: '17:00', close: '24:00' }],
  },
  location: { type: String, default: 'JL Otista Raya No. 131 A, Jatinegara, Jakarta Timur' },
  manualStatus: { type: String, enum: ['auto', 'open', 'closed'], default: 'auto' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true });

module.exports = mongoose.model('StoreSettings', StoreSettingsSchema);
