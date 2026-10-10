export const FARM_TIME_ZONE = 'Asia/Beirut';

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: FARM_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
const pad = value => String(value).padStart(2, '0');

function parts(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return Object.fromEntries(partsFormatter.formatToParts(date)
    .filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
}

// Unqualified input values are farm wall-clock times, never device-local times.
export function beirutInputToISO(input) {
  const match = typeof input === 'string' && input.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/);
  if (!match) return new Date(input).toISOString();
  const [, y, m, d, h = '0', min = '0', s = '0', ms = '0'] = match;
  const wall = Date.UTC(+y, +m - 1, +d, +h, +min, +s, Number(ms.padEnd(3, '0')));
  const offsets = new Set([-86400000, 0, 86400000].map(delta => {
    const instant = wall + delta;
    const p = parts(instant);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instant / 1000) * 1000;
  }));
  const candidates = [...offsets].map(offset => wall - offset).sort((a, b) => a - b);
  const exact = candidates.find(candidate => {
    const p = parts(candidate);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) === Math.floor(wall / 1000) * 1000;
  });
  // Earlier instant for a repeated time; forward through a skipped clock hour.
  return new Date(exact ?? candidates[candidates.length - 1]).toISOString();
}

export function farmDate(input = new Date()) {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/.test(input)) return input.slice(0, 10);
  const p = parts(input);
  return p ? `${p.year}-${pad(p.month)}-${pad(p.day)}` : '';
}

export function farmDateTime(input = new Date()) {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/.test(input)) return `${input.slice(0, 10)}T${input.slice(11, 16) || '00:00'}`;
  const p = parts(input);
  return p ? `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}` : '';
}

export function addFarmDays(date, days) {
  const d = new Date(`${farmDate(date)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function farmDisplay(input, options = {}) {
  if (!input) return '';
  let date;
  try { date = new Date(typeof input === 'string' ? beirutInputToISO(input) : input); }
  catch { return ''; }
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', ...options, timeZone: FARM_TIME_ZONE });
}

export function farmDayStart(input = new Date()) {
  return new Date(beirutInputToISO(`${farmDate(input)}T00:00:00`));
}

export function farmDayEnd(input = new Date()) {
  return new Date(new Date(beirutInputToISO(`${addFarmDays(input, 1)}T00:00:00`)).getTime() - 1);
}

// UTC fields here represent calendar components, not a stored instant.
export function farmCalendarDate(input = new Date()) {
  return new Date(`${farmDate(input)}T12:00:00Z`);
}

export function nextFarmDueDate(input, frequency, customDays = 21) {
  const local = farmDateTime(input || new Date());
  if (!local) return null;
  const instant = new Date(beirutInputToISO(input || new Date()));
  const p = parts(instant);
  const d = new Date(`${local}:${pad(p.second)}.${String(instant.getUTCMilliseconds()).padStart(3, '0')}Z`);
  const days = { daily: 1, weekly: 7, custom: parseInt(customDays) || 21 };
  const months = { monthly: 1, every_2_months: 2, every_3_months: 3, every_6_months: 6, yearly: 12 };
  if (frequency in days) d.setUTCDate(d.getUTCDate() + days[frequency]);
  else if (frequency in months) d.setUTCMonth(d.getUTCMonth() + months[frequency]);
  else return null;
  return beirutInputToISO(d.toISOString().slice(0, -1));
}
