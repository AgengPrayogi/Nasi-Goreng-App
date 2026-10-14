const express = require('express');
const rateLimit = require('express-rate-limit');
const { validate } = require('../middlewares/validation');
const controller = require('../controllers/feedbackController');
const { feedbackParamsSchema, feedbackTokenQuerySchema, submitFeedbackSchema } = require('../validators/feedbackValidator');

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === 'test' });

router.get('/:orderCode', limiter, validate(feedbackParamsSchema, 'params'), validate(feedbackTokenQuerySchema, 'query'), controller.getFeedbackHandler);
router.put('/:orderCode', limiter, validate(feedbackParamsSchema, 'params'), validate(submitFeedbackSchema), controller.submitFeedbackHandler);

module.exports = router;
