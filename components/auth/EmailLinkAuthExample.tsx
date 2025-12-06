import { useState, useEffect } from 'react';
import type { ActionCodeSettings } from 'firebase/auth';
import {
  sendEmailSignInLink,
  isEmailSignInLink,
  completeEmailSignIn,
} from '../../services/firebaseClient';

/**
 * Example component demonstrating Firebase Email Link (Passwordless) Authentication.
 * 
 * Two modes:
 * 1. Send Link: User enters email, receives magic link
 * 2. Complete Sign-In: Automatically detects if URL contains sign-in link
 */
export function EmailLinkAuthExample() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isCompletingSignIn, setIsCompletingSignIn] = useState(false);

  useEffect(() => {
    // Check if current URL is a sign-in link
    if (isEmailSignInLink()) {
      setIsCompletingSignIn(true);
      handleCompleteSignIn();
    }
  }, []);

  const handleSendLink = async () => {
    setError('');
    setStatus('Sending sign-in link...');

    try {
      // Configure the email link settings
      const actionCodeSettings: ActionCodeSettings = {
        // URL to redirect back to (must be in Firebase authorized domains)
        url: window.location.origin + '/auth/complete',
        handleCodeInApp: true,
        // Optional: iOS/Android deep linking
        // iOS: { bundleId: 'com.example.app' },
        // android: { packageName: 'com.example.app', installApp: true },
      };

      await sendEmailSignInLink(email, actionCodeSettings);
      
      setStatus(
        'Sign-in link sent! Check your email and click the link to sign in. ' +
        'The link will work on any device.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send sign-in link');
      setStatus('');
    }
  };

  const handleCompleteSignIn = async (providedEmail?: string) => {
    setError('');
    setStatus('Completing sign-in...');

    try {
      const result = await completeEmailSignIn(providedEmail || email);
      
      setStatus(`Successfully signed in as ${result.user.email}`);
      // Handle successful sign-in (e.g., redirect to dashboard)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete sign-in';
      
      // If email is missing, prompt user to enter it
      if (errorMessage.includes('Email address is required')) {
        setError('Please enter your email to complete sign-in');
        setIsCompletingSignIn(true);
      } else {
        setError(errorMessage);
      }
      setStatus('');
    }
  };

  if (isCompletingSignIn) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Complete Sign-In</h2>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You opened a sign-in link. Enter your email to complete authentication.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => handleCompleteSignIn(email)}
            disabled={!email}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Complete Sign-In
          </button>
        </div>

        {status && (
          <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded">
            {status}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Passwordless Sign-In</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            We'll send you a magic link to sign in without a password
          </p>
        </div>

        <button
          onClick={handleSendLink}
          disabled={!email}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Send Sign-In Link
        </button>
      </div>

      {status && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded">
          {status}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mt-6 pt-6 border-t">
        <h3 className="text-sm font-semibold mb-2">How it works:</h3>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
          <li>Enter your email address</li>
          <li>Click "Send Sign-In Link"</li>
          <li>Check your email inbox</li>
          <li>Click the link in the email</li>
          <li>You'll be signed in automatically!</li>
        </ol>
      </div>
    </div>
  );
}
