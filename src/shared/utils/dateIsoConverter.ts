/**
 * Convert Jalali (Shamsi) date to Gregorian ISO date string (YYYY-MM-DD)
 */
function jalaliToGregorian(jy: number, jm: number, jd: number): string {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

const PERSIAN_MONTHS: Record<string, number> = {
  'فروردین': 1, 'اردیبهشت': 2, 'خرداد': 3,
  'تیر': 4, 'مرداد': 5, 'شهریور': 6,
  'مهر': 7, 'آبان': 8, 'آذر': 9,
  'دی': 10, 'بهمن': 11, 'اسفند': 12
};

export function normalizeToIsoDate(dateInput: string): string {
  if (!dateInput) {
    throw new Error('تاریخ رزرو الزامی است.');
  }

  const clean = String(dateInput).trim();

  // Convert Persian/Arabic digits to English digits
  const englishDigits = clean.replace(/[۰-۹]/g, (w) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(w)));

  // 1. Jalali numeric format like 1405/08/05, 1405-08-05, or 1405.08.05
  const numericMatch = englishDigits.match(/^(\d{4})[/. -](\d{1,2})[/. -](\d{1,2})$/);
  if (numericMatch) {
    const y = Number(numericMatch[1]);
    const m = Number(numericMatch[2]);
    const d = Number(numericMatch[3]);
    if (y >= 1300 && y <= 1500) {
      return jalaliToGregorian(y, m, d);
    }
    if (y >= 1600) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 2. Already standard Gregorian ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(englishDigits)) {
    return englishDigits;
  }

  // 3. Parseable ISO or standard timestamp
  const parsedDate = new Date(englishDigits);
  if (!isNaN(parsedDate.getTime()) && (englishDigits.includes('-') || englishDigits.includes('T'))) {
    return parsedDate.toISOString().split('T')[0];
  }

  // 4. Persian descriptive format like "شنبه ۵ آبان" or "۵ آبان ۱۴۰۵" or "۵ آبان"
  for (const [monthName, monthNum] of Object.entries(PERSIAN_MONTHS)) {
    if (englishDigits.includes(monthName)) {
      const dayMatch = englishDigits.match(/\d+/);
      const jd = dayMatch ? Number(dayMatch[0]) : 1;
      const yearMatch = englishDigits.match(/14\d{2}/);
      const jy = yearMatch ? Number(yearMatch[0]) : 1405;
      return jalaliToGregorian(jy, monthNum, jd);
    }
  }

  throw new Error('فرمت تاریخ نامعتبر است.');
}

export function normalizeTime(timeInput: string): string {
  if (!timeInput) return '11:30';
  const clean = String(timeInput).trim();
  const englishDigits = clean.replace(/[۰-۹]/g, (w) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(w)));
  const timeMatch = englishDigits.match(/(\d{1,2})[:](\d{2})/);
  if (timeMatch) {
    const hh = timeMatch[1].padStart(2, '0');
    const mm = timeMatch[2];
    return `${hh}:${mm}`;
  }
  return englishDigits;
}
