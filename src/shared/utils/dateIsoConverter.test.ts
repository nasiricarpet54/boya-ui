import { describe, it, expect } from 'vitest';
import {
  normalizeToIsoDate,
  normalizeTime,
  jalaliMonthLength,
  jalaliWeekdaySaturdayFirst,
  isJalaliLeapYear,
} from './dateIsoConverter';

describe('Jalali and Persian Date/Time Normalization', () => {
  it('normalizes Persian digits in time to English digits', () => {
    expect(normalizeTime('۱۱:۳۰')).toBe('11:30');
    expect(normalizeTime('11:30')).toBe('11:30');
    expect(normalizeTime('۰۹:۱۵')).toBe('09:15');
  });

  it('rejects invalid times instead of falling back', () => {
    expect(normalizeTime('ساعت')).toBeNull();
    expect(normalizeTime('25:00')).toBeNull();
    expect(normalizeTime('')).not.toBe('11:30');
  });

  it('normalizes Jalali numeric dates to Gregorian ISO dates', () => {
    // Slash-separated with a 1300-1500 year is Jalali.
    expect(normalizeToIsoDate('۱۴۰۵/۰۸/۰۵')).toBe('2026-10-27');
    expect(normalizeToIsoDate('1405/08/05')).toBe('2026-10-27');
    // Dash-separated is an ISO-style Gregorian date (year 1405 is not Jalali here).
    expect(normalizeToIsoDate('2026-10-27')).toBe('2026-10-27');
  });

  it('normalizes Persian descriptive dates with month names correctly', () => {
    expect(normalizeToIsoDate('شنبه ۵ آبان')).toBe('2026-10-27');
    expect(normalizeToIsoDate('۵ آبان ۱۴۰۵')).toBe('2026-10-27');
  });

  it('accepts standard ISO Gregorian dates as-is', () => {
    expect(normalizeToIsoDate('2026-11-10')).toBe('2026-11-10');
  });

  it('rejects unparseable dates instead of silently defaulting to today', () => {
    expect(normalizeToIsoDate('garbage')).toBeNull();
    expect(normalizeToIsoDate('')).toBeNull();
    expect(normalizeToIsoDate('1405/08/32')).toBeNull();
  });

  it('computes Jalali month lengths and leap years from the ICU calendar', () => {
    // 1403 is a leap year (30-day Esfand); 1404 is not.
    expect(isJalaliLeapYear(1403)).toBe(true);
    expect(isJalaliLeapYear(1404)).toBe(false);
    expect(jalaliMonthLength(1403, 12)).toBe(30);
    expect(jalaliMonthLength(1404, 12)).toBe(29);
    expect(jalaliMonthLength(1405, 1)).toBe(31);
    expect(jalaliMonthLength(1405, 7)).toBe(30);
  });

  it('maps Jalali weekdays Saturday-first', () => {
    // 1405/08/10 = 2026-11-01, which is a Sunday -> offset 1 in a Sat-first week.
    expect(jalaliWeekdaySaturdayFirst(1405, 8, 10)).toBe(1);
    expect(jalaliWeekdaySaturdayFirst(1405, 8, 1)).toBeLessThan(7);
  });
});
