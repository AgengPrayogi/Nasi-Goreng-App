const express = require('express');
const { validate } = require('../middlewares/validation');
const { paymentWebhookSchema } = require('../validators/paymentValidator');
const { paymentWebhookHandler } = require('../controllers/paymentController');

const router = express.Router();

router.post('/webhook', validate(paymentWebhookSchema), paymentWebhookHandler);

module.exports = router;
