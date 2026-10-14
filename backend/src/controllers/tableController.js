const tableService = require('../services/tableService');

async function listTablesHandler(req, res, next) {
  try { res.json({ data: await tableService.listTables() }); } catch (err) { next(err); }
}
async function listAvailableTablesHandler(req, res, next) {
  try { res.json({ data: await tableService.listAvailableTables() }); } catch (err) { next(err); }
}
async function createTableHandler(req, res, next) {
  try { res.status(201).json({ data: await tableService.createTable(req.body) }); } catch (err) { next(err); }
}
async function updateTableHandler(req, res, next) {
  try { res.json({ data: await tableService.updateTable(req.params.id, req.body) }); } catch (err) { next(err); }
}
async function tableOrdersHandler(req, res, next) {
  try { res.json({ data: await tableService.getTableOrders(req.params.id) }); } catch (err) { next(err); }
}
async function releaseTableHandler(req, res, next) {
  try { res.json({ data: await tableService.releaseTable(req.params.id) }); } catch (err) { next(err); }
}
module.exports = { listTablesHandler, listAvailableTablesHandler, createTableHandler, updateTableHandler, tableOrdersHandler, releaseTableHandler };
