import axios from 'axios';
import { auth } from '../../lib/firebase.ts';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor: Attach fresh Firebase ID token
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
