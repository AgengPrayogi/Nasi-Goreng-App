const { AppError } = require('../errors/AppError');
const { getMetaConfig, validateTemplateVariables } = require('./whatsappService');

class MetaApiError extends Error {
  constructor(message, { statusCode = 503, errorCode = 'META_API_ERROR', retryable = true } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.retryable = retryable;
  }
}

async function sendTemplateMessage(message) {
  const config = getMetaConfig();
  if (!config) throw new MetaApiError('Meta WhatsApp Cloud API is not fully configured', { errorCode: 'META_CONFIG_MISSING', retryable: false });
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    throw new MetaApiError('WhatsApp delivery is disabled', { statusCode: 503, errorCode: 'WHATSAPP_DISABLED', retryable: false });
  }

  const { parameters } = validateTemplateVariables(message.templateName, message.variables);
  const url = `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        // Meta expects the E.164 digits without the leading plus sign.
        to: String(message.recipient).replace(/^\+/, ''),
        type: 'template',
        template: {
          name: message.templateName,
          language: { code: message.language },
          components: [{ type: 'body', parameters }]
        }
      }),
      signal: AbortSignal.timeout(Number(process.env.WHATSAPP_REQUEST_TIMEOUT_MS) || 10000)
    });
  } catch (error) {
    throw new MetaApiError('Meta Cloud API request failed before receiving a response', {
      statusCode: 503,
      errorCode: error.name === 'TimeoutError' ? 'META_API_TIMEOUT' : 'META_API_NETWORK_ERROR',
      retryable: true
    });
  }

  let result = {};
  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    const metaError = result.error || {};
    const retryable = response.status === 429 || response.status >= 500;
    throw new MetaApiError('Meta Cloud API rejected the message request', {
      statusCode: response.status,
      errorCode: String(metaError.code || `META_HTTP_${response.status}`),
      retryable
    });
  }

  const wamid = result.messages?.[0]?.id;
  if (!wamid) {
    throw new MetaApiError('Meta accepted no message ID in the response', { errorCode: 'META_WAMID_MISSING', retryable: true });
  }
  return { wamid };
}

module.exports = { MetaApiError, sendTemplateMessage };
