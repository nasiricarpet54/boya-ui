import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';
import { useAuthStore } from './authStore';

// ROLE LOCK: a logged-in user must stay in the panel that matches their role
// until they log out. Any attempt to switch panels is silently dropped.
describe('uiStore role lock (panel switching)', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    useUIStore.getState().setAppMode('customer');
  });

  const loginAs = (role: any) => {
    useAuthStore.getState().setAuth({
      id: 1, uid: '1', fullName: 'Test', role, phone: '09123456789', email: 't@t.ir',
    } as any);
  };

  it('allows the mode matching the logged-in role', () => {
    loginAs('salon_admin');
    useUIStore.getState().setAppMode('salon_panel');
    expect(useUIStore.getState().appMode).toBe('salon_panel');
  });

  it('blocks a salon_admin from switching to the customer panel', () => {
    loginAs('salon_admin');
    useUIStore.getState().setAppMode('salon_panel');
    useUIStore.getState().setAppMode('customer');
    expect(useUIStore.getState().appMode).toBe('salon_panel');
  });

  it('blocks super_admin from switching to the customer or salon panel', () => {
    loginAs('super_admin');
    useUIStore.getState().setAppMode('admin_panel');
    useUIStore.getState().setAppMode('customer');
    expect(useUIStore.getState().appMode).toBe('admin_panel');
    useUIStore.getState().setAppMode('salon_panel');
    expect(useUIStore.getState().appMode).toBe('admin_panel');
  });

  it('blocks a specialist from switching to the customer panel', () => {
    loginAs('salon_specialist');
    useUIStore.getState().setAppMode('salon_panel');
    useUIStore.getState().setAppMode('customer');
    expect(useUIStore.getState().appMode).toBe('salon_panel');
  });

  it('still lets a plain customer use the customer panel', () => {
    loginAs('customer');
    useUIStore.getState().setAppMode('customer');
    expect(useUIStore.getState().appMode).toBe('customer');
  });

  it('re-locks the panel when the role changes without logout', () => {
    loginAs('super_admin');
    useUIStore.getState().setAppMode('admin_panel');
    // Role change via setAuth (e.g. an admin demoted in the DB then re-verified):
    useAuthStore.getState().setAuth({
      id: 1, uid: '1', fullName: 'Test', role: 'salon_admin', phone: '09123456789', email: 't@t.ir',
    } as any);
    useUIStore.getState().setAppMode('salon_panel');
    expect(useUIStore.getState().appMode).toBe('salon_panel');
    useUIStore.getState().setAppMode('admin_panel');
    expect(useUIStore.getState().appMode).toBe('salon_panel');
  });
});
