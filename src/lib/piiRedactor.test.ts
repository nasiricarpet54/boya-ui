import { describe, expect, it } from 'vitest';
import { processBookingData, redactLogValue, redactUserPII } from './piiRedactor';

describe('PII redaction', () => {
  it('redacts another tenant member phone and email and removes credentials', () => {
    const safe = redactUserPII({ id: 8, salonId: 2, phone: '09123456789', email: 'private@example.com', password: 'hash', uid: 'secret' }, { id: 9, role: 'line_manager', salonId: 2 });
    expect(safe).not.toHaveProperty('phone');
    expect(safe).not.toHaveProperty('email');
    expect(safe).not.toHaveProperty('password');
    expect(safe).not.toHaveProperty('uid');
  });
  it('preserves booking-owner details but never returns salon license documents', () => {
    const result = processBookingData({ customerId: 4, salonId: 2, customer: { id: 4, phone: '09123456789', email: 'x@example.com' }, salon: { id: 2, licenseDocUrl: '/private/license.pdf' } }, { id: 4, role: 'customer' });
    expect(result.customer.phone).toBe('09123456789');
    expect(result.customer.email).toBe('x@example.com');
    expect(result.salon).not.toHaveProperty('licenseDocUrl');
  });
  it('redacts sensitive log keys and masks phone/code patterns', () => {
    expect(redactLogValue({ phone: '09123456789', message: 'attempt 12345 from 09123456789' })).toEqual({ phone: '[REDACTED]', message: 'attempt [CODE] from [PHONE]' });
  });
});
