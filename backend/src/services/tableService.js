const Table = require('../models/Table');
const Order = require('../models/Order');
const { AppError, BusinessError } = require('../errors/AppError');
const { getWalkInUnavailableTableIds } = require('./reservationService');

async function listTables() {
  return Table.find({ isActive: true }).populate('activeOrderId', 'orderCode status totalAmount customerName').sort({ area: 1, number: 1 }).lean();
}
async function listAvailableTables() {
  const tables = await Table.find({ isActive: true, status: 'available' }).select('number area capacity').sort({ area: 1, number: 1 }).lean();
  const unavailableIds = await getWalkInUnavailableTableIds(tables.map((table) => table._id));
  return tables.filter((table) => !unavailableIds.has(table._id.toString()));
}

async function createTable(data) {
  return Table.create({ number: data.number, area: data.area || 'indoor', capacity: data.capacity, notes: data.notes || '' });
}

async function updateTable(id, data) {
  const table = await Table.findById(id);
  if (!table) throw new AppError('Table not found', 404, 'TABLE_NOT_FOUND');
  if (table.status === 'occupied' && data.status === 'available') {
    throw new BusinessError('Occupied table must be closed from its active order', 'TABLE_ORDER_ACTIVE');
  }
  Object.assign(table, data);
  await table.save();
  return table;
}

async function getTableOrders(id) {
  const table = await Table.findById(id).lean();
  if (!table) throw new AppError('Table not found', 404, 'TABLE_NOT_FOUND');
  return Order.find({ tableId: id }).sort({ createdAt: -1 }).limit(100).lean();
}

async function releaseTable(id) {
  const table = await Table.findById(id);
  if (!table) throw new AppError('Table not found', 404, 'TABLE_NOT_FOUND');
  if (table.activeOrderId) throw new BusinessError('Complete the active order before releasing the table', 'TABLE_ORDER_ACTIVE');
  table.status = 'available';
  await table.save();
  return table;
}

module.exports = { listTables, listAvailableTables, createTable, updateTable, getTableOrders, releaseTable };
