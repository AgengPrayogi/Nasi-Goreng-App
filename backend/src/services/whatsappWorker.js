const WhatsAppMessage = require('../models/WhatsAppMessage');
const Customer = require('../models/Customer');
const { isProviderConfigured } = require('./whatsappService');
const { sendTemplateMessage } = require('./metaCloudApiClient');
const WhatsAppAutomationEvent = require('../models/WhatsAppAutomationEvent');
const { isAutomationWebhookConfigured } = require('./whatsappAutomationService');

let timer;
let processing = false;
let automationProcessing = false;

function getRetryDelayMs(attempt) {
  const base = Number(process.env.WHATSAPP_RETRY_BASE_MS) || 5000;
  const cap = Number(process.env.WHATSAPP_RETRY_MAX_MS) || 15 * 60 * 1000;
  const exponential = Math.min(cap, base * (2 ** Math.max(0, attempt - 1)));
  return Math.round(exponential * (0.8 + Math.random() * 0.4));
}

async function processAutomationEventBatch(limit = 10) {
  if (!isAutomationWebhookConfigured() || automationProcessing) return 0;
  automationProcessing = true;
  let processed = 0;
  const maxAttempts = Math.max(1, Number(process.env.N8N_WEBHOOK_MAX_ATTEMPTS) || 8);
  const timeoutMs = Math.max(1000, Number(process.env.N8N_WEBHOOK_TIMEOUT_MS) || 10000);
  try {
    for (let index = 0; index < limit; index += 1) {
      const now = new Date();
      const staleLock = new Date(now.getTime() - 5 * 60 * 1000);
      const event = await WhatsAppAutomationEvent.findOneAndUpdate(
        { $or: [
          { status: 'queued', nextAttemptAt: { $lte: now } },
          { status: 'sending', lockedAt: { $lte: staleLock } }
        ] },
        { $set: { status: 'sending', lockedAt: now }, $inc: { attempts: 1 } },
        { new: true, sort: { nextAttemptAt: 1, createdAt: 1 } }
      );
      if (!event) break;

      try {
        const response = await fetch(process.env.N8N_WHATSAPP_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-NGP-Webhook-Token': process.env.N8N_WHATSAPP_WEBHOOK_TOKEN,
            'X-NGP-Event-ID': event.eventId
          },
          body: JSON.stringify(event.payload),
          signal: AbortSignal.timeout(timeoutMs)
        });
        if (!response.ok) {
          const error = new Error(`n8n webhook returned HTTP ${response.status}`);
          error.retryable = response.status === 429 || response.status >= 500;
          throw error;
        }
        await WhatsAppAutomationEvent.updateOne({ _id: event._id, status: 'sending' }, {
          $set: { status: 'delivered', deliveredAt: new Date(), lockedAt: null, lastError: '' }
        });
      } catch (error) {
        const retryable = error.retryable !== false && event.attempts < maxAttempts;
        await WhatsAppAutomationEvent.updateOne({ _id: event._id, status: 'sending' }, {
          $set: {
            status: retryable ? 'queued' : 'failed',
            nextAttemptAt: retryable ? new Date(Date.now() + getRetryDelayMs(event.attempts)) : event.nextAttemptAt,
            lockedAt: null,
            lastError: String(error.message || 'n8n webhook delivery failed').slice(0, 500)
          }
        });
      }
      processed += 1;
    }
  } finally {
    automationProcessing = false;
  }
  return processed;
}

async function processOutboxBatch(limit = 10) {
  if (!isProviderConfigured() || processing) return 0;
  processing = true;
  let processed = 0;
  const maxAttempts = Math.max(1, Number(process.env.WHATSAPP_MAX_ATTEMPTS) || 5);

  try {
    for (let index = 0; index < limit; index += 1) {
      const now = new Date();
      const staleLock = new Date(now.getTime() - 5 * 60 * 1000);
      const message = await WhatsAppMessage.findOneAndUpdate(
        {
          $or: [
            { status: 'queued', nextAttemptAt: { $lte: now } },
            { status: 'sending', lockedAt: { $lte: staleLock } }
          ]
        },
        { $set: { status: 'sending', lockedAt: now }, $inc: { attempts: 1 } },
        { new: true, sort: { nextAttemptAt: 1, createdAt: 1 } }
      );
      if (!message) break;

      const customer = await Customer.findById(message.customer).select('isActive whatsappConsent').lean();
      const consent = customer?.whatsappConsent?.[message.category];
      if (!customer?.isActive || consent?.enabled !== true) {
        await WhatsAppMessage.updateOne({ _id: message._id, status: 'sending' }, {
          $set: {
            status: 'failed',
            failedAt: new Date(),
            lockedAt: null,
            lastErrorCode: 'CONSENT_REVOKED',
            lastError: 'Customer is inactive or no longer opted in'
          }
        });
        processed += 1;
        continue;
      }

      try {
        const { wamid } = await sendTemplateMessage(message);
        await WhatsAppMessage.updateOne({ _id: message._id, status: 'sending' }, {
          $set: { status: 'sent', wamid, acceptedAt: new Date(), lockedAt: null, lastError: '', lastErrorCode: '' }
        });
      } catch (error) {
        const retryable = error.retryable === true && message.attempts < maxAttempts;
        await WhatsAppMessage.updateOne({ _id: message._id, status: 'sending' }, {
          $set: {
            status: retryable ? 'queued' : 'failed',
            nextAttemptAt: retryable ? new Date(Date.now() + getRetryDelayMs(message.attempts)) : message.nextAttemptAt,
            failedAt: retryable ? undefined : new Date(),
            lockedAt: null,
            lastErrorCode: String(error.errorCode || 'WHATSAPP_SEND_FAILED').slice(0, 100),
            lastError: String(error.message || 'Message delivery failed').slice(0, 500)
          }
        });
      }
      processed += 1;
    }
  } finally {
    processing = false;
  }
  return processed;
}

function startWhatsAppWorker() {
  if (timer) return timer;
  const intervalMs = Math.max(1000, Number(process.env.WHATSAPP_WORKER_INTERVAL_MS) || 5000);
  timer = setInterval(() => {
    processOutboxBatch().catch((error) => {
      console.error('WhatsApp outbox worker failed:', error.errorCode || error.name || 'unknown');
    });
    processAutomationEventBatch().catch((error) => {
      console.error('WhatsApp automation event delivery failed:', error.name || 'unknown');
    });
  }, intervalMs);
  timer.unref?.();
  return timer;
}

function stopWhatsAppWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { processOutboxBatch, processAutomationEventBatch, startWhatsAppWorker, stopWhatsAppWorker };
