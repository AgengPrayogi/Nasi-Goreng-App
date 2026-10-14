const Joi = require('joi');

const createReservationSchema = Joi.object({
  customerName: Joi.string().trim().min(1).max(100).required(),
  customerPhone: Joi.string().trim().min(6).max(30).required(),
  partySize: Joi.number().integer().min(1).max(30).required(),
  startAt: Joi.date().iso().greater('now').custom((value, helpers) => {
    if (value.getUTCMinutes() % 15 !== 0 || value.getUTCSeconds() !== 0 || value.getUTCMilliseconds() !== 0) {
      return helpers.error('date.slot');
    }
    return value;
  }).messages({ 'date.slot': 'Reservation time must use a 15-minute interval' }).required(),
  durationMinutes: Joi.number().integer().min(30).max(240).multiple(15).default(90),
  notes: Joi.string().trim().max(500).allow('').default(''),
  whatsappConsent: Joi.object({
    utility: Joi.boolean().default(false),
    marketing: Joi.boolean().default(false)
  }).default({})
});

const availabilityQuerySchema = Joi.object({
  startAt: Joi.date().iso().greater('now').custom((value, helpers) => {
    if (value.getUTCMinutes() % 15 !== 0 || value.getUTCSeconds() !== 0 || value.getUTCMilliseconds() !== 0) {
      return helpers.error('date.slot');
    }
    return value;
  }).messages({ 'date.slot': 'Reservation time must use a 15-minute interval' }).required(),
  partySize: Joi.number().integer().min(1).max(30).required(),
  durationMinutes: Joi.number().integer().min(30).max(240).multiple(15).default(90)
});

const listReservationsQuerySchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  status: Joi.string().valid('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'rejected', 'no_show').optional()
}).and('from', 'to');

const trackReservationParamsSchema = Joi.object({
  reservationCode: Joi.string().trim().uppercase().pattern(/^RSV-[A-F0-9]{32}$/).required()
});

const trackReservationQuerySchema = Joi.object({
  customerPhone: Joi.string().trim().min(6).max(30).required()
});

const cancelReservationSchema = Joi.object({
  customerPhone: Joi.string().trim().min(6).max(30).required()
});

const updateReservationStatusSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'checked_in', 'completed', 'cancelled', 'rejected', 'no_show').required(),
  tableId: Joi.string().hex().length(24).optional(),
  note: Joi.string().trim().max(500).allow('').default('')
});

module.exports = {
  createReservationSchema,
  availabilityQuerySchema,
  listReservationsQuerySchema,
  trackReservationParamsSchema,
  trackReservationQuerySchema,
  cancelReservationSchema,
  updateReservationStatusSchema
};