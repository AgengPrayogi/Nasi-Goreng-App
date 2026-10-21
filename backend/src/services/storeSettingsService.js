const StoreSettings = require('../models/StoreSettings');

function getLocalTime(timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === 'hour')?.value || '00';
  const minute = parts.find((part) => part.type === 'minute')?.value || '00';
  return `${hour}:${minute}`;
}

function getOpenState(settings) {
  if (settings.manualStatus === 'open') return { isOpen: true, statusSource: 'manual', hoursSummary: 'Buka · dibuka manual' };
  if (settings.manualStatus === 'closed') return { isOpen: false, statusSource: 'manual', hoursSummary: 'Tutup · ditutup manual' };
  const sessions = settings.openingHours || [];
  if (!sessions.length) return { isOpen: null, statusSource: 'unset', hoursSummary: 'Jam buka belum diatur' };

  const timezone = process.env.ORDER_BUSINESS_TZ || 'Asia/Jakarta';
  const now = getLocalTime(timezone);
  const activeSession = sessions.find(({ open, close }) => (
    open < close ? now >= open && now < close : now >= open || now < close
  ));
  const isOpen = Boolean(activeSession);
  if (activeSession) return { isOpen, statusSource: 'schedule', hoursSummary: `Buka · tutup ${activeSession.close}` };

  const nextSession = sessions.find(({ open }) => open > now) || sessions[0];
  return { isOpen, statusSource: 'schedule', hoursSummary: `Tutup · buka ${nextSession.open}` };
}

async function getStoreSettings() {
  const settings = await StoreSettings.findById('main').lean() || {
    openingHours: [
      { open: '11:00', close: '14:00' },
      { open: '17:00', close: '24:00' },
    ],
    location: 'JL Otista Raya No. 131 A, Jatinegara, Jakarta Timur',
    manualStatus: 'auto',
  };
  return {
    openingHours: settings.openingHours,
    location: settings.location,
    manualStatus: settings.manualStatus,
    timezone: process.env.ORDER_BUSINESS_TZ || 'Asia/Jakarta',
    ...getOpenState(settings),
  };
}

async function updateStoreSettings(data, adminId) {
  const settings = await StoreSettings.findByIdAndUpdate(
    'main',
    { $set: { ...data, updatedBy: adminId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  return {
    openingHours: settings.openingHours,
    location: settings.location,
    manualStatus: settings.manualStatus,
    timezone: process.env.ORDER_BUSINESS_TZ || 'Asia/Jakarta',
    ...getOpenState(settings),
  };
}

module.exports = { getStoreSettings, updateStoreSettings };
