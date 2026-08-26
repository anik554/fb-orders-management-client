const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Compact timestamps for a dense list: "now", "4m", "3h", "2d", then a date. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const elapsed = now - new Date(iso).getTime();

  if (elapsed < MINUTE) return 'now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d`;

  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * A deadline in words: "in 7 days", "in 5 hours", "already expired".
 *
 * relativeTime measures elapsed time, so feeding it a future date returns
 * "now". Anything the user has to act on *before* a date needs this instead.
 */
export function timeUntil(iso: string, now: number = Date.now()): string {
  const remaining = new Date(iso).getTime() - now;

  if (remaining <= 0) return 'already expired';
  if (remaining < HOUR) return `in ${Math.max(1, Math.round(remaining / MINUTE))} minutes`;
  if (remaining < DAY) return `in ${Math.round(remaining / HOUR)} hours`;

  const days = Math.round(remaining / DAY);
  return days === 1 ? 'in a day' : `in ${days} days`;
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** How long the 24-hour reply window has left, or null once it has closed. */
export function windowRemaining(expiresAt: string | null, now: number = Date.now()): string | null {
  if (!expiresAt) return null;

  const remaining = new Date(expiresAt).getTime() - now;

  if (remaining <= 0) return null;
  if (remaining < HOUR) return `${Math.max(1, Math.floor(remaining / MINUTE))} min left`;

  return `${Math.floor(remaining / HOUR)}h left`;
}

export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) return 'Today';

  const yesterday = new Date(today.getTime() - DAY);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

/**
 * BDT with thousands separators and no decimals: "2,490".
 *
 * Plan prices are whole taka by design, so trailing ".00" on a price card is
 * noise. Order totals keep their decimals — they are not always whole.
 */
export function taka(amount: number): string {
  return `৳${amount.toLocaleString('en-US')}`;
}

/** A period in words: "1 month", "6 months", "1 year". */
export function billingPeriod(months: number): string {
  if (months === 12) return '1 year';

  return months === 1 ? '1 month' : `${months} months`;
}
