const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { AppError, BusinessError } = require('../errors/AppError');
const { randomBytes } = require('crypto');
const { recordCustomerConsent } = require('./whatsappConsentService');
const { enqueueWhatsAppEvent } = require('./whatsappEventService');

const ACTIVE_STATUSES = ['confirmed', 'checked_in'];
const SLOT_MINUTES = 15;

function getReservationWindow(startAt, durationMinutes) {
  startAt = new Date(startAt);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
  const bufferMinutes = Math.max(0, Number(process.env.RESERVATION_BUFFER_MINUTES ?? 15));
  return { endAt, bufferMinutes };
}

function createSlotLocks(tableId, startAt, endAt, bufferMinutes) {
  const slotSize = SLOT_MINUTES * 60 * 1000;
  const firstSlot = Math.floor(startAt.getTime() / slotSize) * slotSize;
  const lockUntil = Math.ceil((endAt.getTime() + bufferMinutes * 60 * 1000) / slotSize) * slotSize;
  const locks = [];

  for (let slot = firstSlot; slot < lockUntil; slot += slotSize) {
    locks.push(`${tableId}:${slot}`);
  }
  return locks;
}

async function listAvailability({ startAt, partySize, durationMinutes }) {
  startAt = new Date(startAt);
  partySize = Number(partySize);
  durationMinutes = Number(durationMinutes || 90);
  const { endAt, bufferMinutes } = getReservationWindow(startAt, durationMinutes);
  const tables = await Table.find({
    isActive: true,
    status: 'available',
    capacity: { $gte: partySize }
  }).select('number area capacity').sort({ capacity: 1, area: 1, number: 1 }).lean();

  if (tables.length === 0) return [];

  const conflictingReservations = await Reservation.find({
    tableId: { $in: tables.map((table) => table._id) },
    status: { $in: ACTIVE_STATUSES },
    startAt: { $lt: new Date(endAt.getTime() + bufferMinutes * 60 * 1000) },
    endAt: { $gt: new Date(startAt.getTime() - bufferMinutes * 60 * 1000) }
  }).select('tableId').lean();

  const unavailableIds = new Set(conflictingReservations.map((reservation) => reservation.tableId.toString()));
  return tables.filter((table) => !unavailableIds.has(table._id.toString()));
}

async function getWalkInUnavailableTableIds(tableIds, startAt = new Date()) {
  if (tableIds.length === 0) return new Set();
  const configuredDuration = Number(process.env.RESERVATION_WALKIN_HOLD_MINUTES ?? 90);
  const durationMinutes = Number.isFinite(configuredDuration) && configuredDuration > 0 ? configuredDuration : 90;
  const { endAt, bufferMinutes } = getReservationWindow(startAt, durationMinutes);
  const reservations = await Reservation.find({
    tableId: { $in: tableIds },
    status: { $in: ACTIVE_STATUSES },
    startAt: { $lt: new Date(endAt.getTime() + bufferMinutes * 60 * 1000) },
    endAt: { $gt: new Date(new Date(startAt).getTime() - bufferMinutes * 60 * 1000) }
  }).select('tableId').lean();
  return new Set(reservations.map((reservation) => reservation.tableId.toString()));
}

async function assertWalkInTableAvailable(tableId, startAt = new Date()) {
  const unavailableIds = await getWalkInUnavailableTableIds([tableId], startAt);
  if (unavailableIds.has(tableId.toString())) {
    throw new AppError('Table is reserved for an upcoming booking', 409, 'TABLE_RESERVED_FOR_RESERVATION');
  }
}

async function createReservation(data) {
  const startAt = new Date(data.startAt);
  if (startAt.getTime() > Date.now() + 30 * 24 * 60 * 60 * 1000) {
    throw new BusinessError('Reservations can only be requested up to 30 days ahead', 'RESERVATION_DATE_TOO_FAR');
  }
  const { endAt } = getReservationWindow(startAt, data.durationMinutes);

  const reservation = await Reservation.create({
    ...data,
    reservationCode: `RSV-${randomBytes(16).toString('hex').toUpperCase()}`,
    startAt,
    endAt,
    status: 'pending',
    statusHistory: [{ status: 'pending', actorType: 'system', note: 'Reservation request received' }]
  });

  if (data.whatsappConsent?.utility === true || data.whatsappConsent?.marketing === true) {
    const customer = await recordCustomerConsent({
      phone: reservation.customerPhone,
      name: reservation.customerName,
      consent: data.whatsappConsent,
      source: 'reservation_form',
      textVersion: process.env.WHATSAPP_CONSENT_TEXT_VERSION || 'wa-consent-v1'
    });
    reservation.customerId = customer?._id;
    await reservation.save();
  }

  await enqueueWhatsAppEvent({
    customerId: reservation.customerId,
    templateKey: 'reservation_pending',
    variables: {
      customer_name: reservation.customerName,
      reservation_code: reservation.reservationCode,
      reservation_time: reservation.startAt.toLocaleString('id-ID')
    },
    source: 'reservation.pending',
    sourceId: String(reservation._id)
  });
  return reservation;
}

async function trackReservation(reservationCode, customerPhone) {
  const reservation = await Reservation.findOne({
    reservationCode: reservationCode.toUpperCase(),
    customerPhone: customerPhone.trim()
  }).populate('tableId', 'number area capacity').lean();
  if (!reservation) throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');

  return toCustomerReservationSummary(reservation);
}

function toCustomerReservationSummary(reservation) {
  return {
    reservationCode: reservation.reservationCode,
    status: reservation.status,
    customerName: reservation.customerName,
    partySize: reservation.partySize,
    startAt: reservation.startAt,
    endAt: reservation.endAt,
    durationMinutes: reservation.durationMinutes,
    tableId: reservation.tableId,
    notes: reservation.notes
  };
}

async function cancelReservation(reservationCode, customerPhone) {
  const reservation = await Reservation.findOne({
    reservationCode: reservationCode.toUpperCase(),
    customerPhone: customerPhone.trim()
  }).select('+slotLocks');
  if (!reservation) throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
  if (!['pending', 'confirmed'].includes(reservation.status)) {
    throw new BusinessError('Only pending or confirmed reservations can be cancelled', 'RESERVATION_INVALID_TRANSITION');
  }

  const updated = await Reservation.findOneAndUpdate(
    { _id: reservation._id, status: reservation.status },
    {
      $set: { status: 'cancelled' },
      $unset: { slotLocks: 1 },
      $push: { statusHistory: { status: 'cancelled', actorType: 'system', note: 'Cancelled by customer' } }
    },
    { new: true, runValidators: true }
  ).populate('tableId', 'number area capacity').lean();
  if (!updated) throw new AppError('Reservation status changed; refresh and try again', 409, 'RESERVATION_STALE_UPDATE');
  return toCustomerReservationSummary(updated);
}

async function listReservations(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.from) query.startAt = { ...query.startAt, $gte: filters.from };
  if (filters.to) query.startAt = { ...query.startAt, $lte: filters.to };
  return Reservation.find(query)
    .populate('tableId', 'number area capacity')
    .sort({ startAt: 1, createdAt: 1 })
    .lean();
}

async function getCandidateTables(reservation, requestedTableId) {
  const query = {
    isActive: true,
    status: 'available',
    capacity: { $gte: reservation.partySize }
  };
  if (requestedTableId) query._id = requestedTableId;
  const tables = await Table.find(query).select('_id number capacity').sort({ capacity: 1, number: 1 }).lean();
  if (tables.length === 0) return [];

  const bufferMinutes = getReservationWindow(reservation.startAt, reservation.durationMinutes).bufferMinutes;
  const conflicts = await Reservation.find({
    tableId: { $in: tables.map((table) => table._id) },
    status: { $in: ACTIVE_STATUSES },
    startAt: { $lt: new Date(reservation.endAt.getTime() + bufferMinutes * 60 * 1000) },
    endAt: { $gt: new Date(reservation.startAt.getTime() - bufferMinutes * 60 * 1000) }
  }).select('tableId').lean();
  const unavailableIds = new Set(conflicts.map((reservationItem) => reservationItem.tableId.toString()));
  return tables.filter((table) => !unavailableIds.has(table._id.toString()));
}

async function updateReservationStatus(id, { status, tableId, note }, actor) {
  const reservation = await Reservation.findById(id);
  if (!reservation) throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');

  const transitions = {
    pending: ['confirmed', 'rejected', 'cancelled'],
    confirmed: ['checked_in', 'cancelled', 'no_show'],
    checked_in: ['completed']
  };
  if (!(transitions[reservation.status] || []).includes(status)) {
    throw new BusinessError(`Cannot change reservation from ${reservation.status} to ${status}`, 'RESERVATION_INVALID_TRANSITION');
  }

  const actorEntry = {
    status,
    actorId: actor.id,
    actorType: actor.type === 'staff' ? 'staff' : 'admin',
    note: note || ''
  };

  if (status === 'confirmed') {
    const tables = await getCandidateTables(reservation, tableId);
    if (tables.length === 0) {
      if (tableId) {
        throw new AppError('The selected time is no longer available for that table', 409, 'RESERVATION_SLOT_UNAVAILABLE');
      }
      throw new BusinessError('No active table has enough capacity for this reservation', 'RESERVATION_TABLE_UNAVAILABLE');
    }

    const bufferMinutes = Math.max(0, Number(process.env.RESERVATION_BUFFER_MINUTES ?? 15));
    for (const table of tables) {
      const slotLocks = createSlotLocks(table._id, reservation.startAt, reservation.endAt, bufferMinutes);
      try {
        const updated = await Reservation.findOneAndUpdate(
          { _id: id, status: 'pending' },
          {
            $set: { status, tableId: table._id, slotLocks },
            $push: { statusHistory: actorEntry }
          },
          { new: true, runValidators: true }
        ).populate('tableId', 'number area capacity');

        if (!updated) throw new BusinessError('Reservation status changed; refresh and try again', 'RESERVATION_STALE_UPDATE');
        await queueReservationStatusMessage(updated, status);
        return updated;
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
    throw new AppError('The selected time is no longer available for that table', 409, 'RESERVATION_SLOT_UNAVAILABLE');
  }

  const update = {
    $set: { status },
    $push: { statusHistory: actorEntry }
  };
  if (['completed', 'cancelled', 'rejected', 'no_show'].includes(status)) {
    update.$unset = { slotLocks: 1 };
  }
  const updated = await Reservation.findOneAndUpdate(
    { _id: id, status: reservation.status },
    update,
    { new: true, runValidators: true }
  ).populate('tableId', 'number area capacity');

  if (!updated) throw new BusinessError('Reservation status changed; refresh and try again', 'RESERVATION_STALE_UPDATE');
  await queueReservationStatusMessage(updated, status);
  return updated;
}

async function queueReservationStatusMessage(reservation, status) {
  const templateKey = status === 'confirmed'
    ? 'reservation_confirmed'
    : status === 'cancelled' || status === 'rejected'
      ? 'reservation_cancelled'
      : null;
  if (!templateKey) return;

  await enqueueWhatsAppEvent({
    customerId: reservation.customerId,
    templateKey,
    variables: {
      customer_name: reservation.customerName,
      reservation_code: reservation.reservationCode,
      reservation_time: reservation.startAt.toLocaleString('id-ID'),
      table_number: reservation.tableId?.number || 'akan diinformasikan'
    },
    source: `reservation.${status}`,
    sourceId: `${reservation._id}:${status}`
  });
}

module.exports = {
  listAvailability,
  getWalkInUnavailableTableIds,
  assertWalkInTableAvailable,
  createReservation,
  trackReservation,
  cancelReservation,
  listReservations,
  updateReservationStatus
};