/**
 * Thin axios client that picks the Kajota backend URL from Expo
 * config (`app.json` → `extra.kajotaApiBaseUrl`) so a judge can point
 * it at a local backend just by editing app.json without touching code.
 */
import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';

const fromConfig =
  (Constants?.expoConfig?.extra as Record<string, string> | undefined)?.kajotaApiBaseUrl;

export const API_BASE_URL =
  fromConfig ?? 'https://kajota-mobile-backend-2.onrender.com/kajota-mobile-backend';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

let bearerToken: string | null = null;

export function setAuthToken(token: string | null) {
  bearerToken = token;
}

api.interceptors.request.use(config => {
  if (bearerToken) {
    config.headers.Authorization = `Bearer ${bearerToken}`;
  }
  return config;
});

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as AxiosError<{ message?: string }>;
  return e?.response?.data?.message ?? e?.message ?? fallback;
}
