import { useState } from 'react';
import type { ConfirmationResult } from 'firebase/auth';
import { ensurePhoneRecaptcha, signInWithPhone, confirmPhoneCode } from '../../services/firebaseClient';

/**
 * Example component demonstrating Firebase Phone Authentication.
 * 
 * Usage:
 * 1. User enters phone number in international format (+1234567890)
 * 2. User solves reCAPTCHA challenge (visible widget)
 * 3. SMS code is sent to phone
 * 4. User enters verification code
 * 5. Sign-in completes
 */
export function PhoneAuthExample() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    setError('');
    setStatus('Initializing reCAPTCHA...');

    try {
      // Create reCAPTCHA verifier (visible widget for better UX)
      // Note: The service helper manages the verifier instance internally
      ensurePhoneRecaptcha('recaptcha-container');

      setStatus('Requesting SMS code...');

      // Request SMS code
      const confirmationResult = await signInWithPhone(phoneNumber, 'recaptcha-container');

      setConfirmation(confirmationResult);
      setStatus('SMS code sent! Check your phone.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SMS');
      setStatus('');
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmation) {
      setError('No confirmation result. Please request a code first.');
      return;
    }

    setError('');
    setStatus('Verifying code...');

    try {
      const result = await confirmPhoneCode(confirmation, verificationCode);
      setStatus(`Signed in as ${result.user.phoneNumber}`);
      // Handle successful sign-in (e.g., redirect, update UI state)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
      setStatus('');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Phone Authentication</h2>

      {!confirmation ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Phone Number (international format)
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
              placeholder="+1 234 567 8900"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: +1 650-555-3434 (use test numbers for dev)
            </p>
          </div>

          {/* reCAPTCHA container - Firebase will render the widget here */}
          <div id="recaptcha-container" className="flex justify-center"></div>

          <button
            onClick={() => void handleSendCode()}
            disabled={!phoneNumber}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Send Verification Code
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Verification Code (from SMS)
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerificationCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => void handleVerifyCode()}
            disabled={verificationCode.length !== 6}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Verify Code
          </button>

          <button
            onClick={() => {
              setConfirmation(null);
              setVerificationCode('');
              setStatus('');
            }}
            className="w-full text-sm text-gray-600 hover:text-gray-800"
          >
            Use a different phone number
          </button>
        </div>
      )}

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
