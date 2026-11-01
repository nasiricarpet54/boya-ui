import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Request interceptor: Attach Auth token if present
api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: On 401 Unauthorized, automatically purge auth state
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[AUTH INTERCEPTOR] 401 received - purging invalid or expired authentication state.');
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  }
);

export default api;
