const feedbackService = require('../services/feedbackService');

async function getFeedbackHandler(req, res, next) {
  try {
    res.json({ success: true, data: await feedbackService.getFeedback(req.params.orderCode, req.query.token) });
  } catch (error) { next(error); }
}

async function submitFeedbackHandler(req, res, next) {
  try {
    res.status(201).json({ success: true, data: await feedbackService.submitFeedback(req.params.orderCode, req.body) });
  } catch (error) { next(error); }
}

module.exports = { getFeedbackHandler, submitFeedbackHandler };
