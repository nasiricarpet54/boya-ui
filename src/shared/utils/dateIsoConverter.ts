/**
 * Jalali (Shamsi) <-> Gregorian date conversion utilities.
 *
 * Every conversion goes through the ICU `Intl.DateTimeFormat` calendar engine
 * (`fa-IR-u-ca-persian-nu-latn`), the exact same source the UI uses for
 * rendering. This guarantees the picker, the labels and the server always
 * agree on which day is meant — no arithmetic approximations, no drift.
 *
 * The day boundary is read in the Asia/Tehran timezone, so "a day" means the
 * same thing on both sides of the wire.
 *
 * Why this file returns `null`: the previous `normalizeToIsoDate()` silently
 * defaulted to *today* for any input it could not parse, which moved bookings
 * to the wrong day without raising an error. A booking must never be silently
 * relocated.
 */

const TEHRAN_TZ = 'Asia/Tehran';

const JALALI_NUM = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
  timeZone: TEHRAN_TZ,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

const GREGORIAN_ISO = new Intl.DateTimeFormat('en-CA', {
  timeZone: TEHRAN_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export interface JalaliParts {
  jy: number;
  jm: number; // 1-12
  jd: number; // 1-31
}

/** Convert a Gregorian date to Jalali year/month/day (1-based month). */
export function gregorianToJalali(date: Date): JalaliParts {
  const parts = JALALI_NUM.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { jy: get('year'), jm: get('month'), jd: get('day') };
}

/**
 * Convert Jalali year/month/day (1-based month) to a Gregorian date.
 *
 * Implementation note: `new Date('1405/08/10')` is not reliably parsed, so the
 * scan below finds the matching Gregorian day by walking forward from the
 * arithmetic anchor (Jalali 1/1 of that year ≈ Gregorian March 21). The walk
 * is at most ~370 steps once per conversion and always lands on the exact day
 * the ICU calendar reports.
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) {
    return new Date(NaN);
  }

  // Anchor: start of a Jalali year is around March 21 of (jy + 621).
  const anchor = new Date(Date.UTC(jy + 621, 2, 19));

  const matches = (cursor: Date): boolean => {
    const p = JALALI_NUM.formatToParts(cursor);
    const get = (type: string) => Number(p.find((x) => x.type === type)?.value || 0);
    return get('year') === jy && get('month') === jm && get('day') === jd;
  };

  // Walk up to 400 days forward looking for the exact Jalali triple.
  const cursor = new Date(anchor.getTime());
  for (let i = 0; i < 400; i++) {
    if (matches(cursor)) return new Date(cursor.getTime());
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Dates near the start of the Jalali year may sit before the anchor.
  const back = new Date(anchor.getTime());
  for (let i = 0; i < 31; i++) {
    back.setUTCDate(back.getUTCDate() - 1);
    if (matches(back)) return new Date(back.getTime());
  }

  return new Date(NaN);
}

/** True when the Jalali year has a 30th day of Esfand (leap year). */
export function isJalaliLeapYear(jy: number): boolean {
  const d = jalaliToGregorian(jy, 12, 30);
  return !isNaN(d.getTime());
}

/** Number of days in a Jalali month (jm is 1-based). */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

/** Weekday of a Jalali date, Saturday-first (0 = Sat ... 6 = Fri). */
export function jalaliWeekdaySaturdayFirst(jy: number, jm: number, jd: number): number {
  const d = jalaliToGregorian(jy, jm, jd);
  if (isNaN(d.getTime())) return 0;
  // getUTCDay: 0 = Sun ... 6 = Sat -> shift so Saturday is 0.
  return (d.getUTCDay() + 1) % 7;
}

/** Format a Date as YYYY-MM-DD using the Tehran-timezone day. */
export function toIsoDate(d: Date): string {
  return GREGORIAN_ISO.format(d);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** The standard booking grid the app shows for every day (Persian digits). */
export const STANDARD_HOURLY_SLOTS = [
  '۰۹:۳۰', '۱۱:۰۰', '۱۲:۳۰', '۱۴:۰۰', '۱۵:۳۰', '۱۷:۰۰', '۱۸:۳۰', '۲۰:۰۰',
];

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/** Convert Persian/Arabic digits in a string to Latin digits. */
export function toLatinDigits(input: string): string {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let res = input;
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(persianDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
  }
  return res;
}

const JALALI_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/**
 * Standardize any incoming date string (ISO, Jalali numeric, or Persian day
 * label) into a Gregorian ISO date string (YYYY-MM-DD), or `null` when the
 * input cannot be interpreted.
 */
export function normalizeToIsoDate(dateInput: string): string | null {
  if (!dateInput || typeof dateInput !== 'string') return null;

  const clean = dateInput.trim();
  if (!clean) return null;

  // Already standard Gregorian ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const englishDigits = toLatinDigits(clean);

  // Jalali numeric format: 1403/08/05 or 1403-8-5 (or Gregorian YYYY/MM/DD)
  const numeric = englishDigits.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (numeric) {
    const y = Number(numeric[1]);
    const m = Number(numeric[2]);
    const d = Number(numeric[3]);
    if (y >= 1300 && y <= 1500) {
      if (m < 1 || m > 12 || d < 1 || d > jalaliMonthLength(y, m)) return null;
      return toIsoDate(jalaliToGregorian(y, m, d));
    }
    if (y >= 1900 && y <= 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  // Parseable ISO or standard timestamp
  if (clean.includes('-') || clean.includes('T')) {
    const d = new Date(englishDigits);
    if (!isNaN(d.getTime())) return toIsoDate(d);
  }

  // Persian day label, e.g. "شنبه ۵ آبان ۱۴۰۵" or "۵ آبان"
  const label = englishDigits.match(/^(?:\S+\s+)?(\d{1,2})\s+([آ-ی]+)(?:\s+(\d{4}))?/);
  if (label) {
    const day = Number(label[1]);
    const monthName = label[2];
    const explicitYear = Number(label[3] || 0);
    const monthIndex = JALALI_MONTH_NAMES.findIndex((m) => monthName.includes(m));
    if (monthIndex >= 0) {
      const jy = explicitYear || gregorianToJalali(new Date()).jy;
      if (jy >= 1300 && jy <= 1500 && day >= 1 && day <= jalaliMonthLength(jy, monthIndex + 1)) {
        return toIsoDate(jalaliToGregorian(jy, monthIndex + 1, day));
      }
    }
  }

  return null;
}

/**
 * Normalize a time string to Latin `HH:MM` (24-hour).
 * Accepts "۱۱:۳۰", "11:30", "11-30", "۱۱.۳۰" or "23".
 * Returns `null` when the value is not a valid time.
 */
export function normalizeTimeToLatin(raw: string): string | null {
  if (raw === null || raw === undefined) return null;
  const latin = toLatinDigits(String(raw).trim());
  const m = latin.match(/^(\d{1,2})[:.\-،]?(\d{2})?$/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = m[2] ? Number(m[2]) : 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Back-compat wrapper for callers that expect a plain string.
 * Returns the normalized value, or `null` when invalid — never a silent
 * fallback to "today".
 */
export function normalizeTime(timeInput: string): string | null {
  return normalizeTimeToLatin(timeInput);
}
