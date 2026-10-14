const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, requirePIC } = require('../middlewares/auth');
const { validate } = require('../middlewares/validation');
const controller = require('../controllers/reservationController');
const {
  createReservationSchema,
  availabilityQuerySchema,
  listReservationsQuerySchema,
  trackReservationParamsSchema,
  trackReservationQuerySchema,
  cancelReservationSchema,
  updateReservationStatusSchema
} = require('../validators/reservationValidator');

const router = express.Router();
const publicReservationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'
});

router.get('/availability', publicReservationLimiter, validate(availabilityQuerySchema, 'query'), controller.availabilityHandler);
router.post('/', publicReservationLimiter, validate(createReservationSchema), controller.createReservationHandler);
router.get('/track/:reservationCode', publicReservationLimiter, validate(trackReservationParamsSchema, 'params'), validate(trackReservationQuerySchema, 'query'), controller.trackReservationHandler);
router.post('/cancel/:reservationCode', publicReservationLimiter, validate(trackReservationParamsSchema, 'params'), validate(cancelReservationSchema), controller.cancelReservationHandler);
router.use(authenticate, requirePIC);
router.get('/', validate(listReservationsQuerySchema, 'query'), controller.listReservationsHandler);
router.patch('/:id/status', validate(updateReservationStatusSchema), controller.updateReservationStatusHandler);

module.exports = router;