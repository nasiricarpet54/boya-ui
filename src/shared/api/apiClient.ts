import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Request interceptor: normalize URL so leading '/api/' does not duplicate baseURL '/api'
api.interceptors.request.use((config) => {
  if (config.url) {
    if (config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api\//, '/');
    } else if (config.url === '/api') {
      config.url = '/';
    }
  }
  return config;
});

// Response interceptor: On 401 Unauthorized, automatically purge auth state
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (useAuthStore.getState().isAuthenticated) {
        console.warn('[AUTH INTERCEPTOR] 401 received - purging invalid or expired authentication state.');
        useAuthStore.getState().clearAuth();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
