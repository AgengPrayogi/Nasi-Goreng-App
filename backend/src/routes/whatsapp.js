const express = require('express');
const {
	queueWhatsAppMessageHandler,
	queueWhatsAppAutomationMessageHandler,
	listWhatsAppMessagesHandler,
	listWhatsAppAutomationEventsHandler,
	retryWhatsAppAutomationEventHandler,
	verifyWebhookHandler,
	receiveWebhookHandler
} = require('../controllers/whatsappController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { authenticateN8n } = require('../middlewares/n8nApiKey');
const { validate } = require('../middlewares/validation');
const {
	queueWhatsAppMessageSchema,
	listWhatsAppMessagesQuerySchema,
	listAutomationEventsQuerySchema,
	automationEventIdParamsSchema
} = require('../validators/whatsappValidator');

const router = express.Router();

router.get('/webhook', verifyWebhookHandler);
router.post('/webhook', receiveWebhookHandler);
router.post('/automation/messages', authenticateN8n, validate(queueWhatsAppMessageSchema), queueWhatsAppAutomationMessageHandler);
router.use(authenticate, requireAdmin);
router.get('/messages', validate(listWhatsAppMessagesQuerySchema, 'query'), listWhatsAppMessagesHandler);
router.post('/messages', validate(queueWhatsAppMessageSchema), queueWhatsAppMessageHandler);
router.get('/automation/events', validate(listAutomationEventsQuerySchema, 'query'), listWhatsAppAutomationEventsHandler);
router.patch('/automation/events/:id/retry', validate(automationEventIdParamsSchema, 'params'), retryWhatsAppAutomationEventHandler);

module.exports = router;
