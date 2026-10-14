const promotionService = require('../services/promotionService');

async function activeHandler(req, res, next) {
  try { res.json({ data: await promotionService.getActivePromotions() }); } catch (err) { next(err); }
}
async function validateHandler(req, res, next) {
  try { res.json({ data: await promotionService.validatePromoCode(req.params.code) }); } catch (err) { next(err); }
}
async function createHandler(req, res, next) {
  try { res.status(201).json({ data: await promotionService.createPromotion(req.body) }); } catch (err) { next(err); }
}
module.exports = { activeHandler, validateHandler, createHandler };