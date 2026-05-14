/**
 * Centralized date parsing utilities for Vietnamese date formats.
 * All date parsing across the app should use these functions
 * to ensure consistent behavior.
 */

type DateParseOptions = {
  expectedMonth?: number | null;
  preferMonthFirst?: boolean;
};

function toFourDigitYear(year: string): number | null {
  const n = Number(year);
  if (!Number.isFinite(n)) return null;
  const fullYear = year.length === 2 ? 2000 + n : n;
  return fullYear >= 1900 && fullYear <= 2100 ? fullYear : null;
}

function makeDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function resolveDayMonth(a: number, b: number, options: DateParseOptions = {}) {
  const expectedMonth = options.expectedMonth || null;

  if (a > 12 && b <= 12) return { day: a, month: b };
  if (b > 12 && a <= 12) return { day: b, month: a };

  if (expectedMonth && expectedMonth >= 1 && expectedMonth <= 12) {
    if (b === expectedMonth) return { day: a, month: b };
    if (a === expectedMonth) return { day: b, month: a };
  }

  return options.preferMonthFirst
    ? { day: b, month: a }
    : { day: a, month: b };
}

/**
 * Parse a Vietnamese date string (DD/MM/YYYY) or ISO date (YYYY-MM-DD).
 * Returns a valid Date object or null if parsing fails.
 * 
 * Supported formats:
 *  - DD/MM/YYYY  (e.g. "13/05/2026" or "5/12/2026")
 *  - MM/DD/YYYY  when expectedMonth shows the first number is the month
 *  - YYYY-MM-DD  (ISO, e.g. "2026-05-13")
 *  - Fallback: new Date(str) — only if result is valid
 */
export function parseDateVN(str: string | null | undefined, options: DateParseOptions = {}): Date | null {
  if (!str) return null;
  const trimmed = String(str).trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return null;

  // 1. Try DD/MM/YYYY or MM/DD/YYYY.
  const vnDateMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (vnDateMatch) {
    const a = Number(vnDateMatch[1]);
    const b = Number(vnDateMatch[2]);
    const yearNum = toFourDigitYear(vnDateMatch[3]);
    if (!yearNum || !Number.isFinite(a) || !Number.isFinite(b)) return null;

    const { day, month } = resolveDayMonth(a, b, {
      ...options,
      preferMonthFirst: options.preferMonthFirst || vnDateMatch[3].length === 2,
    });
    return makeDate(yearNum, month, day);
  }

  // 2. Try ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const dateObj = new Date(trimmed);
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  // 3. Fallback: native Date parse (handles various locale formats)
  // ⚠️ Careful: "13/05/2026" will fail here (NaN) which is correct —
  //    we already handled DD/MM/YYYY above
  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Normalize a date string to Vietnamese display/storage format (DD/MM/YYYY).
 * Returns the original string if parsing fails.
 */
export function normalizeDateVN(str: string | null | undefined, options: DateParseOptions = {}): string {
  if (!str) return '';
  const trimmed = String(str).trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return trimmed;

  const parsed = parseDateVN(trimmed, options);
  if (!parsed) return trimmed;
  return [
    String(parsed.getDate()).padStart(2, '0'),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    parsed.getFullYear(),
  ].join('/');
}

/**
 * Normalize a date string to ISO format (YYYY-MM-DD).
 * Returns the original string if parsing fails.
 */
export function normalizeDateToISO(str: string | null | undefined, options: DateParseOptions = {}): string {
  if (!str) return '';
  const trimmed = String(str).trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed;

  const parsed = parseDateVN(trimmed, options);
  if (parsed) {
    return [
      parsed.getFullYear(),
      String(parsed.getMonth() + 1).padStart(2, '0'),
      String(parsed.getDate()).padStart(2, '0'),
    ].join('-');
  }

  return trimmed;
}

/**
 * Compare two date strings for equality by their numeric values.
 * Handles zero-padding mismatches (e.g. "5/12/2026" vs "05/12/2026").
 * 
 * @param dateStr1 - First date string (DD/MM/YYYY or ISO)
 * @param dateStr2 - Second date string (DD/MM/YYYY or ISO)
 */
export function datesEqual(dateStr1: string | null | undefined, dateStr2: string | null | undefined): boolean {
  const d1 = parseDateVN(dateStr1);
  const d2 = parseDateVN(dateStr2);
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

/**
 * Check if a date is today or in the future.
 */
export function isFutureOrToday(str: string | null | undefined): boolean {
  const dateObj = parseDateVN(str);
  if (!dateObj) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj >= today;
}
