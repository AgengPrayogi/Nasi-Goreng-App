const WhatsAppAutomationEvent = require('../models/WhatsAppAutomationEvent');
const { AppError } = require('../errors/AppError');

function isAutomationWebhookConfigured() {
  return Boolean(process.env.N8N_WHATSAPP_WEBHOOK_URL && process.env.N8N_WHATSAPP_WEBHOOK_TOKEN);
}

async function enqueueAutomationEvent({ eventId, eventType, payload }) {
  if (!isAutomationWebhookConfigured()) return null;
  try {
    return await WhatsAppAutomationEvent.findOneAndUpdate(
      { eventId },
      { $setOnInsert: { eventId, eventType, payload } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  } catch (error) {
    if (error.code !== 11000) throw error;
    return WhatsAppAutomationEvent.findOne({ eventId }).lean();
  }
}

async function listAutomationEvents({ status, page = 1, limit = 50 } = {}) {
  const query = {};
  if (status) query.status = status;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const [events, total] = await Promise.all([
    WhatsAppAutomationEvent.find(query)
      .select('eventId eventType status attempts nextAttemptAt deliveredAt lastError createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    WhatsAppAutomationEvent.countDocuments(query)
  ]);
  return { events, pagination: { page: safePage, limit: safeLimit, total } };
}

async function retryAutomationEvent(id) {
  const event = await WhatsAppAutomationEvent.findOneAndUpdate(
    { _id: id, status: 'failed' },
    { $set: { status: 'queued', attempts: 0, nextAttemptAt: new Date(), lockedAt: null, lastError: '' } },
    { new: true }
  ).select('eventId eventType status attempts nextAttemptAt').lean();
  if (!event) throw new AppError('Failed n8n event not found', 404, 'WHATSAPP_AUTOMATION_EVENT_NOT_FOUND');
  return event;
}

module.exports = { isAutomationWebhookConfigured, enqueueAutomationEvent, listAutomationEvents, retryAutomationEvent };
