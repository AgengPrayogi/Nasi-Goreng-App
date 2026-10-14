const reservationService = require('../services/reservationService');

async function availabilityHandler(req, res, next) {
  try {
    res.json({ data: await reservationService.listAvailability(req.query) });
  } catch (error) {
    next(error);
  }
}

async function createReservationHandler(req, res, next) {
  try {
    res.status(201).json({ data: await reservationService.createReservation(req.body) });
  } catch (error) {
    next(error);
  }
}

async function trackReservationHandler(req, res, next) {
  try {
    res.json({ data: await reservationService.trackReservation(req.params.reservationCode, req.query.customerPhone) });
  } catch (error) {
    next(error);
  }
}

async function cancelReservationHandler(req, res, next) {
  try {
    res.json({ data: await reservationService.cancelReservation(req.params.reservationCode, req.body.customerPhone) });
  } catch (error) {
    next(error);
  }
}

async function listReservationsHandler(req, res, next) {
  try {
    res.json({ data: await reservationService.listReservations(req.query) });
  } catch (error) {
    next(error);
  }
}

async function updateReservationStatusHandler(req, res, next) {
  try {
    const reservation = await reservationService.updateReservationStatus(
      req.params.id,
      req.body,
      { id: req.user.id, type: req.user.type }
    );
    res.json({ data: reservation });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  availabilityHandler,
  createReservationHandler,
  trackReservationHandler,
  cancelReservationHandler,
  listReservationsHandler,
  updateReservationStatusHandler
};