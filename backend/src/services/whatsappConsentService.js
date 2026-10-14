const Customer = require('../models/Customer');
const { AppError, BusinessError } = require('../errors/AppError');

const CONSENT_SOURCES = ['order_checkout', 'reservation_form', 'customer_request', 'inbound_whatsapp'];

function normalizeWhatsAppPhone(phone) {
  const input = String(phone || '').trim();
  const digits = input.replace(/\D/g, '');
  let normalized;

  if (input.startsWith('+')) normalized = `+${digits}`;
  else if (digits.startsWith('00')) normalized = `+${digits.slice(2)}`;
  else if (digits.startsWith('62')) normalized = `+${digits}`;
  else if (digits.startsWith('0')) normalized = `+62${digits.slice(1)}`;
  else if (digits.startsWith('8')) normalized = `+62${digits}`;
  else throw new BusinessError('Phone must include a valid country code or Indonesian mobile prefix', 'INVALID_WHATSAPP_PHONE');

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new BusinessError('Phone must be a valid E.164 number', 'INVALID_WHATSAPP_PHONE');
  }
  return normalized;
}

function normalizeConsentInput(consent = {}) {
  return {
    utility: consent.utility === true,
    marketing: consent.marketing === true
  };
}

async function recordCustomerConsent({ customerId, phone, name = '', consent, source, textVersion }) {
  if (!CONSENT_SOURCES.includes(source)) {
    throw new BusinessError('Invalid WhatsApp consent source', 'INVALID_CONSENT_SOURCE');
  }
  if (!textVersion || !String(textVersion).trim()) {
    throw new BusinessError('Consent text version is required', 'CONSENT_VERSION_REQUIRED');
  }

  const requested = normalizeConsentInput(consent);
  if (!requested.utility && !requested.marketing) return null;

  let customer = customerId
    ? await Customer.findById(customerId)
    : await Customer.findOne({ phone: String(phone || '').trim() });
  if (!customer && !customerId && phone) {
    try {
      customer = await Customer.create({
        phone: String(phone).trim(),
        name: String(name || '').trim(),
        whatsappConsent: {}
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      customer = await Customer.findOne({ phone: String(phone).trim() });
    }
  }
  if (!customer) {
    throw new AppError('Customer not found while recording WhatsApp consent', 404, 'CUSTOMER_NOT_FOUND');
  }
  normalizeWhatsAppPhone(customer.phone);

  const now = new Date();
  for (const category of ['utility', 'marketing']) {
    if (!requested[category]) continue;
    customer.whatsappConsent[category] = {
      enabled: true,
      source,
      textVersion: String(textVersion).trim(),
      consentedAt: now,
      optedOutAt: undefined
    };
  }
  await customer.save();
  return customer;
}

async function optCustomerOutByPhone(phone, categories = ['utility', 'marketing']) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const digits = normalizedPhone.slice(1);
  const localPhone = digits.startsWith('62') ? `0${digits.slice(2)}` : phone;
  const customer = await Customer.findOne({ phone: { $in: [normalizedPhone, localPhone, String(phone).trim()] } });
  if (!customer) return false;

  const optedOutAt = new Date();
  for (const category of categories) {
    if (!['utility', 'marketing'].includes(category)) continue;
    customer.whatsappConsent[category] = {
      ...(customer.whatsappConsent[category]?.toObject?.() || customer.whatsappConsent[category] || {}),
      enabled: false,
      optedOutAt
    };
  }
  await customer.save();
  return true;
}

module.exports = {
  normalizeWhatsAppPhone,
  recordCustomerConsent,
  optCustomerOutByPhone
};