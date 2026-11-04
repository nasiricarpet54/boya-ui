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

// P1: Single-flight refresh lock. Concurrent 401s (e.g. a dashboard mounting
// and firing five queries at once) would otherwise each trigger a refresh,
// and the rotations would invalidate each other.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = api
    .post('/auth/refresh', {}, { withCredentials: true })
    .then(() => {
      useAuthStore.getState().verifySession();
      return 'refreshed';
    })
    .catch(() => null)
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

// Response interceptor: on a 401, try ONE silent refresh; if it works, replay
// the original request. Only if the refresh itself fails do we purge auth.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retried && !isRefreshCall) {
      originalRequest._retried = true;
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return api(originalRequest);
      }
    }

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
