const marketplaceService = require('../services/marketplaceService');

async function webhookHandler(req, res, next) {
  try {
    const platform = req.params.platform;
    const data = await marketplaceService.receiveWebhook(platform, req.body);
    res.status(202).json({ success: true, data });
  } catch (err) { next(err); }
}
async function listOrdersHandler(req, res, next) {
  try { res.json({ data: await marketplaceService.listOrders() }); } catch (err) { next(err); }
}
async function listMappingsHandler(req, res, next) {
  try { res.json({ data: await marketplaceService.listMappings(req.query.platform) }); } catch (err) { next(err); }
}
async function createMappingHandler(req, res, next) {
  try { res.status(201).json({ data: await marketplaceService.createMapping(req.body) }); } catch (err) { next(err); }
}
async function updateMappingHandler(req, res, next) {
  try { res.json({ data: await marketplaceService.updateMapping(req.params.id, req.body) }); } catch (err) { next(err); }
}
module.exports = { webhookHandler, listOrdersHandler, listMappingsHandler, createMappingHandler, updateMappingHandler };
