/**
 * BOYA API Service
 * Clean wrapper communicating with local PostgreSQL API endpoints (/api)
 */

import api from './apiClient';

class BoyaApiService {
  async checkHealth(): Promise<{ status: string; timestamp: string; isConnected: boolean }> {
    try {
      const response = await api.get('/health');
      return {
        status: response.data.status || 'ok',
        timestamp: response.data.timestamp || new Date().toISOString(),
        isConnected: true,
      };
    } catch {
      return { status: 'offline', timestamp: new Date().toISOString(), isConnected: false };
    }
  }

  async fetchSalons(): Promise<any[]> {
    try {
      const response = await api.get('/salons');
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  }

  async fetchSalonDetail(salonId: string | number): Promise<any | null> {
    try {
      const response = await api.get(`/salons/${salonId}`);
      return response.data;
    } catch {
      return null;
    }
  }
}

export const boyaApi = new BoyaApiService();
