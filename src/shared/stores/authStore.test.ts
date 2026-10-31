import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('should initialize with null user and not authenticated', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
  });

  it('should set auth data correctly', () => {
    const user: any = { id: 1, uid: '1', fullName: 'Test User', email: 'test@example.com', role: 'customer' as const, phone: '09123456789' };
    const token = 'fake-token';
    
    useAuthStore.getState().setAuth(user, token);
    
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe(token);
  });

  it('should clear auth data correctly', () => {
    const user: any = { id: 1, uid: '1', fullName: 'Test User', email: 'test@example.com', role: 'customer' as const, phone: '09123456789' };
    useAuthStore.getState().setAuth(user, 'token');
    
    useAuthStore.getState().clearAuth();
    
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
