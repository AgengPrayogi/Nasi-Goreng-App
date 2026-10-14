const Customer = require('../models/Customer');
const CustomerSupportTicket = require('../models/CustomerSupportTicket');
const { AppError } = require('../errors/AppError');

async function listTickets(query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.customerId) filter.customerId = query.customerId;
  return CustomerSupportTicket.find(filter)
    .populate('customerId', 'name phone audienceSegment tier')
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
}

async function createTicket(data, adminId) {
  const customer = await Customer.exists({ _id: data.customerId, isActive: true });
  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  return CustomerSupportTicket.create({ ...data, createdBy: adminId });
}

async function updateTicket(id, data) {
  const updates = { ...data };
  if (data.status === 'resolved' || data.status === 'closed') updates.resolvedAt = new Date();
  const ticket = await CustomerSupportTicket.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!ticket) throw new AppError('Support ticket not found', 404, 'SUPPORT_TICKET_NOT_FOUND');
  return ticket;
}

module.exports = { listTickets, createTicket, updateTicket };