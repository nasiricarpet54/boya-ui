import { describe, it, expect } from 'vitest';
import { toPersianDigits, formatPrice } from './persianUtils';

describe('persianUtils', () => {
  describe('toPersianDigits', () => {
    it('converts English digits to Persian digits', () => {
      expect(toPersianDigits('1234567890')).toBe('۱۲۳۴۵۶۷۸۹۰');
    });

    it('handles mixed content correctly', () => {
      expect(toPersianDigits('Phone: 0912')).toBe('Phone: ۰۹۱۲');
    });

    it('returns empty string for empty input', () => {
      expect(toPersianDigits('')).toBe('');
    });
  });

  describe('formatPrice', () => {
    it('formats numbers with commas and Toman suffix in Persian', () => {
      expect(formatPrice(1500000)).toBe('۱,۵۰۰,۰۰۰ تومان');
    });

    it('handles zero correctly', () => {
      expect(formatPrice(0)).toBe('۰ تومان');
    });
  });
});
