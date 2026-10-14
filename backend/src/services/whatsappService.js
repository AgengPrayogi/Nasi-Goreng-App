const crypto = require('crypto');
const Customer = require('../models/Customer');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppWebhookEvent = require('../models/WhatsAppWebhookEvent');
const { enqueueAutomationEvent } = require('./whatsappAutomationService');
const { AppError, BusinessError } = require('../errors/AppError');
const { normalizeWhatsAppPhone, optCustomerOutByPhone } = require('./whatsappConsentService');

const TEMPLATES = {
  reservation_pending: { category: 'utility', parameters: ['customer_name', 'reservation_code', 'reservation_time'] },
  reservation_confirmed: { category: 'utility', parameters: ['customer_name', 'reservation_code', 'reservation_time', 'table_number'] },
  reservation_cancelled: { category: 'utility', parameters: ['customer_name', 'reservation_code'] },
  order_confirmed: { category: 'utility', parameters: ['customer_name', 'order_code'] },
  order_ready: { category: 'utility', parameters: ['customer_name', 'order_code'] },
  feedback_request: { category: 'utility', parameters: ['customer_name', 'order_code', 'feedback_url'] },
  menu_recommendation: { category: 'marketing', parameters: ['customer_name', 'menu_name', 'menu_url'] }
};

function getMetaConfig() {
  const config = {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION
  };
  return Object.values(config).every(Boolean) ? config : null;
}

function getMetaWebhookConfig() {
  const config = {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  };
  return Object.values(config).every(Boolean) ? config : null;
}

function isProviderConfigured() {
  return process.env.WHATSAPP_ENABLED === 'true' && Boolean(getMetaConfig());
}

function createIdempotencyKey(source, sourceId, templateKey) {
  return crypto.createHash('sha256').update(`${source}:${sourceId}:${templateKey}`).digest('hex');
}

function validateTemplateVariables(templateKey, variables = {}) {
  const template = TEMPLATES[templateKey];
  if (!template) throw new BusinessError('WhatsApp template is not allowlisted', 'WHATSAPP_TEMPLATE_NOT_ALLOWED');

  const parameters = template.parameters.map((key) => {
    const value = variables[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new BusinessError(`Missing WhatsApp template parameter: ${key}`, 'WHATSAPP_TEMPLATE_PARAMETER_REQUIRED');
    }
    const text = String(value).trim();
    if (text.length > 1024) {
      throw new BusinessError(`WhatsApp template parameter is too long: ${key}`, 'WHATSAPP_TEMPLATE_PARAMETER_TOO_LONG');
    }
    return { type: 'text', text };
  });

  return { template, parameters };
}

async function enqueueWhatsAppMessage({ customerId, templateKey, variables = {}, source, sourceId }) {
  const { template } = validateTemplateVariables(templateKey, variables);
  if (!source || !sourceId) {
    throw new BusinessError('Message source and sourceId are required', 'WHATSAPP_SOURCE_REQUIRED');
  }

  const customer = await Customer.findById(customerId);
  if (!customer || !customer.isActive) {
    throw new AppError('Customer not found or inactive', 404, 'CUSTOMER_NOT_FOUND');
  }

  if (customer.whatsappConsent?.[template.category]?.enabled !== true) {
    throw new BusinessError('Customer has not opted in to this WhatsApp message category', 'OPT_IN_REQUIRED');
  }

  const idempotencyKey = createIdempotencyKey(source, sourceId, templateKey);
  const consent = customer.whatsappConsent[template.category];
  try {
    return await WhatsAppMessage.findOneAndUpdate(
      { idempotencyKey },
      {
        $setOnInsert: {
          customer: customer._id,
          recipient: normalizeWhatsAppPhone(customer.phone),
          category: template.category,
          templateName: templateKey,
          language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'id',
          variables,
          source,
          sourceId: String(sourceId),
          idempotencyKey,
          consentSnapshot: {
            source: consent.source,
            textVersion: consent.textVersion,
            consentedAt: consent.consentedAt
          }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  } catch (error) {
    if (error.code !== 11000) throw error;
    return WhatsAppMessage.findOne({ idempotencyKey }).lean();
  }
}

async function queueWhatsAppMessage(payload) {
  const message = await enqueueWhatsAppMessage(payload);
  return {
    id: message._id,
    provider: message.provider,
    status: message.status,
    category: message.category,
    template: message.templateName
  };
}

async function listWhatsAppMessages({ status, page = 1, limit = 50 } = {}) {
  const query = {};
  if (status) query.status = status;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const [messages, total] = await Promise.all([
    WhatsAppMessage.find(query)
      .select('-recipient -variables -consentSnapshot')
      .populate('customer', 'name')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    WhatsAppMessage.countDocuments(query)
  ]);
  return { messages, pagination: { page: safePage, limit: safeLimit, total } };
}

async function updateMessageStatus({ wamid, status, timestamp, errorCode = '', errorMessage = '' }) {
  const allowed = ['sent', 'delivered', 'read', 'failed'];
  if (!allowed.includes(status)) return null;

  const date = timestamp ? new Date(Number(timestamp) * 1000) : new Date();
  const current = await WhatsAppMessage.findOne({ wamid });
  if (!current) return null;

  const ranks = { queued: 0, sending: 1, sent: 2, delivered: 3, read: 4, failed: 5, unknown: 0 };
  if (status !== 'failed' && current.status !== 'failed' && ranks[status] < ranks[current.status]) return current;

  const updates = { status };
  if (status === 'sent') updates.acceptedAt = current.acceptedAt || date;
  if (status === 'delivered') updates.deliveredAt = date;
  if (status === 'read') updates.readAt = date;
  if (status === 'failed') {
    updates.failedAt = date;
    updates.lastErrorCode = String(errorCode).slice(0, 100);
    updates.lastError = String(errorMessage).slice(0, 500);
  }
  return WhatsAppMessage.findByIdAndUpdate(current._id, { $set: updates }, { new: true });
}

async function receiveMetaWebhook(payload) {
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) return { ignored: true };
  const results = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id;
      if (phoneNumberId && phoneNumberId !== process.env.WHATSAPP_PHONE_NUMBER_ID) {
        throw new AppError('Webhook phone number ID does not match configured account', 403, 'WHATSAPP_PHONE_NUMBER_MISMATCH');
      }

      for (const status of value.statuses || []) {
        const eventKey = `${status.id}:status:${status.status}:${status.timestamp || ''}`;
        const event = await createWebhookEvent(eventKey, 'status');
        if (!event.created) continue;
        try {
          await updateMessageStatus({
            wamid: status.id,
            status: status.status,
            timestamp: status.timestamp,
            errorCode: status.errors?.[0]?.code,
            errorMessage: status.errors?.[0]?.title || status.errors?.[0]?.message
          });
          const eventId = `${status.id}:status:${status.status}:${status.timestamp || ''}`;
          await enqueueAutomationEvent({
            eventId,
            eventType: 'message_status',
            payload: {
              eventId,
              eventType: 'message_status',
              messageId: status.id,
              status: status.status,
              timestamp: status.timestamp || null,
              errors: (status.errors || []).map((error) => ({ code: error.code, title: error.title, message: error.message }))
            }
          });
          await markWebhookEvent(event.document, 'processed');
          results.push({ type: 'status', status: status.status });
        } catch (error) {
          await markWebhookEvent(event.document, 'failed', error.code || 'PROCESSING_ERROR');
          throw error;
        }
      }

      for (const message of value.messages || []) {
        const event = await createWebhookEvent(`${message.id}:inbound`, 'inbound');
        if (!event.created) continue;
        try {
          const text = String(message.text?.body || '').trim().toUpperCase();
          if (['STOP', 'UNSUBSCRIBE', 'BERHENTI'].includes(text)) {
            await optCustomerOutByPhone(message.from);
            await markWebhookEvent(event.document, 'processed', 'OPT_OUT');
            results.push({ type: 'inbound', action: 'opt_out' });
          } else {
            const contact = (value.contacts || []).find((item) => item.wa_id === message.from);
            const eventId = `${message.id}:inbound`;
            await enqueueAutomationEvent({
              eventId,
              eventType: 'inbound_message',
              payload: {
                eventId,
                eventType: 'inbound_message',
                messageId: message.id,
                from: message.from,
                profileName: contact?.profile?.name || '',
                phoneNumberId,
                timestamp: message.timestamp || null,
                messageType: message.type || 'unknown',
                text: message.text?.body || ''
              }
            });
            await markWebhookEvent(event.document, 'processed', 'IGNORED_INBOUND');
            results.push({ type: 'inbound', action: 'received' });
          }
        } catch (error) {
          await markWebhookEvent(event.document, 'failed', error.code || 'PROCESSING_ERROR');
          throw error;
        }
      }
    }
  }
  return { processed: results.length, results };
}

async function createWebhookEvent(eventKey, eventType) {
  try {
    const document = await WhatsAppWebhookEvent.create({ eventKey, eventType, status: 'received' });
    return { created: true, document };
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await WhatsAppWebhookEvent.findOne({ eventKey });
    if (existing.status === 'failed') {
      existing.status = 'received';
      existing.errorCode = '';
      await existing.save();
      return { created: true, document: existing };
    }
    return { created: false, document: existing };
  }
}

async function markWebhookEvent(event, status, errorCode = '') {
  event.status = status;
  event.errorCode = errorCode;
  event.processedAt = status === 'processed' ? new Date() : undefined;
  await event.save();
}

module.exports = {
  TEMPLATES,
  getMetaConfig,
  getMetaWebhookConfig,
  isProviderConfigured,
  validateTemplateVariables,
  enqueueWhatsAppMessage,
  queueWhatsAppMessage,
  listWhatsAppMessages,
  updateMessageStatus,
  receiveMetaWebhook
};
