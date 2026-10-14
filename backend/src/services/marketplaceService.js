const MarketplaceOrder = require('../models/MarketplaceOrder');
const MarketplaceMenuMapping = require('../models/MarketplaceMenuMapping');
const { AppError } = require('../errors/AppError');

async function receiveWebhook(platform, payload) {
  const externalOrderId = String(payload.externalOrderId || payload.orderId || '').trim();
  if (!externalOrderId) throw new AppError('externalOrderId is required', 400, 'EXTERNAL_ORDER_ID_REQUIRED');
  const record = await MarketplaceOrder.findOneAndUpdate(
    { platform, externalOrderId },
    { $set: { rawPayload: payload, status: 'received', receivedAt: new Date(), lastError: '' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { id: record._id, platform, externalOrderId, duplicateSafe: true, status: record.status };
}
async function listOrders() { return MarketplaceOrder.find().sort({ receivedAt: -1 }).limit(100).populate('internalOrderId').lean(); }
async function listMappings(platform) { return MarketplaceMenuMapping.find(platform ? { platform } : {}).populate('internalMenuId', 'name price').lean(); }
async function createMapping(data) { return MarketplaceMenuMapping.create(data); }
async function updateMapping(id, data) {
  const mapping = await MarketplaceMenuMapping.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!mapping) throw new AppError('Marketplace mapping not found', 404, 'MAPPING_NOT_FOUND');
  return mapping;
}
module.exports = { receiveWebhook, listOrders, listMappings, createMapping, updateMapping };
