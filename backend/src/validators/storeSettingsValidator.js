const Joi = require('joi');

const storeSettingsSchema = Joi.object({
  openingHours: Joi.array().items(Joi.object({
    open: Joi.string().pattern(/^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/).required(),
    close: Joi.string().pattern(/^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/).required(),
  })).max(4).optional(),
  location: Joi.string().trim().max(300).allow('').optional(),
  manualStatus: Joi.string().valid('auto', 'open', 'closed').optional(),
}).min(1);

module.exports = { storeSettingsSchema };
