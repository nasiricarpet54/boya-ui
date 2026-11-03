/**
 * BOYA API Service
 * Clean wrapper communicating with local PostgreSQL API endpoints (/api)
 * All endpoints use clean relative paths without duplicate `/api/` prefixes.
 */

import api from './apiClient';

class BoyaApiService {
  /**
   * Health check for database and backend connectivity.
   */
  async checkHealth(): Promise<{ status: string; timestamp: string; isConnected: boolean }> {
    try {
      const response = await api.get('/health');
      return {
        status: response.data?.status || 'ok',
        timestamp: response.data?.timestamp || new Date().toISOString(),
        isConnected: true,
      };
    } catch {
      return { status: 'offline', timestamp: new Date().toISOString(), isConnected: false };
    }
  }

  /**
   * Fetch customer-facing published salons.
   */
  async fetchSalons(): Promise<any[]> {
    try {
      const response = await api.get('/salons');
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      console.error('[BOYA_API] Failed to fetch salons:', err);
      return [];
    }
  }

  /**
   * Fetch all managed salons for administration (preserves pending & unapproved salons).
   */
  async fetchManagedSalons(): Promise<any[]> {
    try {
      const response = await api.get('/managed/salons');
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      console.error('[BOYA_API] Failed to fetch managed salons:', err);
      return [];
    }
  }

  /**
   * Fetch single salon detail by ID.
   */
  async fetchSalonDetail(salonId: string | number): Promise<any | null> {
    try {
      const response = await api.get(`/salons/${salonId}`);
      return response.data || null;
    } catch (err) {
      console.error(`[BOYA_API] Failed to fetch salon ${salonId}:`, err);
      return null;
    }
  }

  /**
   * Fetch bookings without falling back to stale mock data that conflicts with real PostgreSQL state.
   */
  async fetchBookings(): Promise<any[]> {
    try {
      const response = await api.get('/bookings');
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid bookings response: expected an array');
      }
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 401) {
        return [];
      }
      console.error('[BOYA_API] Failed to fetch bookings from server:', err?.message || err);
      // Re-throw or return empty array rather than injecting stale mock data
      throw err;
    }
  }

  /**
   * Send notification or SMS broadcast via Melipayamak.
   */
  async broadcastNotification(payload: {
    title: string;
    content: string;
    targetAudience?: 'all' | 'customer' | 'salon';
    testPhone?: string;
  }): Promise<{ success: boolean; sentCount?: number; notification?: any }> {
    const response = await api.post('/notifications/broadcast', payload);
    return response.data;
  }

  /**
   * Fetch security audit logs (restricted to super_admin).
   */
  async fetchAuditLogs(): Promise<any[]> {
    try {
      const response = await api.get('/audit-logs');
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      console.error('[BOYA_API] Failed to fetch audit logs:', err);
      return [];
    }
  }

  /**
   * Fetch system users (filtered by role permissions on server).
   */
  async fetchUsers(): Promise<any[]> {
    try {
      const response = await api.get('/users');
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      console.error('[BOYA_API] Failed to fetch users:', err);
      return [];
    }
  }

  /**
   * Fetch support tickets.
   */
  async fetchTickets(): Promise<any[]> {
    try {
      const response = await api.get('/tickets');
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      console.error('[BOYA_API] Failed to fetch tickets:', err);
      return [];
    }
  }
}

export const boyaApi = new BoyaApiService();
