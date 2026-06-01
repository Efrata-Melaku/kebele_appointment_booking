import axios from 'axios';
import { getToken } from './auth';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart boundary — never send bare multipart/form-data
  if (config.data instanceof FormData && config.headers) {
    const h = config.headers as Record<string, unknown> & {
      delete?: (name: string) => boolean;
    };
    if (typeof h.delete === 'function') {
      h.delete('Content-Type');
    } else {
      delete h['Content-Type'];
    }
  }
  return config;
});
