/**
 * Persian number conversion and formatting utilities
 */

export function toPersianDigits(n: number | string): string {
  if (n === null || n === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (w) => persianDigits[+w]);
}

export function formatPrice(amount: number | string): string {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-US');
  return `${toPersianDigits(formatted)} تومان`;
}

export function formatPersianTime(timeStr: string): string {
  return toPersianDigits(timeStr);
}

/**
 * Days of week in Persian calendar - week starts on Saturday (شنبه)
 */
export const WEEKDAYS_FA = [
  { id: 'sat', name: 'شنبه', short: 'ش' },
  { id: 'sun', name: 'یکشنبه', short: 'ی' },
  { id: 'mon', name: 'دوشنبه', short: 'د' },
  { id: 'tue', name: 'سه‌شنبه', short: 'س' },
  { id: 'wed', name: 'چهارشنبه', short: 'چ' },
  { id: 'thu', name: 'پنجشنبه', short: 'پ' },
  { id: 'fri', name: 'جمعه', short: 'ج' },
];

/**
 * Format a Date to Persian Solar Hijri (Shamsi) date in Asia/Tehran timezone
 */
export function formatJalaliDate(date: Date | string = new Date(), options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    calendar: 'persian',
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    ...options,
  };

  try {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', defaultOptions);
    return formatter.format(d);
  } catch {
    return d.toLocaleDateString('fa-IR');
  }
}

/**
 * Format current time in Asia/Tehran timezone
 */
export function getTehranTime(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  try {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(d);
  } catch {
    return '۱۲:۰۰';
  }
}
