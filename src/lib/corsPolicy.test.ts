import { describe, expect, it } from 'vitest';
import { createCorsAllowlist, isCorsOriginAllowed } from './corsPolicy';

describe('credentialed CORS policy', () => {
  it('defaults production to the exact public site origin', () => {
    const allowed = createCorsAllowlist(undefined, true);
    expect(isCorsOriginAllowed('https://boya.bcshopir.ir', allowed)).toBe(true);
    expect(isCorsOriginAllowed('https://attacker.example', allowed)).toBe(false);
    expect(isCorsOriginAllowed('https://boya.bcshopir.ir.evil.test', allowed)).toBe(false);
  });
  it('accepts only explicitly configured exact origins', () => {
    const allowed = createCorsAllowlist('https://a.example, https://b.example', true);
    expect(isCorsOriginAllowed('https://a.example', allowed)).toBe(true);
    expect(isCorsOriginAllowed('https://a.example/', allowed)).toBe(false);
    expect(isCorsOriginAllowed(undefined, allowed)).toBe(true);
  });
});
