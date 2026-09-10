/**
 * Shared formatting and date computation utilities for LifeOS.
 */

/**
 * Format a number as currency.
 * @param {number|string|null|undefined} n - Numeric amount
 * @param {string} [c="USD"] - ISO 4217 currency code
 * @returns {string} Formatted currency string
 */
export const currency = (n, c = "USD") => {
  const val = Number(n) || 0;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(val);
  } catch (_e) {
    return `$${val.toFixed(2)}`;
  }
};

/**
 * Format a date string or Date object into a readable date.
 * @param {string|Date|null|undefined} d - Date to format
 * @param {Intl.DateTimeFormatOptions} [opts] - Format options
 * @returns {string} Formatted date string or empty string
 */
export const formatDate = (d, opts = { month: "short", day: "numeric" }) => {
  if (!d) return "";
  try {
    const dd = new Date(d);
    if (isNaN(dd.getTime())) return "";
    return dd.toLocaleDateString(undefined, opts);
  } catch (_e) {
    return "";
  }
};

/**
 * Format a date into a localized time string.
 * @param {string|Date|null|undefined} d - Date to format
 * @returns {string} Formatted time string (e.g. "9:00 AM") or empty string
 */
export const formatTime = (d) => {
  if (!d) return "";
  try {
    const dd = new Date(d);
    if (isNaN(dd.getTime())) return "";
    return dd.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch (_e) {
    return "";
  }
};

/**
 * Compute the whole number of calendar days between today and a target date.
 * @param {string|Date} target - Target date
 * @param {Date} [from=new Date()] - Reference date (defaults to now)
 * @returns {number} Days difference (positive = future, negative = past)
 */
export const daysBetween = (target, from = new Date()) => {
  if (!target) return 0;
  const t = new Date(target);
  if (isNaN(t.getTime())) return 0;
  const diffMs = t.getTime() - from.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Construct a 7-column calendar matrix for a given month (Monday-first).
 * @param {number} year - Full year (e.g. 2026)
 * @param {number} month - 0-indexed month (0 = Jan, 11 = Dec)
 * @returns {Array<Date|null>} Array of Dates or null for padding cells
 */
export const monthMatrix = (year, month) => {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Monday = 0
  const days = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  const last = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= last; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
};

/**
 * Determine if two dates represent the exact same calendar day.
 * @param {Date|null|undefined} a
 * @param {Date|null|undefined} b
 * @returns {boolean}
 */
export const isSameDay = (a, b) => {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
  return da.toDateString() === db.toDateString();
};

/**
 * Format a Date into `YYYY-MM-DDTHH:mm` format for `<input type="datetime-local">`.
 * @param {Date} [d=new Date()]
 * @param {string} [timeStr="09:00"]
 * @returns {string}
 */
export const toDatetimeLocal = (d = new Date(), timeStr = "09:00") => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${timeStr}`;
};
