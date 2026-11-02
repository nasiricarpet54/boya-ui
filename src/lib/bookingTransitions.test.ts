import { describe, expect, it } from 'vitest';
import { isAllowedBookingTransition } from './bookingTransitions';

describe('booking lifecycle', () => {
  it('allows only documented forward transitions', () => {
    expect(isAllowedBookingTransition('pending', 'confirmed')).toBe(true);
    expect(isAllowedBookingTransition('confirmed', 'completed')).toBe(true);
    expect(isAllowedBookingTransition('completed', 'confirmed')).toBe(false);
    expect(isAllowedBookingTransition('cancelled', 'confirmed')).toBe(false);
    expect(isAllowedBookingTransition('pending', 'invalid')).toBe(false);
  });
});
