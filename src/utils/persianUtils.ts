/**
 * Persian number conversion and formatting utilities
 */

export function toPersianDigits(n: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (w) => persianDigits[+w]);
}

export function formatPrice(amount: number): string {
  const formatted = amount.toLocaleString('en-US');
  return `${toPersianDigits(formatted)} تومان`;
}

export function formatPersianTime(timeStr: string): string {
  return toPersianDigits(timeStr);
}
