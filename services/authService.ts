// Authentication helpers for MetaMask sign-in and account linking.
import type { Address } from 'viem';
import type { AuthProfile } from '../types';

const DEFAULT_AUTH_API_URL = 'http://localhost:4000';
const API_BASE_URL = (import.meta.env.VITE_AUTH_API_URL ?? DEFAULT_AUTH_API_URL).replace(/\/$/, '');

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type NonceResponse = {
  nonce: string;
  message: string;
};

type VerifyResponse = {
  token: string;
  address: string;
  linkedGoogleId?: string | null;
  firebaseCustomToken?: string | null;
};

type LinkRequest = {
  googleId: string;
  email?: string;
  displayName?: string;
  googleAccessToken?: string;
  provider?: 'firebase' | 'google-identity';
};

const isEthereumProvider = (val: unknown): val is EthereumProvider => {
  return !!val && typeof (val as { request?: unknown }).request === 'function';
};

const getEthereumProvider = (): EthereumProvider => {
  const globalWindow =
    typeof globalThis === 'object' &&
    'window' in globalThis &&
    globalThis.window
      ? (globalThis.window as Window & { ethereum?: EthereumProvider })
      : undefined;

  if (!isEthereumProvider(globalWindow?.ethereum)) {
    throw new Error('MetaMask extension not detected.');
  }

  return globalWindow.ethereum;
};

const requestJson = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const payload: unknown = await response.json();
      if (payload && typeof payload === 'object' && 'error' in payload) {
        const errVal = (payload as { error: unknown }).error;
        if (typeof errVal === 'string') {
          message = errVal;
        }
      }
    } catch (error_) {
      console.warn('Failed to parse error payload', error_);
      // Ignore JSON parsing errors and fall back to default message.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
};

export const isMetaMaskAvailable = (): boolean => {
  const globalWindow =
    typeof globalThis === 'object' &&
    'window' in globalThis &&
    globalThis.window
      ? (globalThis.window as Window & { ethereum?: EthereumProvider })
      : undefined;
  return Boolean(globalWindow?.ethereum);
};

export const requestNonce = async (address: Address): Promise<NonceResponse> => {
  return requestJson<NonceResponse>('/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });
};

export const signMessageWithWallet = async (message: string, address: Address): Promise<string> => {
  const provider = getEthereumProvider();
  const signature = await provider.request({
    method: 'personal_sign',
    params: [message, address],
  });
  if (typeof signature !== 'string') {
    throw new TypeError('Failed to obtain signature from MetaMask');
  }
  return signature;
};

export type LinkWalletResponse = AuthProfile & { token: string; firebaseCustomToken?: string | null };

export const verifySignature = async (address: Address, signature: string): Promise<VerifyResponse> => {
  return requestJson<VerifyResponse>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ address, signature }),
  });
};

export const fetchAuthenticatedProfile = async (token: string): Promise<AuthProfile> => {
  return requestJson<AuthProfile>('/auth/profile', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const linkWalletToGoogleAccount = async (token: string, payload: LinkRequest): Promise<LinkWalletResponse> => {
  return requestJson<LinkWalletResponse>('/auth/link', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const logout = async (token: string): Promise<void> => {
  try {
    await requestJson<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    // Swallow logout errors to avoid blocking client teardown.
    console.warn('Failed to invalidate session on server', error);
  }
};

export const persistAuthToken = (token: string): void => {
  try {
    localStorage.setItem('fractalAuthToken', token);
  } catch (error) {
    console.warn('Unable to persist auth token', error);
  }
};

export const retrievePersistedToken = (): string | null => {
  try {
    return localStorage.getItem('fractalAuthToken');
  } catch (error) {
    console.warn('Unable to retrieve auth token', error);
    return null;
  }
};

export const clearPersistedToken = (): void => {
  try {
    localStorage.removeItem('fractalAuthToken');
  } catch (error) {
    console.warn('Unable to clear auth token', error);
  }
};
