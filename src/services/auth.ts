/**
 * Auth is intentionally minimal — Coach is an authenticated endpoint
 * server-side, so we sign in against the existing Kajota backend's
 * `/user/sign-in` and stash the JWT in expo-secure-store.
 */
import * as SecureStore from 'expo-secure-store';

import { api } from './api';
import type { ApiEnvelope, AuthUser } from '@/types';

const TOKEN_KEY = 'kajota_coach_token';
const USER_KEY = 'kajota_coach_user';

interface SignInPayload {
  user: string;
  password: string;
}

interface SignInResponse {
  token: string;
  refreshToken?: string;
  id: string;
  emailAddress: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const body: SignInPayload = { user: email, password };
  const { data } = await api.post<ApiEnvelope<SignInResponse>>('/user/sign-in', body);
  if (data.responseCode !== '000' || !data.payload?.token) {
    throw new Error(data.message || 'Sign-in failed');
  }
  const user: AuthUser = {
    id: data.payload.id,
    emailAddress: data.payload.emailAddress,
    firstName: data.payload.firstName,
    lastName: data.payload.lastName,
    fullName: data.payload.fullName,
    token: data.payload.token,
    refreshToken: data.payload.refreshToken,
  };
  await SecureStore.setItemAsync(TOKEN_KEY, user.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  return user;
}

export async function loadStoredAuth(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function signOut() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
