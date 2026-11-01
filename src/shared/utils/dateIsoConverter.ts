/**
 * Standardize any incoming date string (Persian label, Jalali, or ISO)
 * into a standard Gregorian ISO date string (YYYY-MM-DD).
 */
export function normalizeToIsoDate(dateInput: string): string {
  if (!dateInput) {
    return new Date().toISOString().split('T')[0];
  }

  const clean = dateInput.trim();

  // Already standard Gregorian ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Parseable ISO or standard timestamp
  const d = new Date(clean);
  if (!isNaN(d.getTime()) && (clean.includes('-') || clean.includes('T'))) {
    return d.toISOString().split('T')[0];
  }

  // Jalali numeric format like 1403/08/05 or ۱۴۰۳/۰۸/۰۵
  const englishDigits = clean.replace(/[۰-۹]/g, (w) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(w)));
  const parts = englishDigits.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (parts) {
    const jy = Number(parts[1]);
    const jm = Number(parts[2]);
    const jd = Number(parts[3]);
    if (jy > 1300 && jy < 1500) {
      // Approximate Jalali to Gregorian conversion (Jalali year ~ Gregorian year - 621)
      const approxGregYear = jy + 621;
      const approxGregMonth = ((jm + 2) % 12) + 1;
      const mm = String(approxGregMonth).padStart(2, '0');
      const dd = String(Math.min(jd, 28)).padStart(2, '0');
      return `${approxGregYear}-${mm}-${dd}`;
    }
  }

  // Default to today's Gregorian ISO date
  return new Date().toISOString().split('T')[0];
}
