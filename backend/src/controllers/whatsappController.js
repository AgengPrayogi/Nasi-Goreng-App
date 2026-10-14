const whatsappService = require('../services/whatsappService');
const whatsappAutomationService = require('../services/whatsappAutomationService');
const { AppError } = require('../errors/AppError');
const crypto = require('crypto');

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function queueWhatsAppMessageHandler(req, res, next) {
  try {
    const result = await whatsappService.queueWhatsAppMessage(req.body);
    res.status(202).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function queueWhatsAppAutomationMessageHandler(req, res, next) {
  return queueWhatsAppMessageHandler(req, res, next);
}

async function listWhatsAppMessagesHandler(req, res, next) {
  try {
    res.json({ success: true, data: await whatsappService.listWhatsAppMessages(req.query) });
  } catch (err) {
    next(err);
  }
}

async function listWhatsAppAutomationEventsHandler(req, res, next) {
  try {
    res.json({ success: true, data: await whatsappAutomationService.listAutomationEvents(req.query) });
  } catch (err) {
    next(err);
  }
}

async function retryWhatsAppAutomationEventHandler(req, res, next) {
  try {
    res.json({ success: true, data: await whatsappAutomationService.retryAutomationEvent(req.params.id) });
  } catch (err) {
    next(err);
  }
}

function verifyWebhookHandler(req, res, next) {
  try {
    const config = whatsappService.getMetaWebhookConfig();
    if (!config) throw new AppError('WhatsApp webhook is not configured', 503, 'WHATSAPP_NOT_CONFIGURED');
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode !== 'subscribe' || !safeEqual(token, config.webhookVerifyToken) || typeof challenge !== 'string') {
      throw new AppError('Meta webhook verification failed', 403, 'WHATSAPP_WEBHOOK_VERIFICATION_FAILED');
    }
    res.status(200).type('text/plain').send(challenge);
  } catch (err) {
    next(err);
  }
}

async function receiveWebhookHandler(req, res, next) {
  try {
    const config = whatsappService.getMetaWebhookConfig();
    if (!config) throw new AppError('WhatsApp webhook is not configured', 503, 'WHATSAPP_NOT_CONFIGURED');
    const signature = req.get('X-Hub-Signature-256') || '';
    const match = /^sha256=([a-f0-9]{64})$/i.exec(signature);
    if (!match || !Buffer.isBuffer(req.rawBody)) {
      throw new AppError('Invalid Meta webhook signature', 401, 'INVALID_WHATSAPP_SIGNATURE');
    }
    const expected = crypto.createHmac('sha256', config.appSecret).update(req.rawBody).digest('hex');
    if (!safeEqual(match[1].toLowerCase(), expected)) {
      throw new AppError('Invalid Meta webhook signature', 401, 'INVALID_WHATSAPP_SIGNATURE');
    }

    const result = await whatsappService.receiveMetaWebhook(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  queueWhatsAppMessageHandler,
  queueWhatsAppAutomationMessageHandler,
  listWhatsAppMessagesHandler,
  listWhatsAppAutomationEventsHandler,
  retryWhatsAppAutomationEventHandler,
  verifyWebhookHandler,
  receiveWebhookHandler
};
