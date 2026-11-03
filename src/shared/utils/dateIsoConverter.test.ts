import { describe, it, expect } from 'vitest';
import { normalizeToIsoDate, normalizeTime } from './dateIsoConverter';

describe('Jalali and Persian Date/Time Normalization', () => {
  it('normalizes Persian digits in time to English digits', () => {
    expect(normalizeTime('۱۱:۳۰')).toBe('11:30');
    expect(normalizeTime('11:30')).toBe('11:30');
    expect(normalizeTime('۰۹:۱۵')).toBe('09:15');
  });

  it('normalizes Jalali numeric dates to Gregorian ISO dates', () => {
    expect(normalizeToIsoDate('۱۴۰۵/۰۸/۰۵')).toBe('2026-10-27');
    expect(normalizeToIsoDate('1405-08-05')).toBe('2026-10-27');
  });

  it('normalizes Persian descriptive dates with month names correctly', () => {
    expect(normalizeToIsoDate('شنبه ۵ آبان')).toBe('2026-10-27');
    expect(normalizeToIsoDate('۵ آبان ۱۴۰۵')).toBe('2026-10-27');
  });

  it('accepts standard ISO Gregorian dates as-is', () => {
    expect(normalizeToIsoDate('2026-11-10')).toBe('2026-11-10');
  });
});
