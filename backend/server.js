require('dotenv').config();

const app = require('./src/app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

function assertRequiredEnv() {
  if (process.env.NODE_ENV === 'production') {
    if ((process.env.JWT_SECRET || '').length < 32) {
      throw new Error('JWT_SECRET must contain at least 32 characters in production');
    }
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required in production');
    }
    const cors = (process.env.CORS_ORIGINS || '').trim();
    if (!cors) {
      throw new Error('CORS_ORIGINS must be set in production (comma-separated allowed origins)');
    }
    let frontendUrl;
    try {
      frontendUrl = new URL(process.env.FRONTEND_URL);
    } catch {
      throw new Error('FRONTEND_URL must be a valid public URL in production');
    }
    if (frontendUrl.protocol !== 'https:') {
      throw new Error('FRONTEND_URL must use HTTPS in production');
    }
    const allowedOrigins = cors.split(',').map((origin) => origin.trim());
    if (!allowedOrigins.includes(frontendUrl.origin)) {
      throw new Error('CORS_ORIGINS must include the FRONTEND_URL origin');
    }
    if (process.env.EMAIL_SERVICE !== 'smtp' || !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.SMTP_FROM) {
      throw new Error('Production requires EMAIL_SERVICE=smtp and SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM');
    }
  }

  if (process.env.WHATSAPP_ENABLED === 'true' && !getMetaConfig()) {
    throw new Error('WhatsApp delivery is enabled but Meta Cloud API credentials/configuration are incomplete');
  }
  if (process.env.WHATSAPP_ENABLED === 'true' && !/^v\d+\.\d+$/.test(process.env.WHATSAPP_GRAPH_API_VERSION || '')) {
    throw new Error('WHATSAPP_GRAPH_API_VERSION must use a Graph API version such as vXX.Y');
  }
  if (process.env.WHATSAPP_ENABLED === 'true' && !getMetaWebhookConfig()) {
    throw new Error('WhatsApp delivery is enabled but Meta webhook credentials are incomplete');
  }
  if (process.env.N8N_WHATSAPP_WEBHOOK_URL && !process.env.N8N_WHATSAPP_WEBHOOK_TOKEN) {
    throw new Error('N8N_WHATSAPP_WEBHOOK_TOKEN is required when N8N_WHATSAPP_WEBHOOK_URL is set');
  }
  if (process.env.N8N_WHATSAPP_WEBHOOK_TOKEN && !process.env.N8N_WHATSAPP_WEBHOOK_URL) {
    throw new Error('N8N_WHATSAPP_WEBHOOK_URL is required when N8N_WHATSAPP_WEBHOOK_TOKEN is set');
  }
  if (process.env.N8N_WHATSAPP_WEBHOOK_URL) {
    let webhookUrl;
    try {
      webhookUrl = new URL(process.env.N8N_WHATSAPP_WEBHOOK_URL);
    } catch {
      throw new Error('N8N_WHATSAPP_WEBHOOK_URL must be a valid URL');
    }
    if (process.env.NODE_ENV === 'production' && webhookUrl.protocol !== 'https:') {
      throw new Error('N8N_WHATSAPP_WEBHOOK_URL must use HTTPS in production');
    }
    if ((process.env.N8N_WHATSAPP_WEBHOOK_TOKEN || '').length < 32) {
      throw new Error('N8N_WHATSAPP_WEBHOOK_TOKEN must contain at least 32 characters');
    }
    if ((process.env.N8N_WHATSAPP_API_KEY || '').length < 32) {
      throw new Error('N8N_WHATSAPP_API_KEY must contain at least 32 characters when n8n webhook delivery is enabled');
    }
  }
  if (process.env.N8N_WHATSAPP_API_KEY && process.env.N8N_WHATSAPP_API_KEY.length < 32) {
    throw new Error('N8N_WHATSAPP_API_KEY must contain at least 32 characters');
  }
}

const { initializeDefaultConfigs } = require('./src/services/alertService');
const { initializeEmailService } = require('./src/services/emailService');
const { startCustomerTierScheduler } = require('./src/services/customerTierScheduler');
const { startCampaignAutomationScheduler } = require('./src/services/campaignAutomationScheduler');
const { startReportScheduler } = require('./src/services/reportScheduler');
const { startWhatsAppWorker } = require('./src/services/whatsappWorker');
const { getMetaConfig, getMetaWebhookConfig } = require('./src/services/whatsappService');

async function start() {
  try {
    assertRequiredEnv();
    const conn = await connectDB();
    console.log(`MongoDB connected: ${conn.host}:${conn.port}/${conn.name}`);

    // Initialize default alert configurations
    await initializeDefaultConfigs();

    // Initialize email service at startup (verify SMTP connection early)
    await initializeEmailService();
    startCustomerTierScheduler();
    startCampaignAutomationScheduler();
    startReportScheduler();
    startWhatsAppWorker();

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

