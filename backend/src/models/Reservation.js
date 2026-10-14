const mongoose = require('mongoose');

const RESERVATION_STATUSES = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'rejected', 'no_show'];

const ReservationHistorySchema = new mongoose.Schema({
  status: { type: String, enum: RESERVATION_STATUSES, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId },
  actorType: { type: String, enum: ['admin', 'staff', 'system'], default: 'system' },
  note: { type: String, default: '', trim: true },
  at: { type: Date, default: Date.now }
}, { _id: false });

const ReservationSchema = new mongoose.Schema({
  reservationCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  customerName: { type: String, required: true, trim: true, maxlength: 100 },
  customerPhone: { type: String, required: true, trim: true, maxlength: 30 },
  partySize: { type: Number, required: true, min: 1, max: 30 },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, required: true },
  durationMinutes: { type: Number, required: true, min: 30, max: 240, default: 90 },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false, index: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  status: { type: String, enum: RESERVATION_STATUSES, default: 'pending', index: true },
  notes: { type: String, default: '', trim: true, maxlength: 500 },
  slotLocks: { type: [String], select: false },
  statusHistory: { type: [ReservationHistorySchema], default: [] }
}, { timestamps: true });

ReservationSchema.index({ startAt: 1, status: 1 });
ReservationSchema.index({ customerPhone: 1, createdAt: -1 });
ReservationSchema.index({ slotLocks: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Reservation', ReservationSchema);