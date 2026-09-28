// ==============================================================================
// MapleBot: India Standard Time (IST, UTC+5:30) Engine
// Guarantees consistent working dates, attendance timestamps, and calendar rollbacks
// regardless of the browser locale or host server timezone.
// ==============================================================================

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Get the current date in IST formatted as YYYY-MM-DD
 */
export function getTodayIST(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Format 'en-CA' gives YYYY-MM-DD
}

/**
 * Get the current time in IST formatted as "hh:mm AM/PM" (e.g. "09:32 AM")
 */
export function getTimeIST(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return formatter.format(date);
}

/**
 * Get the full ISO string representation converted to IST representation
 */
export function getIsoTimestampIST(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Calculate the previous working day in IST (skips weekends: Monday -> Friday, Sunday -> Friday, Saturday -> Friday)
 * @param referenceDateStr YYYY-MM-DD reference date (defaults to today in IST)
 */
export function getPreviousWorkingDayIST(referenceDateStr?: string): string {
  const baseDateStr = referenceDateStr || getTodayIST();
  // Parse in UTC noon to avoid any midnight timezone shifts
  const [year, month, day] = baseDateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  let daysBack = 1;
  if (dayOfWeek === 1) daysBack = 3; // Monday -> previous Friday
  else if (dayOfWeek === 0) daysBack = 2; // Sunday -> previous Friday
  else if (dayOfWeek === 6) daysBack = 1; // Saturday -> previous Friday

  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString().split('T')[0];
}

/**
 * Format a YYYY-MM-DD date string into a friendly display: "Monday, 22 Sep 2026"
 */
export function formatDateFriendlyIST(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Format minutes integer into friendly display e.g.:
 * 90 -> "1h 30m"
 * 120 -> "2h"
 * 45 -> "45m"
 * 0 -> "0m"
 */
export function formatMinutesToFriendly(minutes?: number | null): string {
  if (minutes === undefined || minutes === null || isNaN(minutes) || minutes <= 0) {
    return '0m';
  }
  const rounded = Math.round(minutes);
  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

/**
 * Format hours numeric into friendly minutes display e.g.:
 * 1.5 -> "1h 30m"
 * 2 -> "2h"
 * 0.75 -> "45m"
 */
export function formatHoursToFriendly(hours?: number | null): string {
  if (hours === undefined || hours === null || isNaN(hours) || hours <= 0) {
    return '0m';
  }
  return formatMinutesToFriendly(Math.round(hours * 60));
}

/**
 * Convert hours numeric to minutes integer
 */
export function hoursToMinutes(hours?: number | null): number {
  if (!hours || isNaN(hours) || hours <= 0) return 0;
  return Math.round(hours * 60);
}

/**
 * Convert minutes integer to hours numeric rounded to 2 decimals
 */
export function minutesToHours(minutes?: number | null): number {
  if (!minutes || isNaN(minutes) || minutes <= 0) return 0;
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Check whether the current IST time is within the evening checkout period (>= 15:00 / 3:00 PM IST)
 * or if reporting on a past date.
 */
export function isEveningCheckoutPeriodIST(workDate: string): boolean {
  const todayStr = getTodayIST();
  if (workDate < todayStr) return true; // Past dates can be checked out immediately

  // Extract current hour in IST
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: IST_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    });
    const istHour = parseInt(formatter.format(new Date()), 10);
    return istHour >= 15; // 3:00 PM IST onwards
  } catch {
    return true;
  }
}

