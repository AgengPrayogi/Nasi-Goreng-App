const { enqueueWhatsAppMessage } = require('./whatsappService');

async function enqueueWhatsAppEvent({ customerId, templateKey, variables, source, sourceId }) {
  if (!customerId) return null;
  try {
    return await enqueueWhatsAppMessage({ customerId, templateKey, variables, source, sourceId });
  } catch (error) {
    console.warn('WhatsApp event was not queued:', error.errorCode || error.code || 'WHATSAPP_QUEUE_FAILED');
    return null;
  }
}

module.exports = { enqueueWhatsAppEvent };