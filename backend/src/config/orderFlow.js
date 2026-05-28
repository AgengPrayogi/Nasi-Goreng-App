/**
 * Business calendar date for queue numbers (YYYY-MM-DD) and ETA defaults.
 * Use ORDER_BUSINESS_TZ so "today" matches the warung's local day.
 */
const DEFAULT_TZ = process.env.ORDER_BUSINESS_TZ || 'Asia/Jakarta';

function getQueueBusinessDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

function getEtaMinutes({ totalItemQty, aheadCount }) {
  const base = Number(process.env.ETA_BASE_MINUTES || 5);
  const perItem = Number(process.env.ETA_MINUTES_PER_ITEM || 3);
  const perAhead = Number(process.env.ETA_MINUTES_PER_ORDER_AHEAD || 5);
  const qty = Number(totalItemQty) || 0;
  const ahead = Number(aheadCount) || 0;
  return Math.max(1, Math.ceil(base + perItem * qty + perAhead * ahead));
}

module.exports = {
  DEFAULT_TZ,
  getQueueBusinessDate,
  getEtaMinutes
};
