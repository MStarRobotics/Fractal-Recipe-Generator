type GoogleIdentityGlobal = {
  accounts?: {
    oauth2?: {
      initTokenClient?: (config: unknown) => {
        requestAccessToken: (overrides?: unknown) => void;
      };
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityGlobal;
  }
}

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<void> | null = null;

const loadGoogleIdentityScript = async (): Promise<void> => {
  if (scriptPromise) {
    return scriptPromise;
  }

  if (typeof document === 'undefined') {
    throw new TypeError('Google Identity Services requires a browser environment.');
  }

  const globalScope = globalThis as typeof globalThis & { google?: GoogleIdentityGlobal };

  if (globalScope.google?.accounts?.oauth2) {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity="true"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Identity Services script.')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
};

// Preload the Google Identity Services script early so that any popup/consent UI
// can be triggered within a direct user gesture (click) without being blocked
// by browsers like Safari/Chrome. Exported for callers (e.g., App) to invoke on mount.
export const preloadGoogleIdentity = async (): Promise<void> => {
  try {
    await loadGoogleIdentityScript();
  } catch (err) {
    // Swallow preload errors; a subsequent interactive call will surface a clearer message
    // and we don't want this to break app startup.
    console.warn('Google Identity script preload failed:', err);
  }
};

export type GoogleIdentityProfile = {
  googleId: string;
  email?: string;
  displayName?: string;
  picture?: string;
  accessToken: string;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

type TokenErrorResponse = {
  error: string;
  error_description?: string;
};

const isErrorResponse = (
  response: TokenResponse | TokenErrorResponse
): response is TokenErrorResponse => {
  return 'error' in response;
};

type OpenIdUserInfo = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
};

const isOpenIdUserInfo = (value: unknown): value is OpenIdUserInfo => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sub === 'string' &&
    (v.email === undefined || typeof v.email === 'string') &&
    (v.name === undefined || typeof v.name === 'string') &&
    (v.picture === undefined || typeof v.picture === 'string')
  );
};

export const signInWithGoogleIdentity = async (): Promise<GoogleIdentityProfile> => {
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error('Set VITE_GOOGLE_OAUTH_CLIENT_ID to enable Google sign-in.');
  }

  // The script is expected to be preloaded during app initialization to retain
  // the user gesture context for the popup. We still attempt a quick load here
  // in case preload was skipped, but note some browsers may block the popup if
  // this lazy load occurs after the click.
  await loadGoogleIdentityScript();

  return new Promise<GoogleIdentityProfile>((resolve, reject) => {
    const globalScope = globalThis as typeof globalThis & { google?: GoogleIdentityGlobal };
    const initTokenClient = globalScope.google?.accounts?.oauth2?.initTokenClient;
    if (typeof initTokenClient !== 'function') {
      reject(new Error('Google Identity Services SDK unavailable.'));
      return;
    }

    const tokenClient = initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      prompt: 'consent',
      callback: async (tokenResponse: TokenResponse | TokenErrorResponse) => {
        if (isErrorResponse(tokenResponse)) {
          reject(new Error(tokenResponse.error_description ?? tokenResponse.error));
          return;
        }

        try {
          const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          });

          if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch Google profile.');
          }

          const profileJson: unknown = await userInfoResponse.json();
          if (!isOpenIdUserInfo(profileJson)) {
            reject(new Error('Received unexpected profile shape from Google.'));
            return;
          }
          resolve({
            googleId: profileJson.sub,
            email: profileJson.email,
            displayName: profileJson.name,
            picture: profileJson.picture,
            accessToken: tokenResponse.access_token,
          });
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Failed to complete Google sign-in.'));
        }
      },
    });

    tokenClient.requestAccessToken();
  });
};

export const revokeGoogleIdentityToken = async (
  token: string | null | undefined
): Promise<void> => {
  if (!token) {
    return;
  }

  try {
    await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `token=${encodeURIComponent(token)}`,
    });
  } catch (error) {
    console.warn('Failed to revoke Google access token', error);
  }
};
