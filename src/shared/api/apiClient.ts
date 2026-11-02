import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
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
