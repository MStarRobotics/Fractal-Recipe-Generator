import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { ActionCodeSettings, UserCredential } from 'firebase/auth';
import {
  sendEmailSignInLink,
  isEmailSignInLink,
  completeEmailSignIn,
} from '../../services/firebaseClient';

interface EmailLinkAuthPanelProps {
  readonly onSuccess?: (credential: UserCredential) => void;
  readonly heading?: string;
  readonly className?: string;
  readonly redirectUrl?: string;
  readonly autoDetectLink?: boolean;
}

const resolveRedirectUrl = (customUrl?: string): string => {
  if (customUrl) {
    return customUrl;
  }
  const { location } = globalThis as typeof globalThis & { location?: Location };
  if (location) {
    return `${location.origin}/auth/complete`;
  }
  return 'http://localhost:5173/auth/complete';
};

/**
 * Email link (passwordless) authentication form with optional auto-detection.
 */
export function EmailLinkAuthPanel({
  onSuccess,
  heading = 'Passwordless Sign-In',
  className,
  redirectUrl,
  autoDetectLink = true,
}: EmailLinkAuthPanelProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompletingSignIn, setIsCompletingSignIn] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isFinishingSignIn, setIsFinishingSignIn] = useState(false);

  const panelId = useMemo(() => `email-auth-${Math.random().toString(36).slice(2, 9)}`, []);
  const emailInputId = `${panelId}-email`;
  const baseClasses = 'max-w-md mx-auto p-6 bg-white rounded-lg shadow';
  const cardClasses = className ? `${baseClasses} ${className}` : baseClasses;

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  }, []);

  const handleSendLink = useCallback(async () => {
    setError(null);
    setStatus('Sending sign-in link...');
    setIsSendingLink(true);

    try {
      const actionCodeSettings: ActionCodeSettings = {
        url: resolveRedirectUrl(redirectUrl),
        handleCodeInApp: true,
      };

      await sendEmailSignInLink(email, actionCodeSettings);

      setStatus('Sign-in link sent! Check your email and click the link to finish signing in.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send sign-in link';
      setError(message);
      setStatus(null);
    } finally {
      setIsSendingLink(false);
    }
  }, [email, redirectUrl]);

  const handleCompleteSignIn = useCallback(
    async (providedEmail?: string) => {
      setError(null);
      setStatus('Completing sign-in...');
      setIsFinishingSignIn(true);

      try {
        const result = await completeEmailSignIn(providedEmail ?? email);
        const descriptor = result.user.email ?? result.user.uid;
        setStatus(`Successfully signed in as ${descriptor}`);
        onSuccess?.(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to complete sign-in';
        if (message.toLowerCase().includes('email address is required')) {
          setError('Please enter your email to complete sign-in.');
          setIsCompletingSignIn(true);
        } else {
          setError(message);
        }
        setStatus(null);
      } finally {
        setIsFinishingSignIn(false);
      }
    },
    [email, onSuccess]
  );

  useEffect(() => {
    if (!autoDetectLink) {
      return;
    }
    if (!isEmailSignInLink()) {
      return;
    }
    setIsCompletingSignIn(true);
    (async () => {
      await handleCompleteSignIn();
    })().catch(e => {
      // handleCompleteSignIn already manages its own error state; this is a final safety net.
      console.warn('Auto-complete sign-in failed:', e);
    });
  }, [autoDetectLink, handleCompleteSignIn]);

  if (isCompletingSignIn) {
    return (
      <div className={cardClasses}>
        <h2 className='text-2xl font-bold mb-4'>Complete Sign-In</h2>

        <div className='space-y-4'>
          <p className='text-sm text-gray-600'>
            You opened a sign-in link. Enter your email to finalize authentication.
          </p>

          <div>
            <label className='block text-sm font-medium mb-1' htmlFor={emailInputId}>
              Email Address
            </label>
            <input
              id={emailInputId}
              type='email'
              value={email}
              onChange={handleEmailChange}
              placeholder='you@example.com'
              className='w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <button
            type='button'
            onClick={async () => {
              await handleCompleteSignIn(email);
            }}
            disabled={!email || isFinishingSignIn}
            className='w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50'
          >
            {isFinishingSignIn ? 'Verifying...' : 'Complete Sign-In'}
          </button>
        </div>

        {status && <div className='mt-4 p-3 bg-blue-50 text-blue-700 rounded'>{status}</div>}

        {error && <div className='mt-4 p-3 bg-red-50 text-red-700 rounded'>{error}</div>}
      </div>
    );
  }

  const isEmailReady = email.trim().length > 0;

  return (
    <div className={cardClasses}>
      <h2 className='text-2xl font-bold mb-4'>{heading}</h2>

      <div className='space-y-4'>
        <div>
          <label className='block text-sm font-medium mb-1' htmlFor={emailInputId}>
            Email Address
          </label>
          <input
            id={emailInputId}
            type='email'
            value={email}
            onChange={handleEmailChange}
            placeholder='you@example.com'
            className='w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500'
          />
          <p className='text-xs text-gray-500 mt-1'>
            We will send you a one-time link to sign in without a password.
          </p>
        </div>

        <button
          type='button'
          onClick={async () => {
            await handleSendLink();
          }}
          disabled={!isEmailReady || isSendingLink}
          className='w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50'
        >
          {isSendingLink ? 'Sending...' : 'Send Sign-In Link'}
        </button>
      </div>

      {status && <div className='mt-4 p-3 bg-blue-50 text-blue-700 rounded'>{status}</div>}

      {error && <div className='mt-4 p-3 bg-red-50 text-red-700 rounded'>{error}</div>}

      <div className='mt-6 pt-6 border-t'>
        <h3 className='text-sm font-semibold mb-2'>How it works:</h3>
        <ol className='text-xs text-gray-600 space-y-1 list-decimal list-inside'>
          <li>Enter your email address</li>
          <li>Click &quot;Send Sign-In Link&quot;</li>
          <li>Check your email inbox</li>
          <li>Tap the link from any device</li>
          <li>Access the app instantly</li>
        </ol>
      </div>
    </div>
  );
}

/**
 * Backwards-compatible export used in documentation snippets.
 */
export function EmailLinkAuthExample(): JSX.Element {
  return <EmailLinkAuthPanel />;
}
