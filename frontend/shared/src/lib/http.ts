import axios, { AxiosHeaders } from 'axios';
import { getToken } from './auth';
import { apiBaseUrl } from './apiBaseUrl';

export const http = axios.create({
  baseURL: apiBaseUrl(),
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = config.headers || {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  if (config.data instanceof FormData) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.delete('Content-Type');
    } else if (config.headers) {
      delete (config.headers as Record<string, unknown>)['Content-Type'];
    }
  } else {
    if (config.headers instanceof AxiosHeaders) {
      if (!config.headers.has('Content-Type')) {
        config.headers.set('Content-Type', 'application/json');
      }
    } else {
      config.headers = config.headers || {};
      const h = config.headers as Record<string, string>;
      if (!h['Content-Type']) h['Content-Type'] = 'application/json';
    }
  }

  return config;
});
